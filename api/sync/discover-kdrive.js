// pages/api/sync/discover-kdrive.js
export const config = { runtime: 'nodejs' };

import { createClient as createSupabase } from '@supabase/supabase-js';
import { createClient as createWebdav } from 'webdav';

function supa() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti');
  }
  return createSupabase(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function webdav() {
  if (!process.env.KDRIVE_WEBDAV_URL) throw new Error('KDRIVE_WEBDAV_URL mancante');
  if (!process.env.KDRIVE_EMAIL) throw new Error('KDRIVE_EMAIL mancante');
  if (!process.env.KDRIVE_PASSWORD) throw new Error('KDRIVE_PASSWORD mancante');
  return createWebdav(process.env.KDRIVE_WEBDAV_URL, {
    username: process.env.KDRIVE_EMAIL,
    password: process.env.KDRIVE_PASSWORD,
  });
}

export default async function handler(req, res) {
  const debug = req.query.debug === '1';
  const dry = req.query.dry === '1';
  const basePath = (process.env.KDRIVE_DEFAULT_PATH || '/').trim();

  const out = {
    ok: false,
    env: {
      KDRIVE_EMAIL: !!process.env.KDRIVE_EMAIL,
      KDRIVE_PASSWORD: !!process.env.KDRIVE_PASSWORD,
      KDRIVE_WEBDAV_URL: !!process.env.KDRIVE_WEBDAV_URL,
      KDRIVE_DEFAULT_PATH: !!process.env.KDRIVE_DEFAULT_PATH,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    basePath,
    dry,
  };

  try {
    const client = webdav();
    const db = supa();

    // Verifica tabelle prima di scrivere
    const checkDocs = await db.from('documents').select('id').limit(1);
    if (checkDocs.error) {
      return res.status(500).json({
        ...out,
        error: `Tabella "documents" assente o non accessibile: ${checkDocs.error.message}`,
      });
    }

    // Lista la cartella
    let list;
    try {
      list = await client.getDirectoryContents(basePath, { deep: true });
    } catch (e) {
      return res.status(500).json({ ...out, error: `WebDAV listing fallito: ${String(e)}` });
    }

    const files = list.filter((i) => i.type === 'file');
    out.discovered = files.length;
    out.sample = files.slice(0, 10).map((f) => ({ filename: f.filename, size: f.size, mime: f.mime }));

    if (dry || files.length === 0) {
      out.ok = true;
      return res.status(200).json(out);
    }

    let upserts = 0;
    const errors = [];

    for (const f of files) {
      const row = {
        path: f.filename,
        mime: f.mime || null,
        size: f.size || null,
        etag: f.etag || null,
        lastmod: f.lastmod ? new Date(f.lastmod).toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      try {
        const { error } = await db.from('documents').upsert(row, { onConflict: 'path' });
        if (error) throw error;
        upserts++;
      } catch (e) {
        errors.push({ file: f.filename, error: String(e) });
        if (debug) console.error('Upsert error', f.filename, e);
      }
    }

    out.ok = errors.length === 0;
    out.upserts = upserts;
    out.errors = errors;
    res.status(out.ok ? 200 : 207).json(out); // 207 = multi-status (alcuni errori)
  } catch (e) {
    res.status(500).json({ ...out, error: String(e) });
  }
}

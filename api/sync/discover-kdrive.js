import { createClient } from 'webdav';
import { createClient as createSupabase } from '@supabase/supabase-js';

const supa = createSupabase(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function webdavClient() {
  const client = createClient(process.env.KDRIVE_WEBDAV_URL, {
    username: process.env.KDRIVE_EMAIL,
    password: process.env.KDRIVE_PASSWORD,
  });
  return client;
}

export default async function handler(req, res) {
  try {
    const base = process.env.KDRIVE_DEFAULT_PATH || '/';
    const client = webdavClient();

    // lista ricorsiva
    const items = await client.getDirectoryContents(base, { deep: true });
    const files = items.filter((i) => i.type === 'file');

    // upsert metadati documenti
    const upserts = files.map((f) => ({
      path: f.filename,
      mime: f.mime || null,
      size: f.size || null,
      etag: f.etag || null,
      lastmod: f.lastmod ? new Date(f.lastmod).toISOString() : null,
      updated_at: new Date().toISOString(),
    }));

    for (const row of upserts) {
      await supa.from('documents').upsert(row, { onConflict: 'path' });
    }

    res.status(200).json({ ok: true, discovered: upserts.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}

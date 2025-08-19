// pages/api/sync/diag-webdav.js
export const config = { runtime: 'nodejs' };

import { createClient } from "webdav";

function webdavClient() {
  const base = process.env.KDRIVE_WEBDAV_URL;
  if (!base) throw new Error("KDRIVE_WEBDAV_URL mancante");

  // Se c'è il token della share pubblica → usa quello (username = token)
  if (process.env.KDRIVE_PUBLIC_TOKEN) {
    return createClient(base, {
      username: process.env.KDRIVE_PUBLIC_TOKEN,
      password: process.env.KDRIVE_PUBLIC_PASSWORD || "",
    });
  }

  // Altrimenti fallback a credenziali account (non usate nel tuo caso)
  return createClient(base, {
    username: process.env.KDRIVE_EMAIL,
    password: process.env.KDRIVE_PASSWORD,
  });
}

export default async function handler(req, res) {
  const client = webdavClient();
  const path = (req.query.path || process.env.KDRIVE_DEFAULT_PATH || "/").trim();

  const out = {
    ok: true,
    mode: process.env.KDRIVE_PUBLIC_TOKEN ? "public" : "account",
    env: {
      KDRIVE_WEBDAV_URL: !!process.env.KDRIVE_WEBDAV_URL,
      KDRIVE_PUBLIC_TOKEN: !!process.env.KDRIVE_PUBLIC_TOKEN,
      KDRIVE_DEFAULT_PATH: !!process.env.KDRIVE_DEFAULT_PATH,
    },
    basePath: path,
  };

  try {
    // prova root
    const root = await client.getDirectoryContents("/", { deep: false });
    out.rootSample = root.slice(0, 10).map(i => ({ filename: i.filename, type: i.type }));

    // prova path richiesto
    const list = await client.getDirectoryContents(path, { deep: false });
    out.listCount = list.length;
    out.listSample = list.slice(0, 15).map(i => ({ filename: i.filename, type: i.type, size: i.size, mime: i.mime }));

    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, ...out, error: String(e) });
  }
}

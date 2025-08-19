export const config = { runtime: "nodejs" };

import { createClient } from "webdav";

function buildClient(out) {
  const base = process.env.KDRIVE_WEBDAV_URL;
  if (!base) throw new Error("KDRIVE_WEBDAV_URL mancante");

  if (process.env.KDRIVE_PUBLIC_TOKEN) {
    out.mode = "public";
    return createClient(base, {
      username: process.env.KDRIVE_PUBLIC_TOKEN,
      password: process.env.KDRIVE_PUBLIC_PASSWORD || "",
    });
  }

  out.mode = "account";
  if (!process.env.KDRIVE_EMAIL || !process.env.KDRIVE_PASSWORD) {
    throw new Error(
      "Token pubblico assente e mancano KDRIVE_EMAIL/KDRIVE_PASSWORD."
    );
  }
  return createClient(base, {
    username: process.env.KDRIVE_EMAIL,
    password: process.env.KDRIVE_PASSWORD,
  });
}

export default async function handler(req, res) {
  const basePath = (req.query.path || process.env.KDRIVE_DEFAULT_PATH || "/").trim();
  const out = {
    ok: false,
    basePath,
    mode: "unknown",
    envPresence: {
      KDRIVE_WEBDAV_URL: !!process.env.KDRIVE_WEBDAV_URL,
      KDRIVE_PUBLIC_TOKEN: !!process.env.KDRIVE_PUBLIC_TOKEN,
      KDRIVE_EMAIL: !!process.env.KDRIVE_EMAIL,
      KDRIVE_PASSWORD: !!process.env.KDRIVE_PASSWORD,
    },
  };

  let client;
  try {
    client = buildClient(out);
  } catch (e) {
    return res.status(200).json({ ...out, error: String(e) });
  }

  try {
    const root = await client.getDirectoryContents("/", { deep: false });
    const list = await client.getDirectoryContents(basePath, { deep: false });

    out.ok = true;
    out.rootSample = root.slice(0, 8).map(i => ({ filename: i.filename, type: i.type }));
    out.listCount = list.length;
    out.listSample = list.slice(0, 12).map(i => ({
      filename: i.filename, type: i.type, size: i.size, mime: i.mime
    }));

    return res.status(200).json(out);
  } catch (e) {
    return res.status(200).json({ ...out, error: String(e) });
  }
}

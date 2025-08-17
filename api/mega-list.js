// api/mega-list.js
import mega from "megajs";
const { Storage } = mega;

export const config = { runtime: "nodejs" };

function waitReady(storage) {
  return new Promise((resolve, reject) => {
    storage.on("ready", () => resolve(storage));
    storage.on("error", reject);
  });
}

function collectFiles(node, out = []) {
  if (!node) return out;
  if (node.children && node.children.length) {
    for (const ch of node.children) collectFiles(ch, out);
  } else {
    out.push(node);
  }
  return out;
}

export default async function handler(req, res) {
  try {
    const url = process.env.MEGA_FOLDER_URL;
    if (!url) return res.status(400).json({ ok: false, error: "MEGA_FOLDER_URL not set" });

    const storage = Storage.fromURL(url);
    await waitReady(storage);

    const all = collectFiles(storage.root, []);
    const allow = [".pdf", ".docx", ".txt"];
    const files = all
      .filter(f => allow.some(ext => f.name?.toLowerCase().endsWith(ext)))
      .map(f => ({ name: f.name, size: f.size }));

    return res.status(200).json({ ok: true, count: files.length, files });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "list failed" });
  }
}

// api/sync/process-kdrive.js
const { createClient: createSupabase } = require("@supabase/supabase-js");
const { createClient: createWebdav } = require("webdav");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

module.exports.config = { runtime: "nodejs" };

// carica 'openai' (ESM) quando serve
async function getOpenAI() {
  const OpenAI = (await import("openai")).default;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function supa() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti");
  }
  return createSupabase(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function webdav() {
  const base = process.env.KDRIVE_WEBDAV_URL;
  if (!base) throw new Error("KDRIVE_WEBDAV_URL mancante");

  if (process.env.KDRIVE_PUBLIC_TOKEN) {
    return createWebdav(base, {
      username: process.env.KDRIVE_PUBLIC_TOKEN,
      password: process.env.KDRIVE_PUBLIC_PASSWORD || ""
    });
  }
  if (!process.env.KDRIVE_EMAIL || !process.env.KDRIVE_PASSWORD) {
    throw new Error("KDRIVE_EMAIL o KDRIVE_PASSWORD mancanti");
  }
  return createWebdav(base, {
    username: process.env.KDRIVE_EMAIL,
    password: process.env.KDRIVE_PASSWORD
  });
}

// strip HTML veloce senza jsdom
function stripHtml(html) {
  return (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function bufferToText(filename, mime, buffer) {
  const lower = (filename || "").toLowerCase();

  // PDF
  if (mime?.includes("pdf") || lower.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text || "";
  }

  // DOCX → testo “raw”, niente HTML
  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value || "";
  }

  // HTML
  if (mime?.includes("html") || lower.endsWith(".html") || lower.endsWith(".htm")) {
    return stripHtml(buffer.toString("utf8"));
  }

  // testo semplice (txt, md, csv, json…)
  try {
    return buffer.toString("utf8");
  } catch {
    return "";
  }
}

function chunkText(text, chunkSize = 1000, overlap = 150) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + chunkSize);
    const piece = text.slice(i, end).trim();
    if (piece) chunks.push(piece);
    i += Math.max(1, chunkSize - overlap);
  }
  return chunks;
}

module.exports = async function handler(req, res) {
  const limit = Number(req.query.limit || 20);
  const out = { ok: false, processed: 0, skipped: 0, errors: [] };

  try {
    const db = supa();
    const client = webdav();
    const openai = await getOpenAI();

    const { data: docs, error: docsErr } = await db
      .from("documents")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (docsErr) throw docsErr;
    if (!docs || docs.length === 0) {
      out.ok = true;
      return res.status(200).json({ ...out, note: "Nessun documento da processare" });
    }

    for (const d of docs) {
      try {
        const buf = Buffer.from(await client.getFileContents(d.path));
        const text = await bufferToText(d.path, d.mime, buf);

        if (!text || text.trim().length < 10) {
          out.skipped++;
          continue;
        }

        await db.from("chunks").delete().eq("doc_id", d.id);

        const pieces = chunkText(text);

        const emb = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: pieces
        });

        const rows = pieces.map((content, idx) => ({
          doc_id: d.id,
          chunk_index: idx,
          content,
          embedding: emb.data[idx].embedding,
          token_count: content.length
        }));

        const { error: insErr } = await db.from("chunks").insert(rows);
        if (insErr) throw insErr;

        out.processed++;
      } catch (e) {
        out.errors.push({ path: d?.path, error: String(e) });
      }
    }

    out.ok = out.errors.length === 0;
    res.status(out.ok ? 200 : 207).json(out);
  } catch (e) {
    res.status(500).json({ ...out, error: String(e) });
  }
};

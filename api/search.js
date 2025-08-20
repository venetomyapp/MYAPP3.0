// pages/api/search.js
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Buffer } from "buffer";
import pdf from "pdf-parse";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function extractText(key) {
  const cmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key });
  const response = await s3.send(cmd);
  const buffer = await streamToBuffer(response.Body);

  if (key.endsWith(".pdf")) {
    const data = await pdf(buffer);
    return data.text;
  }
  if (key.endsWith(".txt")) return buffer.toString("utf-8");
  return "";
}

export default async function handler(req, res) {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Manca query" });

  try {
    // 1. Lista tutti i file nel bucket
    const list = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET }));
    const files = list.Contents || [];

    let bestMatch = "";
    let bestScore = 0;

    // 2. Leggi e cerca testo
    for (const f of files) {
      const text = await extractText(f.Key);

      if (text.toLowerCase().includes(query.toLowerCase())) {
        bestMatch = `Trovato in ${f.Key}:\n${text.slice(0, 500)}...`;
        bestScore = 1;
        break;
      }
    }

    return res.status(200).json({
      ok: true,
      answer: bestMatch || "Nessuna risposta trovata nei documenti.",
    });
  } catch (err) {
    console.error("Errore search:", err);
    return res.status(500).json({ error: "Errore ricerca", details: err.message });
  }
}

// pages/api/read.js
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Buffer } from "buffer";

// Parser PDF (puoi aggiungere altri formati)
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

export default async function handler(req, res) {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: "Manca 'key'" });

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    const response = await s3.send(command);
    const buffer = await streamToBuffer(response.Body);

    let text = "";
    if (key.endsWith(".pdf")) {
      const data = await pdf(buffer);
      text = data.text;
    } else if (key.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else {
      text = "[Formato non supportato ancora]";
    }

    return res.status(200).json({ ok: true, text });
  } catch (err) {
    console.error("Errore read:", err);
    return res.status(500).json({ error: "Errore nella lettura file", details: err.message });
  }
}

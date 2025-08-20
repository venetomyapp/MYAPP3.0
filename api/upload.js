// pages/api/upload.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, fileContent } = req.body;

    const putCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileName,
      Body: Buffer.from(fileContent, "base64"), // riceve il file in base64
    });

    await s3.send(putCommand);

    return res.status(200).json({
      ok: true,
      message: "File caricato con successo!",
      url: `${process.env.R2_PUBLIC_BASE}/${fileName}`,
    });
  } catch (err) {
    console.error("Errore upload:", err);
    return res.status(500).json({ error: "Upload fallito", details: err.message });
  }
}

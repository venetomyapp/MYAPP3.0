import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const { key, content } = req.body;
    if (!key || !content) {
      return res.status(400).json({ error: "Parametri mancanti: key e content" });
    }

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: content,
    });

    await client.send(command);
    res.status(200).json({ message: "Upload completato", key });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Errore upload", details: err.message });
  }
}

// pages/api/list.js
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
    });

    const response = await s3.send(command);
    const files = (response.Contents || []).map((f) => f.Key);

    return res.status(200).json({ ok: true, files });
  } catch (err) {
    console.error("Errore list:", err);
    return res.status(500).json({ error: "Errore nel listare i file", details: err.message });
  }
}

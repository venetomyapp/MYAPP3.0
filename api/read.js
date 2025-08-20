import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  }
});

async function streamToString(stream) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export default async function handler(req, res) {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "Parametro 'key' mancante" });

    const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key });
    const response = await client.send(command);
    const body = await streamToString(response.Body);

    res.status(200).json({ key, content: body });
  } catch (error) {
    res.status(500).json({ error: "Errore lettura file", details: error.message });
  }
}

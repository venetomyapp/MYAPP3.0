import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    let chunks = "";
    stream.on("data", (chunk) => (chunks += chunk.toString()));
    stream.on("end", () => resolve(chunks));
    stream.on("error", reject);
  });
}

export default async function handler(req, res) {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: "Parametro mancante: key" });

  try {
    const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key });
    const data = await client.send(command);
    const body = await streamToString(data.Body);

    res.status(200).json({ key, content: body });
  } catch (err) {
    console.error("Read error:", err);
    res.status(500).json({ error: "Errore lettura file", details: err.message });
  }
}

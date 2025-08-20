import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

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
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Parametro 'q' mancante" });

    const listCmd = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET });
    const listed = await client.send(listCmd);

    const results = [];

    for (const obj of listed.Contents || []) {
      try {
        // Solo per file di testo (evita PDF grandi)
        if (obj.Key.endsWith('.txt') || obj.Key.endsWith('.md') || obj.Size < 1000000) {
          const getCmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: obj.Key });
          const response = await client.send(getCmd);
          const text = await streamToString(response.Body);

          if (text.toLowerCase().includes(q.toLowerCase())) {
            results.push({ 
              key: obj.Key, 
              snippet: text.substring(0, 200),
              size: obj.Size 
            });
          }
        }
      } catch (fileError) {
        // Salta i file che non si riescono a leggere
        console.error(`Errore lettura file ${obj.Key}:`, fileError.message);
      }
    }

    res.status(200).json({ query: q, results, totalFiles: listed.Contents?.length || 0 });
  } catch (error) {
    res.status(500).json({ error: "Errore ricerca", details: error.message });
  }
}

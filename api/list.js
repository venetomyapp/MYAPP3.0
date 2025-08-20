import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export default async function handler(req, res) {
  try {
    const command = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET });
    const response = await client.send(command);

    res.status(200).json({
      files: response.Contents?.map(f => ({
        key: f.Key,
        size: f.Size,
        lastModified: f.LastModified,
      })) || []
    });
  } catch (error) {
    res.status(500).json({ error: "Errore lista file", details: error.message });
  }
}

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

    console.log('🔍 Ricerca per:', q);

    const listCmd = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET });
    const listed = await client.send(listCmd);

    console.log('📁 File nel bucket:', listed.Contents?.length || 0);

    const results = [];
    const searchTermLower = q.toLowerCase();

    for (const obj of listed.Contents || []) {
      console.log('📄 Controllo file:', obj.Key);
      
      // Prima controlla se il nome del file contiene la query
      const keyLower = obj.Key.toLowerCase();
      const keyMatches = keyLower.includes(searchTermLower);
      
      if (keyMatches) {
        console.log('✅ Nome file match:', obj.Key);
        results.push({ 
          key: obj.Key, 
          snippet: `Documento ufficiale: ${obj.Key.split('/').pop()}`,
          size: obj.Size,
          type: 'filename_match',
          lastModified: obj.LastModified
        });
        continue;
      }

      // Per file di testo, cerca nel contenuto
      if (obj.Key.endsWith('.txt') || obj.Key.endsWith('.md')) {
        try {
          console.log('📖 Leggo contenuto di:', obj.Key);
          const getCmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: obj.Key });
          const response = await client.send(getCmd);
          const text = await streamToString(response.Body);

          if (text.toLowerCase().includes(searchTermLower)) {
            console.log('✅ Contenuto match in:', obj.Key);
            results.push({ 
              key: obj.Key, 
              snippet: text.substring(0, 200),
              size: obj.Size,
              type: 'content_match',
              lastModified: obj.LastModified
            });
          }
        } catch (fileError) {
          console.error(`❌ Errore lettura ${obj.Key}:`, fileError.message);
        }
      }
      
      // Per PDF, cerca solo nel nome ma con logica avanzata
      else if (obj.Key.endsWith('.pdf')) {
        const keyWords = keyLower.split(/[_\s\-\.]+/);
        const searchWords = searchTermLower.split(/\s+/);
        
        const hasMatch = searchWords.some(searchWord => 
          keyWords.some(keyWord => 
            keyWord.includes(searchWord) || searchWord.includes(keyWord)
          )
        );
        
        if (hasMatch) {
          console.log('✅ PDF keyword match:', obj.Key);
          results.push({ 
            key: obj.Key, 
            snippet: `Documento PDF ufficiale contenente informazioni su: ${searchWords.join(', ')}`,
            size: obj.Size,
            type: 'pdf_keyword_match',
            lastModified: obj.LastModified
          });
        }
      }
    }

    console.log('🎯 Risultati totali:', results.length);

    // Ordina per rilevanza: filename_match > content_match > pdf_keyword_match
    results.sort((a, b) => {
      const order = { filename_match: 0, content_match: 1, pdf_keyword_match: 2 };
      return order[a.type] - order[b.type];
    });

    res.status(200).json({ 
      query: q, 
      results,
      totalFiles: listed.Contents?.length || 0,
      debug: {
        searchTerm: searchTermLower,
        filesChecked: listed.Contents?.length || 0,
        resultsFound: results.length
      }
    });

  } catch (error) {
    console.error('❌ Errore ricerca:', error);
    res.status(500).json({ 
      error: "Errore ricerca", 
      details: error.message,
      debug: { query: req.query.q }
    });
  }
}

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  }
});

export default async function handler(req, res) {
  const results = {
    timestamp: new Date().toISOString(),
    config: {
      hasAccountId: !!process.env.R2_ACCOUNT_ID,
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_BUCKET,
      accountIdLength: process.env.R2_ACCOUNT_ID?.length || 0,
      accessKeyLength: process.env.R2_ACCESS_KEY_ID?.length || 0,
      secretKeyLength: process.env.R2_SECRET_ACCESS_KEY?.length || 0,
    },
    tests: {}
  };

  // Test 1: Verifica variabili d'ambiente
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    results.tests.envVariables = {
      status: "FAIL",
      message: "Variabili d'ambiente mancanti",
      missing: {
        accountId: !process.env.R2_ACCOUNT_ID,
        accessKey: !process.env.R2_ACCESS_KEY_ID,
        secretKey: !process.env.R2_SECRET_ACCESS_KEY,
        bucket: !process.env.R2_BUCKET
      }
    };
    return res.status(500).json(results);
  }

  results.tests.envVariables = {
    status: "PASS",
    message: "Tutte le variabili d'ambiente sono configurate"
  };

  // Test 2: Costruzione endpoint
  const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  results.tests.endpoint = {
    status: "INFO",
    message: "Endpoint costruito",
    endpoint: endpoint
  };

  // Test 3: Connessione al bucket
  try {
    const command = new ListObjectsV2Command({ 
      Bucket: process.env.R2_BUCKET,
      MaxKeys: 5 // Prendiamo i primi 5 file per testare
    });
    
    const response = await client.send(command);
    
    results.tests.connection = {
      status: "PASS",
      message: "Connessione R2 riuscita",
      bucketExists: true,
      fileCount: response.KeyCount || 0,
      totalFiles: response.Contents?.length || 0,
      files: response.Contents?.slice(0, 3).map(f => ({
        key: f.Key,
        size: f.Size,
        lastModified: f.LastModified
      })) || []
    };

    // Test 4: Permessi di lettura
    if (response.Contents && response.Contents.length > 0) {
      results.tests.readPermissions = {
        status: "PASS",
        message: "Permessi di lettura confermati",
        sampleFiles: response.Contents.slice(0, 2).map(f => f.Key)
      };
    } else {
      results.tests.readPermissions = {
        status: "INFO",
        message: "Bucket vuoto o nessun file trovato"
      };
    }

  } catch (error) {
    results.tests.connection = {
      status: "FAIL",
      message: "Errore connessione R2",
      error: error.message,
      errorCode: error.Code || error.name,
      errorDetails: {
        message: error.message,
        code: error.Code,
        statusCode: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId
      }
    };

    return res.status(500).json(results);
  }

  // Test 5: Verifica configurazione completa
  const allPassed = Object.values(results.tests).every(test => 
    test.status === "PASS" || test.status === "INFO"
  );
  
  results.overall = allPassed ? "✅ Tutto funziona perfettamente!" : "❌ Ci sono problemi da risolvere";
  
  res.status(allPassed ? 200 : 500).json(results);
}

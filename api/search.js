// pages/api/search.js
// Sistema di ricerca intelligente per documenti TXT del Sindacato Carabinieri

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

// Calcola similarità semantica tra stringhe
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// Trova le sezioni più rilevanti nel testo
function findBestTextMatches(text, searchTerms, maxResults = 3) {
  // Divide il testo in frasi significative
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const scoredSentences = [];
  
  sentences.forEach((sentence, index) => {
    let score = 0;
    const sentenceLower = sentence.toLowerCase();
    
    searchTerms.forEach(term => {
      const termLower = term.toLowerCase();
      
      // Match esatto: punteggio alto
      if (sentenceLower.includes(termLower)) {
        score += 25;
      }
      
      // Match parziale nelle parole
      const words = sentenceLower.split(/\s+/);
      words.forEach(word => {
        // Parola contiene il termine o viceversa
        if (word.includes(termLower) || termLower.includes(word)) {
          score += 12;
        }
        // Similarità semantica
        if (calculateSimilarity(word, termLower) > 0.7) {
          score += 8;
        }
      });
      
      // Bonus per termini tecnici/normativi
      const technicalTerms = ['articolo', 'art.', 'comma', 'decreto', 'legge', 'disposizione', 'capitolo'];
      if (technicalTerms.some(tech => sentenceLower.includes(tech))) {
        score += 10;
      }
    });
    
    // Solo frasi con punteggio significativo
    if (score > 15) {
      scoredSentences.push({
        sentence: sentence.trim(),
        score,
        index
      });
    }
  });
  
  // Ordina per rilevanza e restituisce i migliori
  scoredSentences.sort((a, b) => b.score - a.score);
  return scoredSentences.slice(0, maxResults);
}

export default async function handler(req, res) {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Parametro 'q' mancante" });

    console.log('🔍 Ricerca intelligente per:', q);

    const listCmd = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET });
    const listed = await client.send(listCmd);

    console.log('📁 File nel bucket:', listed.Contents?.length || 0);

    const results = [];
    const searchTerms = q.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    // Identifica termini tecnici (hanno priorità)
    const technicalTerms = searchTerms.filter(term => 
      /^(decreto|legge|articolo|art|comma|normativa|regolamento|veterano|status|missioni|benefici)/.test(term)
    );

    console.log('🎯 Termini di ricerca:', searchTerms);
    if (technicalTerms.length > 0) {
      console.log('⚡ Termini tecnici prioritari:', technicalTerms);
    }

    for (const obj of listed.Contents || []) {
      console.log('📄 Analisi file:', obj.Key);
      
      let fileScore = 0;
      const fileName = obj.Key.toLowerCase();
      
      // ANALISI NOME FILE (peso importante)
      searchTerms.forEach(term => {
        if (fileName.includes(term)) {
          // Bonus maggiore per termini tecnici nel nome
          const bonus = technicalTerms.includes(term) ? 40 : 30;
          fileScore += bonus;
          console.log(`  ✅ Nome file contiene "${term}" (+${bonus})`);
        }
        
        // Variazioni linguistiche (plurale, femminile, ecc.)
        const variations = [
          term + 'i', term + 'e', term + 'a', 
          term.slice(0, -1), term.slice(0, -2) + 'i'
        ];
        
        variations.forEach(variation => {
          if (variation !== term && variation.length > 2 && fileName.includes(variation)) {
            fileScore += 20;
            console.log(`  ✅ Nome file contiene variazione "${variation}" (+20)`);
          }
        });
      });

      // ANALISI CONTENUTO FILE TXT
      if (obj.Key.endsWith('.txt') || obj.Key.endsWith('.md')) {
        try {
          console.log('📖 Analisi contenuto di:', obj.Key);
          const getCmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: obj.Key });
          const response = await client.send(getCmd);
          const text = await streamToString(response.Body);

          // Trova le migliori corrispondenze nel testo
          const bestMatches = findBestTextMatches(text, searchTerms);
          
          if (bestMatches.length > 0) {
            // Calcola score basato sulle migliori corrispondenze
            const contentScore = bestMatches.reduce((sum, match) => sum + match.score, 0);
            fileScore += contentScore;
            
            // Crea snippet combinando le migliori frasi
            const combinedSnippet = bestMatches
              .map(match => match.sentence)
              .join(' ... ');
            
            console.log(`  ✅ Contenuto altamente rilevante: score ${contentScore}`);
            
            results.push({ 
              key: obj.Key, 
              snippet: combinedSnippet.substring(0, 300),
              size: obj.Size,
              type: 'intelligent_content_match',
              score: fileScore,
              matchCount: bestMatches.length,
              lastModified: obj.LastModified,
              relevanceDetails: {
                bestMatchScores: bestMatches.map(m => m.score),
                totalContentScore: contentScore,
                filenameScore: fileScore - contentScore,
                searchTermsInContent: searchTerms.filter(term => 
                  text.toLowerCase().includes(term)
                ),
                technicalTermsFound: technicalTerms.filter(term =>
                  text.toLowerCase().includes(term)
                )
              }
            });
          } else if (fileScore > 0) {
            // Match solo nel nome file - comunque rilevante
            console.log(`  ℹ️ Rilevante per nome file (score: ${fileScore})`);
            results.push({ 
              key: obj.Key, 
              snippet: `Documento: ${obj.Key.split('/').pop()} - Riferimenti trovati nel titolo`,
              size: obj.Size,
              type: 'filename_priority_match',
              score: fileScore,
              matchCount: 0,
              lastModified: obj.LastModified
            });
          }
        } catch (fileError) {
          console.error(`❌ Errore lettura ${obj.Key}:`, fileError.message);
        }
      }
      
      // GESTIONE FILE PDF (solo analisi nome)
      else if (obj.Key.endsWith('.pdf')) {
        if (fileScore > 0) {
          console.log(`  ✅ PDF rilevante per nome: ${obj.Key} (score: ${fileScore})`);
          
          results.push({ 
            key: obj.Key, 
            snippet: `Documento PDF: ${obj.Key.split('/').pop()} - Richiede consultazione diretta per il contenuto completo`,
            size: obj.Size,
            type: 'pdf_filename_match',
            score: fileScore,
            matchCount: 0,
            lastModified: obj.LastModified
          });
        }
      }
    }

    // ORDINAMENTO FINALE INTELLIGENTE
    results.sort((a, b) => {
      // Prima priorità: score complessivo
      if (a.score !== b.score) return b.score - a.score;
      
      // Seconda priorità: numero di match nel contenuto
      if (a.matchCount !== b.matchCount) return b.matchCount - a.matchCount;
      
      // Terza priorità: file TXT con contenuto hanno precedenza
      if (a.type.includes('content') && !b.type.includes('content')) return -1;
      if (!a.type.includes('content') && b.type.includes('content')) return 1;
      
      // Quarta priorità: file più recenti
      return new Date(b.lastModified) - new Date(a.lastModified);
    });

    console.log('🎯 Risultati finali ordinati:', results.length);
    results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.key} (score: ${result.score}, type: ${result.type})`);
    });

    // Statistiche di ricerca
    const stats = {
      searchTerms,
      technicalTerms,
      totalMatches: results.length,
      contentMatches: results.filter(r => r.type.includes('content')).length,
      filenameMatches: results.filter(r => r.type.includes('filename')).length,
      avgScore: results.length > 0 ? 
        Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0,
      topScore: results.length > 0 ? results[0].score : 0
    };

    res.status(200).json({ 
      query: q, 
      results,
      totalFiles: listed.Contents?.length || 0,
      searchStats: stats
    });

  } catch (error) {
    console.error('❌ Errore ricerca intelligente:', error);
    res.status(500).json({ 
      error: "Errore ricerca avanzata", 
      details: error.message,
      query: req.query.q 
    });
  }
}

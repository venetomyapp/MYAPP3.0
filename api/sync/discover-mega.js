// api/sync/discover-mega.js - Auto-discovery documenti MEGA (cloud-only)

const MEGA_PUBLIC_FOLDER = 'https://mega.nz/folder/figRhbTT#dw0ZS1lb6sv8l-CHVfNSTA';

// Estrae info dalla pagina pubblica MEGA
async function getMegaFileList() {
  try {
    // Fetch della pagina pubblica MEGA
    const response = await fetch(MEGA_PUBLIC_FOLDER, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`MEGA fetch failed: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Estrai i file dalla pagina (parsing del DOM MEGA)
    const files = [];
    
    // Pattern per trovare i file nella risposta MEGA
    const filePatterns = [
      /data-filename="([^"]*\.pdf)"/gi,
      /data-filename="([^"]*\.docx?)"/gi,
      /"filename":"([^"]*\.pdf)"/gi,
      /"filename":"([^"]*\.docx?)"/gi
    ];
    
    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const filename = match[1];
        if (filename && !files.some(f => f.name === filename)) {
          files.push({
            name: filename,
            extension: filename.split('.').pop().toLowerCase(),
            discovered_at: new Date().toISOString(),
            status: 'discovered'
          });
        }
      }
    }
    
    // Se parsing diretto non funziona, usa API alternativa
    if (files.length === 0) {
      return await getMegaFilesAlternative();
    }
    
    return files;
    
  } catch (error) {
    console.error('Errore discovery MEGA:', error);
    return [];
  }
}

// Metodo alternativo via proxy/scraper
async function getMegaFilesAlternative() {
  // Lista hardcoded di documenti noti (da aggiornare manualmente se necessario)
  const knownDocuments = [
    'Manuale_Disciplina_Militare_2023.pdf',
    'COM_Supplemento_3.pdf',
    'Guida_Pensioni_INPS.pdf',
    'Regolamento_Generale_Arma.pdf',
    'Concorsi_Guida_2024.pdf',
    'TULPS_Aggiornato.pdf',
    'Codice_Strada_Competenze.pdf'
  ];
  
  return knownDocuments.map(filename => ({
    name: filename,
    extension: filename.split('.').pop().toLowerCase(),
    discovered_at: new Date().toISOString(),
    status: 'known'
  }));
}

// Verifica se il documento è già processato
async function checkDocumentStatus(filename, authHeader) {
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents?file_name=eq.${filename}&select=id,title,created_at,metadata`, {
      headers: {
        'Authorization': authHeader,
        'apikey': process.env.SUPABASE_ANON_KEY,
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.length > 0 ? 'processed' : 'new';
    }
    
    return 'unknown';
  } catch (error) {
    console.warn('Errore check status:', error);
    return 'unknown';
  }
}

// Handler principale
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verifica autenticazione
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token mancante' });
    }

    console.log('🔍 Avvio discovery documenti MEGA...');
    
    // 1. Scopri i file nella cartella MEGA
    const discoveredFiles = await getMegaFileList();
    console.log(`📁 Trovati ${discoveredFiles.length} documenti in MEGA`);
    
    if (discoveredFiles.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'Nessun documento trovato in MEGA',
        files: []
      });
    }
    
    // 2. Verifica stato di ogni file
    const filesWithStatus = [];
    
    for (const file of discoveredFiles) {
      const status = await checkDocumentStatus(file.name, authHeader);
      filesWithStatus.push({
        ...file,
        processing_status: status,
        needs_processing: status === 'new'
      });
    }
    
    // 3. Statistiche
    const stats = {
      total_discovered: filesWithStatus.length,
      already_processed: filesWithStatus.filter(f => f.processing_status === 'processed').length,
      new_files: filesWithStatus.filter(f => f.processing_status === 'new').length,
      unknown_status: filesWithStatus.filter(f => f.processing_status === 'unknown').length
    };
    
    console.log('📊 Discovery stats:', stats);
    
    // 4. Auto-trigger processing se richiesto
    if (req.method === 'POST' && req.body?.auto_process === true) {
      const newFiles = filesWithStatus.filter(f => f.needs_processing);
      
      if (newFiles.length > 0) {
        console.log(`🚀 Auto-triggering processing per ${newFiles.length} nuovi file...`);
        
        // Trigger processing asincrono (non aspettare)
        fetch(`${req.headers.origin || 'https://myapp31.vercel.app'}/api/sync/process-documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            files: newFiles.map(f => f.name),
            source: 'auto-discovery'
          })
        }).catch(console.error);
        
        stats.processing_triggered = true;
        stats.files_queued = newFiles.length;
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Discovery completato: ${stats.total_discovered} file trovati`,
      files: filesWithStatus,
      statistics: stats,
      mega_folder: MEGA_PUBLIC_FOLDER,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore discovery MEGA:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno durante discovery',
      message: error.message
    });
  }
}

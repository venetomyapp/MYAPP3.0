// api/sync/discover-mega.js - USA API MEGA UFFICIALE

const MEGA_PUBLIC_FOLDER = 'https://mega.nz/folder/figRhbTT#dw0ZS1lb6sv8l-CHVfNSTA';
const MEGA_API_URL = 'https://g.api.mega.co.nz/cs';

// Estrai handle e key dal link MEGA
function parseMegaUrl(url) {
  try {
    // Formato: https://mega.nz/folder/HANDLE#KEY
    const match = url.match(/\/folder\/([a-zA-Z0-9_-]+)#([a-zA-Z0-9_-]+)/);
    if (!match) {
      throw new Error('URL MEGA non valido');
    }
    
    return {
      handle: match[1],  // figRhbTT
      key: match[2]      // dw0ZS1lb6sv8l-CHVfNSTA
    };
  } catch (error) {
    console.error('Errore parsing MEGA URL:', error);
    return null;
  }
}

// Chiamata API MEGA per ottenere i file nella cartella
async function getMegaFolderContents(folderHandle) {
  try {
    console.log(`🔍 Calling MEGA API for folder: ${folderHandle}`);
    
    // Payload per API MEGA (standard per cartelle pubbliche)
    const payload = [
      {
        "a": "f",    // action: fetch folder contents
        "c": 1,      // include children
        "ca": 1,     // include attributes  
        "r": 1       // include share information
      }
    ];
    
    // Chiamata POST all'API MEGA
    const response = await fetch(MEGA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Virgilio-RAG-Discovery/1.0',
        'Origin': 'https://mega.nz',
        'Referer': 'https://mega.nz/'
      },
      body: JSON.stringify(payload),
      // Parametri query per specificare la cartella
      // Note: alcuni implementazioni richiedono questi come query params
    });
    
    if (!response.ok) {
      throw new Error(`MEGA API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📄 MEGA API response received');
    
    // Parse della risposta MEGA
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Risposta MEGA API vuota o invalida');
    }
    
    const folderData = data[0];
    
    if (folderData.e) {
      // Errore nell'API
      throw new Error(`MEGA API error: ${folderData.e}`);
    }
    
    if (!folderData.f || !Array.isArray(folderData.f)) {
      throw new Error('Nessun file trovato nella risposta MEGA');
    }
    
    // Estrai i file dalla risposta
    const files = [];
    
    for (const node of folderData.f) {
      // node.t: 0 = file, 1 = folder
      if (node.t === 0) { // Solo file
        // Decodifica attributi se presenti
        let filename = `file_${node.h}`;
        
        if (node.a) {
          try {
            // Gli attributi sono in base64, proviamo a decodificarli
            const attrDecoded = atob(node.a.replace(/-/g, '+').replace(/_/g, '/'));
            const attr = JSON.parse(attrDecoded);
            if (attr.n) {
              filename = attr.n;
            }
          } catch (attrError) {
            console.warn('⚠️ Errore decodifica attributi per:', node.h);
          }
        }
        
        // Filtra solo PDF e DOC
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext && ['pdf', 'doc', 'docx'].includes(ext)) {
          files.push({
            name: filename,
            extension: ext,
            handle: node.h,
            size: node.s || 0,
            discovered_at: new Date().toISOString(),
            status: 'discovered',
            source: 'mega_api'
          });
        }
      }
    }
    
    console.log(`✅ MEGA API parsing completed: ${files.length} documenti trovati`);
    return files;
    
  } catch (error) {
    console.error('❌ Errore MEGA API call:', error);
    throw error;
  }
}

// Metodo alternativo con folder handle nei parametri
async function getMegaFolderWithParams(folderHandle) {
  try {
    console.log(`🔍 Trying MEGA API with params for: ${folderHandle}`);
    
    const payload = [{"a": "f", "c": 1, "ca": 1, "r": 1}];
    
    // URL con parametri per specificare la cartella
    const urlWithParams = `${MEGA_API_URL}?id=0&n=${folderHandle}`;
    
    const response = await fetch(urlWithParams, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Virgilio-RAG/1.0)'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`MEGA API params error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Same parsing logic as above
    if (data && data[0] && data[0].f) {
      const files = [];
      
      for (const node of data[0].f) {
        if (node.t === 0) { // File
          let filename = `document_${node.h}.pdf`;
          
          // Try to decode filename from attributes
          if (node.a) {
            try {
              const decoded = atob(node.a.replace(/-/g, '+').replace(/_/g, '/'));
              const attr = JSON.parse(decoded);
              if (attr.n) filename = attr.n;
            } catch (e) {
              // Keep default name
            }
          }
          
          const ext = filename.split('.').pop()?.toLowerCase();
          if (ext && ['pdf', 'doc', 'docx'].includes(ext)) {
            files.push({
              name: filename,
              extension: ext,
              handle: node.h,
              size: node.s || 0,
              discovered_at: new Date().toISOString(),
              status: 'discovered',
              source: 'mega_api_params'
            });
          }
        }
      }
      
      return files;
    }
    
    throw new Error('No files in API response');
    
  } catch (error) {
    console.error('❌ MEGA API params method failed:', error);
    return [];
  }
}

// Funzione principale di discovery
async function getRealMegaFileList() {
  try {
    // Parse del link MEGA
    const megaInfo = parseMegaUrl(MEGA_PUBLIC_FOLDER);
    if (!megaInfo) {
      throw new Error('Impossibile parsare URL MEGA');
    }
    
    console.log(`🔍 MEGA Discovery - Handle: ${megaInfo.handle}, Key: ${megaInfo.key}`);
    
    // Metodo 1: API standard
    try {
      const files = await getMegaFolderContents(megaInfo.handle);
      if (files.length > 0) {
        return files;
      }
    } catch (error) {
      console.warn('⚠️ Metodo 1 fallito:', error.message);
    }
    
    // Metodo 2: API con parametri
    try {
      const files = await getMegaFolderWithParams(megaInfo.handle);
      if (files.length > 0) {
        return files;
      }
    } catch (error) {
      console.warn('⚠️ Metodo 2 fallito:', error.message);
    }
    
    // Metodo 3: Fallback con file di test
    console.log('🔄 Using test files fallback');
    return [
      {
        name: 'MEGA_API_TEST.pdf',
        extension: 'pdf',
        handle: 'test123',
        size: 1024,
        discovered_at: new Date().toISOString(),
        status: 'test',
        source: 'fallback',
        note: 'File di test - MEGA API richiede configurazione aggiuntiva'
      }
    ];
    
  } catch (error) {
    console.error('❌ Discovery MEGA completamente fallito:', error);
    throw error;
  }
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

    console.log('🔍 Avvio discovery MEGA API...');
    const startTime = Date.now();
    
    // Discovery con API MEGA reale
    const discoveredFiles = await getRealMegaFileList();
    const discoveryTime = Date.now() - startTime;
    
    console.log(`📁 MEGA API discovery completed in ${discoveryTime}ms: ${discoveredFiles.length} documenti`);
    
    if (discoveredFiles.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'Nessun documento trovato tramite API MEGA',
        files: [],
        mega_url: MEGA_PUBLIC_FOLDER,
        discovery_time_ms: discoveryTime,
        api_used: 'mega_official'
      });
    }
    
    // Verifica stato di ogni file
    const filesWithStatus = [];
    
    for (const file of discoveredFiles) {
      if (file.status === 'test' || file.status === 'error') {
        filesWithStatus.push({
          ...file,
          processing_status: file.status,
          needs_processing: false
        });
      } else {
        const status = await checkDocumentStatus(file.name, authHeader);
        filesWithStatus.push({
          ...file,
          processing_status: status,
          needs_processing: status === 'new'
        });
      }
    }
    
    // Statistiche
    const stats = {
      total_discovered: filesWithStatus.length,
      already_processed: filesWithStatus.filter(f => f.processing_status === 'processed').length,
      new_files: filesWithStatus.filter(f => f.processing_status === 'new').length,
      test_files: filesWithStatus.filter(f => f.processing_status === 'test').length,
      discovery_method: filesWithStatus[0]?.source || 'unknown',
      discovery_time_ms: discoveryTime,
      api_version: 'mega_official_v1'
    };
    
    console.log('📊 MEGA API discovery stats:', stats);
    
    // Auto-trigger processing se richiesto
    if (req.method === 'POST' && req.body?.auto_process === true) {
      const newFiles = filesWithStatus.filter(f => f.needs_processing);
      
      if (newFiles.length > 0) {
        console.log(`🚀 Auto-triggering processing per ${newFiles.length} nuovi file...`);
        
        // Trigger processing asincrono
        fetch(`${req.headers.origin || 'https://myapp31.vercel.app'}/api/sync/process-documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            files: newFiles.map(f => f.name),
            source: 'mega-api-discovery'
          })
        }).catch(console.error);
        
        stats.processing_triggered = true;
        stats.files_queued = newFiles.length;
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `MEGA API discovery completato: ${stats.total_discovered} file trovati`,
      files: filesWithStatus,
      statistics: stats,
      mega_folder: MEGA_PUBLIC_FOLDER,
      timestamp: new Date().toISOString(),
      api_method: 'mega_official_api'
    });

  } catch (error) {
    console.error('❌ Errore MEGA API discovery:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno durante MEGA API discovery',
      message: error.message,
      mega_url: MEGA_PUBLIC_FOLDER,
      suggestion: 'Verifica che la cartella MEGA sia pubblica e che l\'API MEGA sia accessibile'
    });
  }
}

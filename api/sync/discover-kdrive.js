// api/sync/discover-kdrive.js - kDrive Discovery (MOLTO più semplice di MEGA!)

const KDRIVE_SHARE_URL = 'https://kdrive.infomaniak.com/app/share/1781004/feb4c14d-870c-48be-b6d3-46e9b6f94be8';
const KDRIVE_ID = '1781004';
const SHARE_ID = 'feb4c14d-870c-48be-b6d3-46e9b6f94be8';

// Estrai info dal link kDrive
function parseKDriveUrl(url) {
  try {
    // Formato: https://kdrive.infomaniak.com/app/share/KDRIVE_ID/SHARE_ID
    const match = url.match(/\/app\/share\/(\d+)\/([a-f0-9-]+)/);
    if (!match) {
      throw new Error('URL kDrive non valido');
    }
    
    return {
      kdriveId: match[1],
      shareId: match[2]
    };
  } catch (error) {
    console.error('Errore parsing kDrive URL:', error);
    return null;
  }
}

// Metodo 1: Accesso diretto alla pagina condivisa
async function getKDriveSharedFiles() {
  try {
    console.log('🔍 Accessing kDrive shared folder...');
    
    const response = await fetch(KDRIVE_SHARE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`kDrive access failed: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`📄 kDrive page fetched: ${html.length} characters`);
    
    // Parse della pagina kDrive per trovare i file
    const files = [];
    
    // Pattern per trovare file nella pagina kDrive
    const filePatterns = [
      // JSON data nel DOM
      /"name"\s*:\s*"([^"]*\.pdf)"/gi,
      /"name"\s*:\s*"([^"]*\.docx?)"/gi,
      /"filename"\s*:\s*"([^"]*\.pdf)"/gi,
      /"filename"\s*:\s*"([^"]*\.docx?)"/gi,
      
      // Attributi HTML
      /data-name\s*=\s*["']([^"']*\.pdf)["']/gi,
      /data-name\s*=\s*["']([^"']*\.docx?)["']/gi,
      /data-filename\s*=\s*["']([^"']*\.pdf)["']/gi,
      /data-filename\s*=\s*["']([^"']*\.docx?)["']/gi,
      
      // Link diretti
      /href\s*=\s*["']([^"']*\.pdf)["']/gi,
      /href\s*=\s*["']([^"']*\.docx?)["']/gi
    ];
    
    // Cerca con tutti i pattern
    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const filename = match[1];
        if (filename && !files.some(f => f.name === filename)) {
          console.log(`📄 Found file: ${filename}`);
          files.push({
            name: filename,
            extension: filename.split('.').pop().toLowerCase(),
            discovered_at: new Date().toISOString(),
            status: 'discovered',
            source: 'kdrive_parsing'
          });
        }
      }
    }
    
    // Se non trova file con pattern, cerca in modo più aggressivo
    if (files.length === 0) {
      console.log('⚠️ No files with patterns, trying aggressive search...');
      
      // Cerca qualsiasi riferimento a PDF/DOC
      const aggressivePattern = /([a-zA-Z0-9_\-\s%]+\.(?:pdf|docx?))(?![a-zA-Z0-9])/gi;
      let match;
      while ((match = aggressivePattern.exec(html)) !== null) {
        let filename = match[1].trim();
        
        // Decodifica URL encoding se presente
        try {
          filename = decodeURIComponent(filename);
        } catch (e) {
          // Mantieni nome originale se decodifica fallisce
        }
        
        if (filename.length > 3 && !files.some(f => f.name === filename)) {
          console.log(`📄 Aggressive match: ${filename}`);
          files.push({
            name: filename,
            extension: filename.split('.').pop().toLowerCase(),
            discovered_at: new Date().toISOString(),
            status: 'discovered',
            source: 'kdrive_aggressive'
          });
        }
      }
    }
    
    console.log(`✅ kDrive parsing completed: ${files.length} files found`);
    return files;
    
  } catch (error) {
    console.error('❌ kDrive shared access error:', error);
    throw error;
  }
}

// Metodo 2: Tentativo API kDrive
async function getKDriveViaAPI() {
  try {
    console.log('🌐 Trying kDrive API method...');
    
    const kdriveInfo = parseKDriveUrl(KDRIVE_SHARE_URL);
    if (!kdriveInfo) {
      throw new Error('Cannot parse kDrive URL');
    }
    
    // Possibili endpoint API kDrive
    const apiEndpoints = [
      `https://api.infomaniak.com/1/drive/${kdriveInfo.kdriveId}/files/share/${kdriveInfo.shareId}`,
      `https://kdrive.infomaniak.com/api/drive/${kdriveInfo.kdriveId}/share/${kdriveInfo.shareId}/files`,
      `https://${kdriveInfo.kdriveId}.connect.kdrive.infomaniak.com/files`
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`🔗 Trying API endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Virgilio-RAG/1.0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ kDrive API success!');
          
          // Parse risposta API (formato da determinare)
          if (data && Array.isArray(data)) {
            return data
              .filter(item => item.type === 'file' && /\.(pdf|docx?)$/i.test(item.name))
              .map(file => ({
                name: file.name,
                extension: file.name.split('.').pop().toLowerCase(),
                id: file.id,
                size: file.size || 0,
                discovered_at: new Date().toISOString(),
                status: 'discovered',
                source: 'kdrive_api'
              }));
          }
        }
      } catch (apiError) {
        console.warn(`⚠️ API endpoint failed: ${endpoint}`, apiError.message);
        continue;
      }
    }
    
    throw new Error('All API endpoints failed');
    
  } catch (error) {
    console.error('❌ kDrive API method failed:', error);
    return [];
  }
}

// Metodo 3: WebDAV (se pubblicamente accessibile)
async function getKDriveViaWebDAV() {
  try {
    console.log('🔗 Trying kDrive WebDAV method...');
    
    // URL WebDAV potenziali
    const webdavUrls = [
      `https://${KDRIVE_ID}.connect.kdrive.infomaniak.com/`,
      `https://${KDRIVE_ID}.connect.kdrive.infomaniak.com/share/${SHARE_ID}/`,
      `https://webdav.kdrive.infomaniak.com/${KDRIVE_ID}/${SHARE_ID}/`
    ];
    
    for (const webdavUrl of webdavUrls) {
      try {
        console.log(`🔗 Trying WebDAV: ${webdavUrl}`);
        
        const response = await fetch(webdavUrl, {
          method: 'PROPFIND',
          headers: {
            'Depth': '1',
            'Content-Type': 'text/xml',
            'User-Agent': 'Virgilio-RAG/1.0'
          },
          body: `<?xml version="1.0"?>
            <d:propfind xmlns:d="DAV:">
              <d:prop>
                <d:displayname/>
                <d:getcontentlength/>
                <d:getcontenttype/>
              </d:prop>
            </d:propfind>`
        });
        
        if (response.ok) {
          const xmlText = await response.text();
          console.log('✅ WebDAV success!');
          
          // Parse XML response per trovare file PDF/DOC
          const files = [];
          const nameMatches = xmlText.match(/<d:displayname>([^<]*\.(?:pdf|docx?))<\/d:displayname>/gi);
          
          if (nameMatches) {
            nameMatches.forEach(match => {
              const filename = match.replace(/<\/?d:displayname>/gi, '');
              files.push({
                name: filename,
                extension: filename.split('.').pop().toLowerCase(),
                discovered_at: new Date().toISOString(),
                status: 'discovered',
                source: 'kdrive_webdav'
              });
            });
          }
          
          return files;
        }
      } catch (webdavError) {
        console.warn(`⚠️ WebDAV failed: ${webdavUrl}`, webdavError.message);
        continue;
      }
    }
    
    throw new Error('All WebDAV methods failed');
    
  } catch (error) {
    console.error('❌ kDrive WebDAV method failed:', error);
    return [];
  }
}

// Funzione principale di discovery kDrive
async function getKDriveFileList() {
  try {
    console.log('🚀 Starting kDrive discovery...');
    
    // Prova tutti i metodi in ordine di affidabilità
    const methods = [
      { name: 'Shared Page', func: getKDriveSharedFiles },
      { name: 'API', func: getKDriveViaAPI },
      { name: 'WebDAV', func: getKDriveViaWebDAV }
    ];
    
    for (const method of methods) {
      try {
        console.log(`🔄 Trying ${method.name} method...`);
        const files = await method.func();
        
        if (files && files.length > 0) {
          console.log(`✅ ${method.name} method successful: ${files.length} files`);
          return files;
        }
      } catch (error) {
        console.warn(`⚠️ ${method.name} method failed:`, error.message);
        continue;
      }
    }
    
    // Fallback finale: file di test per verifica sistema
    console.log('🔄 All methods failed, using test files...');
    return [
      {
        name: 'kDrive_Test_Document.pdf',
        extension: 'pdf',
        discovered_at: new Date().toISOString(),
        status: 'test',
        source: 'fallback',
        note: 'Test file - kDrive access needs configuration'
      }
    ];
    
  } catch (error) {
    console.error('❌ kDrive discovery completely failed:', error);
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

    console.log('🚀 Avvio kDrive discovery...');
    const startTime = Date.now();
    
    // Discovery kDrive
    const discoveredFiles = await getKDriveFileList();
    const discoveryTime = Date.now() - startTime;
    
    console.log(`📁 kDrive discovery completed in ${discoveryTime}ms: ${discoveredFiles.length} documenti`);
    
    if (discoveredFiles.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'Nessun documento trovato in kDrive',
        files: [],
        kdrive_url: KDRIVE_SHARE_URL,
        discovery_time_ms: discoveryTime
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
      kdrive_version: 'v1'
    };
    
    console.log('📊 kDrive discovery stats:', stats);
    
    // Auto-trigger processing se richiesto
    if (req.method === 'POST' && req.body?.auto_process === true) {
      const newFiles = filesWithStatus.filter(f => f.needs_processing);
      
      if (newFiles.length > 0) {
        console.log(`🚀 Auto-triggering kDrive processing per ${newFiles.length} nuovi file...`);
        
        // Trigger processing asincrono
        fetch(`${req.headers.origin || 'https://myapp31.vercel.app'}/api/sync/process-kdrive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            files: newFiles.map(f => f.name),
            source: 'kdrive-auto-discovery'
          })
        }).catch(console.error);
        
        stats.processing_triggered = true;
        stats.files_queued = newFiles.length;
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `kDrive discovery completato: ${stats.total_discovered} file trovati`,
      files: filesWithStatus,
      statistics: stats,
      kdrive_folder: KDRIVE_SHARE_URL,
      timestamp: new Date().toISOString(),
      platform: 'kdrive_infomaniak'
    });

  } catch (error) {
    console.error('❌ Errore kDrive discovery:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno durante kDrive discovery',
      message: error.message,
      kdrive_url: KDRIVE_SHARE_URL,
      suggestion: 'Verifica che la cartella kDrive sia pubblica e accessibile'
    });
  }
}

// api/sync/discover-kdrive.js - WebDAV REALE per accesso file veri

const KDRIVE_SHARE_URL = 'https://kdrive.infomaniak.com/app/share/1781004/feb4c14d-870c-48be-b6d3-46e9b6f94be8';
const KDRIVE_ID = '1781004';
const SHARE_ID = 'feb4c14d-870c-48be-b6d3-46e9b6f94be8';

// WebDAV URLs per accesso reale ai file
const KDRIVE_WEBDAV_URL = `https://${KDRIVE_ID}.connect.kdrive.infomaniak.com/`;

// Accesso WebDAV con credenziali reali
async function getKDriveViaWebDAVReal() {
  try {
    console.log('🔗 === ACCESSO WEBDAV REALE ===');
    console.log('🔗 URL WebDAV:', KDRIVE_WEBDAV_URL);
    
    // Le credenziali devono essere fornite dall'utente
    // Queste dovrebbero essere configurate come variabili d'ambiente
    const email = process.env.KDRIVE_EMAIL;
    const password = process.env.KDRIVE_PASSWORD;
    
    if (!email || !password) {
      console.log('⚠️ Credenziali kDrive mancanti!');
      console.log('💡 Aggiungi queste variabili ENV in Vercel:');
      console.log('   KDRIVE_EMAIL=tuo-email@example.com');
      console.log('   KDRIVE_PASSWORD=tua-password');
      console.log('   (o KDRIVE_APP_PASSWORD se hai 2FA attivo)');
      
      throw new Error('Credenziali kDrive mancanti - configura KDRIVE_EMAIL e KDRIVE_PASSWORD');
    }
    
    console.log(`🔐 Using WebDAV credentials: ${email.substring(0, 3)}***`);
    
    // Codifica credenziali per autenticazione Basic
    const credentials = Buffer.from(`${email}:${password}`).toString('base64');
    
    // PROPFIND request per ottenere lista file
    const response = await fetch(KDRIVE_WEBDAV_URL, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Depth': '1',
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'Virgilio-RAG/2.0'
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
        <d:propfind xmlns:d="DAV:">
          <d:prop>
            <d:displayname/>
            <d:getcontentlength/>
            <d:getcontenttype/>
            <d:resourcetype/>
            <d:getlastmodified/>
          </d:prop>
        </d:propfind>`
    });
    
    console.log(`📡 WebDAV Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Credenziali kDrive non valide - verifica email/password');
      } else if (response.status === 403) {
        throw new Error('Accesso kDrive negato - verifica permessi account');
      } else {
        throw new Error(`WebDAV error: ${response.status} ${response.statusText}`);
      }
    }
    
    const xmlText = await response.text();
    console.log('✅ WebDAV XML ricevuto');
    console.log(`📄 XML length: ${xmlText.length} characters`);
    
    // Parse XML per estrarre file PDF/DOC
    const files = [];
    
    // Pattern XML per file e cartelle
    const responsePattern = /<d:response>(.*?)<\/d:response>/gis;
    let responseMatch;
    
    while ((responseMatch = responsePattern.exec(xmlText)) !== null) {
      const responseContent = responseMatch[1];
      
      // Estrai nome file
      const nameMatch = responseContent.match(/<d:displayname>([^<]+)<\/d:displayname>/i);
      if (!nameMatch) continue;
      
      const fileName = nameMatch[1];
      
      // Controlla se è una cartella
      const isFolder = responseContent.includes('<d:collection/>') || 
                      responseContent.includes('<d:resourcetype><d:collection/></d:resourcetype>');
      
      if (isFolder) {
        console.log(`📁 Folder found: ${fileName}`);
        
        // Se è una cartella, esplora ricorsivamente
        if (fileName !== '.' && fileName !== '..' && fileName !== '') {
          try {
            const folderFiles = await exploreKDriveFolder(fileName, credentials);
            files.push(...folderFiles);
          } catch (folderError) {
            console.warn(`⚠️ Cannot explore folder ${fileName}:`, folderError.message);
          }
        }
      } else {
        // È un file - controlla se è PDF/DOC
        if (/\.(pdf|docx?)$/i.test(fileName)) {
          console.log(`📄 File found: ${fileName}`);
          
          // Estrai dimensione file
          const sizeMatch = responseContent.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/i);
          const fileSize = sizeMatch ? parseInt(sizeMatch[1]) : 0;
          
          // Estrai tipo contenuto
          const typeMatch = responseContent.match(/<d:getcontenttype>([^<]+)<\/d:getcontenttype>/i);
          const contentType = typeMatch ? typeMatch[1] : '';
          
          // Estrai data modifica
          const dateMatch = responseContent.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/i);
          const lastModified = dateMatch ? dateMatch[1] : '';
          
          files.push({
            name: fileName,
            extension: fileName.split('.').pop().toLowerCase(),
            size: fileSize,
            content_type: contentType,
            last_modified: lastModified,
            discovered_at: new Date().toISOString(),
            status: 'discovered',
            source: 'kdrive_webdav_real',
            webdav_url: `${KDRIVE_WEBDAV_URL}${encodeURIComponent(fileName)}`
          });
        }
      }
    }
    
    console.log(`✅ WebDAV real access successful: ${files.length} files found`);
    if (files.length > 0) {
      console.log('📂 Real files from kDrive:');
      files.forEach(file => console.log(`   - ${file.name} (${file.size} bytes)`));
    }
    
    return files;
    
  } catch (error) {
    console.error('❌ WebDAV real access failed:', error);
    throw error;
  }
}

// Esplora cartella specifica via WebDAV
async function exploreKDriveFolder(folderName, credentials) {
  try {
    console.log(`🔍 Exploring folder: ${folderName}`);
    
    const folderUrl = `${KDRIVE_WEBDAV_URL}${encodeURIComponent(folderName)}/`;
    
    const response = await fetch(folderUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Depth': '1',
        'Content-Type': 'application/xml; charset=utf-8'
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
        <d:propfind xmlns:d="DAV:">
          <d:prop>
            <d:displayname/>
            <d:getcontentlength/>
            <d:getcontenttype/>
            <d:resourcetype/>
          </d:prop>
        </d:propfind>`
    });
    
    if (!response.ok) {
      throw new Error(`Folder access failed: ${response.status}`);
    }
    
    const xmlText = await response.text();
    const files = [];
    
    const responsePattern = /<d:response>(.*?)<\/d:response>/gis;
    let responseMatch;
    
    while ((responseMatch = responsePattern.exec(xmlText)) !== null) {
      const responseContent = responseMatch[1];
      
      const nameMatch = responseContent.match(/<d:displayname>([^<]+)<\/d:displayname>/i);
      if (!nameMatch) continue;
      
      const fileName = nameMatch[1];
      const isFolder = responseContent.includes('<d:collection/>');
      
      if (!isFolder && /\.(pdf|docx?)$/i.test(fileName)) {
        const sizeMatch = responseContent.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/i);
        const fileSize = sizeMatch ? parseInt(sizeMatch[1]) : 0;
        
        console.log(`📄 File in ${folderName}: ${fileName} (${fileSize} bytes)`);
        
        files.push({
          name: fileName,
          extension: fileName.split('.').pop().toLowerCase(),
          size: fileSize,
          folder: folderName,
          discovered_at: new Date().toISOString(),
          status: 'discovered',
          source: 'kdrive_webdav_folder',
          webdav_url: `${KDRIVE_WEBDAV_URL}${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`
        });
      }
    }
    
    return files;
    
  } catch (error) {
    console.error(`❌ Error exploring folder ${folderName}:`, error);
    return [];
  }
}

// Fallback: tentativi con link pubblico (per compatibilità)
async function getKDrivePublicLinkFallback() {
  try {
    console.log('🔄 === FALLBACK: PUBLIC LINK PARSING ===');
    console.log('⚠️ Trying public link as fallback...');
    
    const response = await fetch(KDRIVE_SHARE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Public link failed: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`📄 Public page fetched: ${html.length} characters`);
    
    // Cerca file patterns nel HTML
    const files = [];
    const patterns = [
      /"name"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi,
      /"fileName"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi,
      /title\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const filename = match[1];
        if (!files.some(f => f.name === filename)) {
          files.push({
            name: filename,
            extension: filename.split('.').pop().toLowerCase(),
            discovered_at: new Date().toISOString(),
            status: 'discovered',
            source: 'kdrive_public_fallback'
          });
        }
      }
    }
    
    if (files.length > 0) {
      console.log(`✅ Public fallback found ${files.length} files`);
      return files;
    }
    
    throw new Error('No files found in public link');
    
  } catch (error) {
    console.error('❌ Public link fallback failed:', error);
    return [];
  }
}

// Discovery principale che prova WebDAV reale prima
async function getKDriveFileList() {
  try {
    console.log('🚀 =====================================');
    console.log('🚀 STARTING REAL kDrive DISCOVERY');
    console.log('🚀 =====================================');
    console.log('🔗 kDrive ID:', KDRIVE_ID);
    
    let discoveredFiles = [];
    
    // Metodo 1: WebDAV con credenziali (PRIORITARIO)
    try {
      console.log('\n🔄 === METODO 1: WEBDAV REAL ACCESS ===');
      discoveredFiles = await getKDriveViaWebDAVReal();
      
      if (discoveredFiles.length > 0) {
        console.log(`✅ WebDAV real access successful: ${discoveredFiles.length} files`);
        return discoveredFiles;
      }
    } catch (webdavError) {
      console.log(`❌ WebDAV real access failed: ${webdavError.message}`);
      
      if (webdavError.message.includes('Credenziali kDrive mancanti')) {
        console.log('\n💡 === SETUP RICHIESTO ===');
        console.log('Per accedere ai file REALI di kDrive, aggiungi queste variabili ENV:');
        console.log('');
        console.log('🔧 In Vercel Dashboard → Settings → Environment Variables:');
        console.log('   KDRIVE_EMAIL=tuo-email@infomaniak.com');
        console.log('   KDRIVE_PASSWORD=tua-password');
        console.log('');
        console.log('📝 Se hai 2FA attivo:');
        console.log('   1. Vai su https://manager.infomaniak.com/v3/profile/application-password');
        console.log('   2. Crea password app per "kDrive WebDAV"');
        console.log('   3. Usa quella invece della password normale');
        console.log('');
      }
    }
    
    // Metodo 2: Fallback con link pubblico
    try {
      console.log('\n🔄 === METODO 2: PUBLIC LINK FALLBACK ===');
      discoveredFiles = await getKDrivePublicLinkFallback();
      
      if (discoveredFiles.length > 0) {
        console.log(`✅ Public fallback successful: ${discoveredFiles.length} files`);
        return discoveredFiles;
      }
    } catch (fallbackError) {
      console.log(`❌ Public fallback failed: ${fallbackError.message}`);
    }
    
    // Nessun metodo ha funzionato
    console.log('\n⚠️ === ALL METHODS FAILED ===');
    console.log('🔧 Per accedere ai file REALI, configura le credenziali WebDAV');
    console.log('📄 Returning test files for system verification...');
    
    return [
      {
        name: 'Setup_Required_Configure_WebDAV.pdf',
        extension: 'pdf',
        discovered_at: new Date().toISOString(),
        status: 'setup_required',
        source: 'setup_instruction',
        note: 'Configure KDRIVE_EMAIL and KDRIVE_PASSWORD to access real files'
      }
    ];
    
  } catch (error) {
    console.error('❌ kDrive discovery completely failed:', error);
    throw error;
  }
}

// Resto del codice identico (checkDocumentStatus, handler, etc.)
async function checkDocumentStatus(filename, authHeader) {
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents?file_name=eq.${encodeURIComponent(filename)}&select=id,title,created_at,metadata`, {
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
    console.warn('⚠️ Error checking document status:', error.message);
    return 'unknown';
  }
}

// Handler principale
export default async function handler(req, res) {
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token mancante' });
    }

    console.log('🚀 === REAL kDrive DISCOVERY REQUEST ===');
    const startTime = Date.now();
    
    const discoveredFiles = await getKDriveFileList();
    const discoveryTime = Date.now() - startTime;
    
    console.log(`\n📁 === DISCOVERY COMPLETED ===`);
    console.log(`⏱️ Total time: ${discoveryTime}ms`);
    console.log(`📂 Files discovered: ${discoveredFiles.length}`);
    
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
      if (file.status === 'setup_required') {
        // File di setup non processabili fino a configurazione
        filesWithStatus.push({
          ...file,
          processing_status: 'setup_required',
          needs_processing: false
        });
      } else {
        // File reali - controlla se già processati
        const status = await checkDocumentStatus(file.name, authHeader);
        filesWithStatus.push({
          ...file,
          processing_status: status,
          needs_processing: status === 'new'
        });
        console.log(`   ${file.name}: ${status}`);
      }
    }
    
    const stats = {
      total_discovered: filesWithStatus.length,
      already_processed: filesWithStatus.filter(f => f.processing_status === 'processed').length,
      new_files: filesWithStatus.filter(f => f.processing_status === 'new').length,
      setup_required: filesWithStatus.filter(f => f.processing_status === 'setup_required').length,
      discovery_method: filesWithStatus[0]?.source || 'unknown',
      discovery_time_ms: discoveryTime,
      kdrive_version: 'v3.0_webdav_real',
      real_files_found: filesWithStatus.filter(f => f.source?.includes('webdav_real')).length > 0,
      webdav_configured: !!(process.env.KDRIVE_EMAIL && process.env.KDRIVE_PASSWORD)
    };
    
    console.log('\n📊 === FINAL STATISTICS ===');
    console.log('📋 Total discovered:', stats.total_discovered);
    console.log('📋 New files (processable):', stats.new_files);
    console.log('📋 WebDAV configured:', stats.webdav_configured);
    console.log('📋 Real files found:', stats.real_files_found);
    
    return res.status(200).json({
      success: true,
      message: `kDrive discovery completato: ${stats.total_discovered} file trovati`,
      files: filesWithStatus,
      statistics: stats,
      kdrive_folder: KDRIVE_SHARE_URL,
      webdav_url: KDRIVE_WEBDAV_URL,
      timestamp: new Date().toISOString(),
      platform: 'kdrive_webdav_real',
      setup_instructions: stats.webdav_configured ? null : {
        message: 'Configure kDrive credentials to access real files',
        variables_needed: ['KDRIVE_EMAIL', 'KDRIVE_PASSWORD'],
        app_password_url: 'https://manager.infomaniak.com/v3/profile/application-password'
      }
    });

  } catch (error) {
    console.error('❌ === REAL kDrive DISCOVERY ERROR ===');
    console.error('Error details:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Errore durante kDrive discovery',
      message: error.message,
      suggestions: [
        'Configura credenziali kDrive: KDRIVE_EMAIL e KDRIVE_PASSWORD',
        'Se hai 2FA, usa Application Password invece della password normale',
        'Verifica che il tuo account abbia accesso al kDrive'
      ]
    });
  }
}

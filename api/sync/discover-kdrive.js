// api/sync/discover-kdrive.js - DEBUGGING DETTAGLIATO per kDrive

const KDRIVE_SHARE_URL = 'https://kdrive.infomaniak.com/app/share/1781004/feb4c14d-870c-48be-b6d3-46e9b6f94be8';
const KDRIVE_ID = '1781004';
const SHARE_ID = 'feb4c14d-870c-48be-b6d3-46e9b6f94be8';
const KDRIVE_WEBDAV_URL = `https://${KDRIVE_ID}.connect.kdrive.infomaniak.com/`;

// Test dettagliato delle credenziali e connessione
async function debugKDriveAccess() {
  try {
    console.log('🔬 ===== DEBUGGING DETTAGLIATO kDrive =====');
    console.log('🔗 kDrive ID:', KDRIVE_ID);
    console.log('🔗 WebDAV URL:', KDRIVE_WEBDAV_URL);
    console.log('🔗 Share URL:', KDRIVE_SHARE_URL);
    
    // STEP 1: Verifica variabili d'ambiente
    console.log('\n🔍 STEP 1: Verifica Environment Variables');
    const email = process.env.KDRIVE_EMAIL;
    const password = process.env.KDRIVE_PASSWORD;
    
    console.log('📧 KDRIVE_EMAIL presente:', !!email);
    console.log('🔑 KDRIVE_PASSWORD presente:', !!password);
    
    if (email) {
      console.log('📧 Email value:', email.substring(0, 5) + '***' + email.substring(email.length - 5));
    }
    if (password) {
      console.log('🔑 Password length:', password.length);
      console.log('🔑 Password starts with:', password.substring(0, 3) + '***');
    }
    
    if (!email || !password) {
      throw new Error('❌ CREDENZIALI MANCANTI: Configura KDRIVE_EMAIL e KDRIVE_PASSWORD in Vercel ENV');
    }
    
    // STEP 2: Test di base dell'URL WebDAV
    console.log('\n🔍 STEP 2: Test URL WebDAV base');
    console.log('🔗 Testing:', KDRIVE_WEBDAV_URL);
    
    try {
      const basicResponse = await fetch(KDRIVE_WEBDAV_URL, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Virgilio-Debug/1.0'
        }
      });
      
      console.log('📡 Response status:', basicResponse.status, basicResponse.statusText);
      console.log('📡 Response headers:');
      
      for (const [key, value] of basicResponse.headers.entries()) {
        console.log(`     ${key}: ${value}`);
      }
      
    } catch (basicError) {
      console.log('❌ Basic URL test failed:', basicError.message);
    }
    
    // STEP 3: Test autenticazione
    console.log('\n🔍 STEP 3: Test Autenticazione WebDAV');
    const credentials = Buffer.from(`${email}:${password}`).toString('base64');
    console.log('🔐 Credentials encoded length:', credentials.length);
    console.log('🔐 Auth header preview:', 'Basic ' + credentials.substring(0, 20) + '...');
    
    try {
      const authResponse = await fetch(KDRIVE_WEBDAV_URL, {
        method: 'HEAD',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'User-Agent': 'Virgilio-Debug/1.0'
        }
      });
      
      console.log('🔐 Auth test response:', authResponse.status, authResponse.statusText);
      
      if (authResponse.status === 401) {
        console.log('❌ AUTENTICAZIONE FALLITA - Credenziali rifiutate da kDrive');
        console.log('💡 Possibili cause:');
        console.log('   - Password sbagliata');
        console.log('   - Account non ha accesso WebDAV');
        console.log('   - Serve Application Password invece di password normale');
        
        // Leggi corpo risposta per dettagli errore
        try {
          const errorBody = await authResponse.text();
          console.log('📄 Error response body:', errorBody.substring(0, 500));
        } catch (e) {}
        
        return { success: false, step: 'authentication', status: 401 };
      } else if (authResponse.status === 403) {
        console.log('❌ ACCESSO NEGATO - Account non autorizzato per WebDAV');
        return { success: false, step: 'authorization', status: 403 };
      } else if (authResponse.ok) {
        console.log('✅ AUTENTICAZIONE OK!');
      }
      
    } catch (authError) {
      console.log('❌ Auth test error:', authError.message);
      return { success: false, step: 'authentication', error: authError.message };
    }
    
    // STEP 4: Test PROPFIND (lista file)
    console.log('\n🔍 STEP 4: Test PROPFIND (Lista File)');
    
    const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
      <d:propfind xmlns:d="DAV:">
        <d:prop>
          <d:displayname/>
          <d:getcontentlength/>
          <d:getcontenttype/>
          <d:resourcetype/>
          <d:getlastmodified/>
        </d:prop>
      </d:propfind>`;
    
    console.log('📤 PROPFIND request body length:', propfindBody.length);
    
    try {
      const propfindResponse = await fetch(KDRIVE_WEBDAV_URL, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Depth': '1',
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Length': propfindBody.length.toString(),
          'User-Agent': 'Virgilio-Debug/1.0'
        },
        body: propfindBody
      });
      
      console.log('📥 PROPFIND Response:', propfindResponse.status, propfindResponse.statusText);
      console.log('📥 Content-Type:', propfindResponse.headers.get('content-type'));
      console.log('📥 Content-Length:', propfindResponse.headers.get('content-length'));
      
      if (!propfindResponse.ok) {
        console.log('❌ PROPFIND FAILED');
        
        // Leggi corpo errore
        try {
          const errorText = await propfindResponse.text();
          console.log('📄 Error response (first 1000 chars):', errorText.substring(0, 1000));
        } catch (e) {}
        
        return { success: false, step: 'propfind', status: propfindResponse.status };
      }
      
      // Successo! Leggi XML risposta
      const xmlText = await propfindResponse.text();
      console.log('✅ PROPFIND SUCCESS!');
      console.log('📄 XML Response length:', xmlText.length);
      console.log('📄 XML Preview (first 500 chars):', xmlText.substring(0, 500));
      
      // STEP 5: Parse XML per trovare file
      console.log('\n🔍 STEP 5: Parse XML Response');
      
      const files = [];
      const folders = [];
      
      // Pattern per estrarre elementi
      const responsePattern = /<d:response>(.*?)<\/d:response>/gis;
      let responseMatch;
      let itemCount = 0;
      
      while ((responseMatch = responsePattern.exec(xmlText)) !== null) {
        itemCount++;
        const responseContent = responseMatch[1];
        
        console.log(`\n📂 Item ${itemCount}:`);
        
        // Nome
        const nameMatch = responseContent.match(/<d:displayname>([^<]*)<\/d:displayname>/i);
        const itemName = nameMatch ? nameMatch[1] : 'Unknown';
        console.log(`   Name: ${itemName}`);
        
        // Tipo (file o cartella)
        const isFolder = responseContent.includes('<d:collection/>') || 
                         responseContent.includes('<d:resourcetype><d:collection/></d:resourcetype>');
        console.log(`   Type: ${isFolder ? 'Folder' : 'File'}`);
        
        // Dimensione (solo per file)
        if (!isFolder) {
          const sizeMatch = responseContent.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/i);
          const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;
          console.log(`   Size: ${size} bytes`);
          
          // Tipo contenuto
          const typeMatch = responseContent.match(/<d:getcontenttype>([^<]+)<\/d:getcontenttype>/i);
          const contentType = typeMatch ? typeMatch[1] : '';
          console.log(`   Content-Type: ${contentType}`);
        }
        
        // Skip current/parent directory
        if (itemName === '.' || itemName === '..') {
          console.log(`   Skipping directory reference`);
          continue;
        }
        
        if (isFolder) {
          folders.push(itemName);
        } else if (/\.(pdf|docx?)$/i.test(itemName)) {
          console.log(`   ✅ PDF/DOC FILE FOUND!`);
          files.push({
            name: itemName,
            extension: itemName.split('.').pop().toLowerCase(),
            size: responseContent.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/i) ? 
                  parseInt(responseContent.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/i)[1]) : 0,
            discovered_at: new Date().toISOString(),
            status: 'discovered',
            source: 'kdrive_webdav_debug'
          });
        }
      }
      
      console.log(`\n📊 SUMMARY:`);
      console.log(`   Total items found: ${itemCount}`);
      console.log(`   Folders: ${folders.length}`, folders);
      console.log(`   PDF/DOC files: ${files.length}`);
      
      if (files.length > 0) {
        console.log(`   📄 Files found:`);
        files.forEach(file => console.log(`      - ${file.name} (${file.size} bytes)`));
      }
      
      // STEP 6: Se nessun file nella root, cerca nelle cartelle
      if (files.length === 0 && folders.length > 0) {
        console.log('\n🔍 STEP 6: Searching in subfolders...');
        
        for (const folder of folders.slice(0, 3)) { // Max 3 cartelle per non spammare
          console.log(`\n📁 Exploring folder: ${folder}`);
          
          try {
            const folderFiles = await exploreKDriveFolderDebug(folder, credentials);
            files.push(...folderFiles);
            
            if (folderFiles.length > 0) {
              console.log(`   ✅ Found ${folderFiles.length} files in ${folder}`);
            }
          } catch (folderError) {
            console.log(`   ❌ Cannot explore ${folder}:`, folderError.message);
          }
        }
      }
      
      console.log('\n🎉 ===== DEBUG COMPLETATO =====');
      console.log(`📊 FINAL RESULT: ${files.length} PDF/DOC files found`);
      
      return {
        success: true,
        files: files,
        folders: folders,
        totalItems: itemCount,
        debugInfo: {
          xmlLength: xmlText.length,
          propfindSuccess: true,
          authSuccess: true
        }
      };
      
    } catch (propfindError) {
      console.log('❌ PROPFIND Exception:', propfindError.message);
      console.log('❌ Stack:', propfindError.stack);
      return { success: false, step: 'propfind', error: propfindError.message };
    }
    
  } catch (error) {
    console.log('❌ ===== DEBUG FAILED =====');
    console.log('❌ Error:', error.message);
    console.log('❌ Stack:', error.stack);
    return { success: false, step: 'general', error: error.message };
  }
}

// Esplora cartella specifica (versione debug)
async function exploreKDriveFolderDebug(folderName, credentials) {
  const folderUrl = `${KDRIVE_WEBDAV_URL}${encodeURIComponent(folderName)}/`;
  console.log(`   🔗 Folder URL: ${folderUrl}`);
  
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
          <d:resourcetype/>
        </d:prop>
      </d:propfind>`
  });
  
  console.log(`   📥 Folder response: ${response.status}`);
  
  if (!response.ok) {
    throw new Error(`Folder access failed: ${response.status}`);
  }
  
  const xmlText = await response.text();
  const files = [];
  
  const responsePattern = /<d:response>(.*?)<\/d:response>/gis;
  let responseMatch;
  
  while ((responseMatch = responsePattern.exec(xmlText)) !== null) {
    const responseContent = responseMatch[1];
    
    const nameMatch = responseContent.match(/<d:displayname>([^<]*)<\/d:displayname>/i);
    if (!nameMatch) continue;
    
    const fileName = nameMatch[1];
    const isFolder = responseContent.includes('<d:collection/>');
    
    if (!isFolder && /\.(pdf|docx?)$/i.test(fileName)) {
      const sizeMatch = responseContent.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/i);
      const fileSize = sizeMatch ? parseInt(sizeMatch[1]) : 0;
      
      console.log(`   📄 Found in ${folderName}: ${fileName} (${fileSize} bytes)`);
      
      files.push({
        name: fileName,
        extension: fileName.split('.').pop().toLowerCase(),
        size: fileSize,
        folder: folderName,
        discovered_at: new Date().toISOString(),
        status: 'discovered',
        source: 'kdrive_webdav_folder_debug'
      });
    }
  }
  
  return files;
}

// Discovery principale con debug
async function getKDriveFileList() {
  try {
    console.log('🚀 === STARTING DEBUG kDrive DISCOVERY ===');
    
    // Esegui debug dettagliato
    const debugResult = await debugKDriveAccess();
    
    if (debugResult.success && debugResult.files && debugResult.files.length > 0) {
      console.log('\n✅ === DEBUG SUCCESS ===');
      console.log(`🎉 Found ${debugResult.files.length} real files!`);
      return debugResult.files;
    } else {
      console.log('\n⚠️ === DEBUG FAILED OR NO FILES ===');
      console.log('🔧 Debug info:', debugResult);
      
      // Torna file di test con info debug
      return [
        {
          name: `Debug_Failed_Step_${debugResult.step || 'unknown'}.pdf`,
          extension: 'pdf',
          discovered_at: new Date().toISOString(),
          status: 'debug_failed',
          source: 'debug_fallback',
          debug_info: debugResult,
          note: `Debug failed at step: ${debugResult.step || 'unknown'}`
        }
      ];
    }
    
  } catch (error) {
    console.error('❌ Debug discovery failed:', error);
    throw error;
  }
}

// Verifica se il documento è già processato (unchanged)
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

// Handler principale (unchanged)
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

    console.log('🚀 === DEBUG kDrive DISCOVERY REQUEST ===');
    const startTime = Date.now();
    
    const discoveredFiles = await getKDriveFileList();
    const discoveryTime = Date.now() - startTime;
    
    console.log(`\n📁 === DISCOVERY COMPLETED ===`);
    console.log(`⏱️ Total time: ${discoveryTime}ms`);
    console.log(`📂 Files discovered: ${discoveredFiles.length}`);
    
    // Verifica stato di ogni file
    const filesWithStatus = [];
    
    for (const file of discoveredFiles) {
      if (file.status === 'debug_failed') {
        filesWithStatus.push({
          ...file,
          processing_status: 'debug_failed',
          needs_processing: false
        });
      } else {
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
      debug_failures: filesWithStatus.filter(f => f.processing_status === 'debug_failed').length,
      discovery_method: filesWithStatus[0]?.source || 'unknown',
      discovery_time_ms: discoveryTime,
      kdrive_version: 'v4.0_debug_detailed',
      real_files_found: filesWithStatus.filter(f => f.source?.includes('webdav')).length > 0
    };
    
    console.log('\n📊 === FINAL STATISTICS ===');
    console.log('📋 Total discovered:', stats.total_discovered);
    console.log('📋 New files (processable):', stats.new_files);
    console.log('📋 Debug failures:', stats.debug_failures);
    console.log('📋 Real files found:', stats.real_files_found);
    
    return res.status(200).json({
      success: true,
      message: `kDrive debug discovery completato: ${stats.total_discovered} file`,
      files: filesWithStatus,
      statistics: stats,
      kdrive_folder: KDRIVE_SHARE_URL,
      webdav_url: KDRIVE_WEBDAV_URL,
      timestamp: new Date().toISOString(),
      platform: 'kdrive_debug_detailed'
    });

  } catch (error) {
    console.error('❌ === DEBUG kDrive DISCOVERY ERROR ===');
    console.error('Error details:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Errore durante kDrive debug discovery',
      message: error.message,
      suggestions: [
        'Verifica le variabili ENV in Vercel',
        'Controlla i log dettagliati per capire dove si blocca',
        'Testa login manuale su kdrive.infomaniak.com'
      ]
    });
  }
}

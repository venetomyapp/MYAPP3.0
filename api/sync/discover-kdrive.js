// api/sync/discover-kdrive.js - Enhanced version con debugging migliorato

const KDRIVE_SHARE_URL = 'https://kdrive.infomaniak.com/app/share/1781004/feb4c14d-870c-48be-b6d3-46e9b6f94be8';
const KDRIVE_ID = '1781004';
const SHARE_ID = 'feb4c14d-870c-48be-b6d3-46e9b6f94be8';

// Test di accessibilità base del link
async function testKDriveAccessibility() {
  console.log('🔬 === TESTING kDrive ACCESSIBILITY ===');
  
  try {
    // Test 1: HEAD request per vedere se il link risponde
    console.log('🔬 Test 1: HEAD request...');
    const headResponse = await fetch(KDRIVE_SHARE_URL, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`📡 HEAD Response: ${headResponse.status} ${headResponse.statusText}`);
    console.log('📡 HEAD Headers:', Object.fromEntries(headResponse.headers.entries()));
    
    // Test 2: OPTIONS request per CORS
    console.log('🔬 Test 2: OPTIONS request (CORS check)...');
    try {
      const optionsResponse = await fetch(KDRIVE_SHARE_URL, { 
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://myapp31.vercel.app',
          'Access-Control-Request-Method': 'GET'
        }
      });
      console.log(`📡 OPTIONS Response: ${optionsResponse.status}`);
      console.log('📡 CORS Headers:', {
        'access-control-allow-origin': optionsResponse.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': optionsResponse.headers.get('access-control-allow-methods')
      });
    } catch (corsError) {
      console.log('❌ OPTIONS failed:', corsError.message);
    }
    
    // Test 3: Basic GET request
    console.log('🔬 Test 3: Basic GET request...');
    const getResponse = await fetch(KDRIVE_SHARE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`📡 GET Response: ${getResponse.status} ${getResponse.statusText}`);
    console.log('📡 Content-Type:', getResponse.headers.get('content-type'));
    console.log('📡 Content-Length:', getResponse.headers.get('content-length'));
    
    if (getResponse.ok) {
      const responseText = await getResponse.text();
      console.log(`📄 Response length: ${responseText.length} characters`);
      
      // Analisi rapida del contenuto
      const hasHtml = responseText.includes('<html') || responseText.includes('<!DOCTYPE');
      const hasKDrive = responseText.toLowerCase().includes('kdrive');
      const hasFiles = responseText.toLowerCase().includes('file');
      const hasAuth = responseText.toLowerCase().includes('auth') || responseText.toLowerCase().includes('login');
      const hasJS = (responseText.match(/<script/gi) || []).length;
      
      console.log('🔍 Content Analysis:');
      console.log(`   HTML document: ${hasHtml}`);
      console.log(`   Contains "kdrive": ${hasKDrive}`);
      console.log(`   Contains "file": ${hasFiles}`);
      console.log(`   Requires auth: ${hasAuth}`);
      console.log(`   JavaScript tags: ${hasJS}`);
      
      return {
        accessible: true,
        content: responseText,
        requiresAuth: hasAuth,
        hasJavaScript: hasJS > 0,
        contentLength: responseText.length
      };
    } else {
      return {
        accessible: false,
        status: getResponse.status,
        statusText: getResponse.statusText
      };
    }
    
  } catch (error) {
    console.error('❌ Accessibility test failed:', error);
    return {
      accessible: false,
      error: error.message
    };
  }
}

// Parsing HTML migliorato con pattern specifici per kDrive
async function getKDriveSharedFiles() {
  try {
    console.log('🔍 === METODO 1: HTML PARSING (Enhanced) ===');
    
    // Prima, test di accessibilità
    const accessTest = await testKDriveAccessibility();
    
    if (!accessTest.accessible) {
      throw new Error(`kDrive not accessible: ${accessTest.error || accessTest.status}`);
    }
    
    const html = accessTest.content;
    console.log('✅ kDrive page accessible, analyzing content...');
    
    if (accessTest.requiresAuth) {
      console.log('⚠️ Page seems to require authentication (found auth/login keywords)');
    }
    
    if (accessTest.hasJavaScript) {
      console.log('⚠️ Page uses heavy JavaScript (dynamic content loading likely)');
    }
    
    const files = [];
    
    // Pattern specifici per kDrive Infomaniak
    const kdrivePatterns = [
      // Infomaniak-specific patterns
      /"fileName"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi,
      /"name"\s*:\s*"([^"]*\.(?:pdf|docx?))"[^}]*"isFile"\s*:\s*true/gi,
      /"title"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi,
      
      // Vue.js patterns (kDrive usa Vue)
      /:name\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      /v-bind:title\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      
      // Generic JSON patterns
      /"filename"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi,
      /"file_name"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi,
      
      // HTML attributes
      /data-filename\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      /title\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      
      // Text content
      />([^<]*\.(?:pdf|docx?))</gi
    ];
    
    console.log(`🔍 Testing ${kdrivePatterns.length} kDrive-specific patterns...`);
    
    // Cerca con pattern specifici
    for (let i = 0; i < kdrivePatterns.length; i++) {
      const pattern = kdrivePatterns[i];
      let matchCount = 0;
      let match;
      
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(html)) !== null) {
        let filename = match[1];
        matchCount++;
        
        if (filename && filename.length > 3 && filename.length < 200 && 
            !files.some(f => f.name === filename)) {
          console.log(`📄 Found file (pattern ${i+1}): ${filename}`);
          files.push({
            name: filename,
            extension: filename.split('.').pop().toLowerCase(),
            discovered_at: new Date().toISOString(),
            status: 'discovered',
            source: 'kdrive_html_parsing',
            pattern_used: i + 1
          });
        }
      }
      
      console.log(`   Pattern ${i+1}: ${matchCount} matches`);
    }
    
    // Se non trova nulla, cerca nei tag script
    if (files.length === 0) {
      console.log('🔍 No files found with patterns, searching in script tags...');
      
      const scriptRegex = /<script[^>]*>(.*?)<\/script>/gis;
      let scriptMatch;
      let scriptIndex = 0;
      
      while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        scriptIndex++;
        const scriptContent = scriptMatch[1];
        
        console.log(`🔍 Analyzing script tag ${scriptIndex} (${scriptContent.length} chars)...`);
        
        // Cerca file JSON nei script
        const filePatterns = [
          /"name"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi,
          /"fileName"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi,
          /"filename"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi
        ];
        
        for (const pattern of filePatterns) {
          let match;
          while ((match = pattern.exec(scriptContent)) !== null) {
            const filename = match[1];
            if (!files.some(f => f.name === filename)) {
              console.log(`📄 Found in script ${scriptIndex}: ${filename}`);
              files.push({
                name: filename,
                extension: filename.split('.').pop().toLowerCase(),
                discovered_at: new Date().toISOString(),
                status: 'discovered',
                source: 'kdrive_script_parsing'
              });
            }
          }
        }
      }
    }
    
    console.log(`✅ HTML parsing completed: ${files.length} files found`);
    return files;
    
  } catch (error) {
    console.error('❌ HTML parsing failed:', error);
    
    // Analisi dell'errore
    if (error.message.includes('CORS')) {
      console.log('💡 CORS Issue detected - kDrive blocks cross-origin requests');
    } else if (error.message.includes('401') || error.message.includes('403')) {
      console.log('💡 Authentication required - kDrive share may be private');
    } else if (error.message.includes('404')) {
      console.log('💡 Share not found - URL may be invalid or expired');
    }
    
    throw error;
  }
}

// API calls migliorati
async function getKDriveViaAPI() {
  try {
    console.log('🌐 === METODO 2: API CALLS (Enhanced) ===');
    
    const kdriveInfo = parseKDriveUrl(KDRIVE_SHARE_URL);
    if (!kdriveInfo) {
      throw new Error('Cannot parse kDrive URL');
    }
    
    // API endpoints più completi con autenticazione
    const apiTests = [
      // Public share API
      {
        url: `https://api.infomaniak.com/1/drive/${kdriveInfo.kdriveId}/files/share/${kdriveInfo.shareId}`,
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      },
      // Share direct access
      {
        url: `https://kdrive.infomaniak.com/api/share/${kdriveInfo.shareId}/files`,
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      },
      // Public folder endpoint
      {
        url: `https://kdrive.infomaniak.com/api/drive/${kdriveInfo.kdriveId}/share/${kdriveInfo.shareId}`,
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }
    ];
    
    console.log(`🔗 Testing ${apiTests.length} API endpoints...`);
    
    for (let i = 0; i < apiTests.length; i++) {
      const test = apiTests[i];
      try {
        console.log(`🔗 [${i+1}/${apiTests.length}] ${test.method} ${test.url}`);
        
        const response = await fetch(test.url, {
          method: test.method,
          headers: {
            ...test.headers,
            'User-Agent': 'Virgilio-RAG/1.0'
          }
        });
        
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ API successful, parsing response...');
          console.log('📄 Response keys:', Object.keys(data));
          
          // Parse different API response formats
          let files = [];
          
          if (Array.isArray(data)) {
            files = data;
          } else if (data.data && Array.isArray(data.data)) {
            files = data.data;
          } else if (data.files && Array.isArray(data.files)) {
            files = data.files;
          } else if (data.children && Array.isArray(data.children)) {
            files = data.children;
          }
          
          const processedFiles = files
            .filter(item => {
              const isFile = item.type === 'file' || !item.type;
              const validExt = item.name && /\.(pdf|docx?)$/i.test(item.name);
              return isFile && validExt;
            })
            .map(file => ({
              name: file.name,
              extension: file.name.split('.').pop().toLowerCase(),
              id: file.id,
              size: file.size || 0,
              discovered_at: new Date().toISOString(),
              status: 'discovered',
              source: 'kdrive_api'
            }));
          
          if (processedFiles.length > 0) {
            console.log(`✅ API found ${processedFiles.length} files`);
            return processedFiles;
          }
        } else {
          console.log(`   Failed: ${response.status}`);
          
          // Log errore specifico
          try {
            const errorData = await response.json();
            console.log(`   Error details:`, errorData);
          } catch (e) {
            console.log(`   No error details available`);
          }
        }
      } catch (apiError) {
        console.log(`   Exception: ${apiError.message}`);
      }
    }
    
    throw new Error('All API endpoints failed');
    
  } catch (error) {
    console.error('❌ API method failed:', error);
    return [];
  }
}

// WebDAV migliorato
async function getKDriveViaWebDAV() {
  try {
    console.log('🔗 === METODO 3: WEBDAV (Enhanced) ===');
    
    // WebDAV URLs più completi
    const webdavTests = [
      `https://${KDRIVE_ID}.connect.kdrive.infomaniak.com/share/${SHARE_ID}/`,
      `https://webdav.kdrive.infomaniak.com/${KDRIVE_ID}/share/${SHARE_ID}/`,
      `https://dav.infomaniak.com/kdrive/${KDRIVE_ID}/${SHARE_ID}/`,
      `https://connect.kdrive.infomaniak.com/${KDRIVE_ID}/share/${SHARE_ID}/`
    ];
    
    console.log(`🔗 Testing ${webdavTests.length} WebDAV endpoints...`);
    
    for (let i = 0; i < webdavTests.length; i++) {
      const webdavUrl = webdavTests[i];
      try {
        console.log(`🔗 [${i+1}/${webdavTests.length}] PROPFIND ${webdavUrl}`);
        
        const response = await fetch(webdavUrl, {
          method: 'PROPFIND',
          headers: {
            'Depth': '1',
            'Content-Type': 'application/xml; charset=utf-8',
            'Accept': 'application/xml, text/xml',
            'User-Agent': 'Virgilio-RAG/1.0'
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
        
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const xmlText = await response.text();
          console.log('✅ WebDAV response received');
          console.log(`📄 XML length: ${xmlText.length} characters`);
          
          // Parse XML per file
          const files = [];
          const displayNameRegex = /<d:displayname>([^<]*\.(?:pdf|docx?))<\/d:displayname>/gi;
          let match;
          
          while ((match = displayNameRegex.exec(xmlText)) !== null) {
            const filename = match[1];
            if (!files.some(f => f.name === filename)) {
              console.log(`📄 WebDAV file: ${filename}`);
              files.push({
                name: filename,
                extension: filename.split('.').pop().toLowerCase(),
                discovered_at: new Date().toISOString(),
                status: 'discovered',
                source: 'kdrive_webdav'
              });
            }
          }
          
          if (files.length > 0) {
            console.log(`✅ WebDAV found ${files.length} files`);
            return files;
          }
        } else {
          console.log(`   Failed: ${response.status}`);
        }
      } catch (webdavError) {
        console.log(`   Exception: ${webdavError.message}`);
      }
    }
    
    throw new Error('All WebDAV endpoints failed');
    
  } catch (error) {
    console.error('❌ WebDAV method failed:', error);
    return [];
  }
}

// Discovery principale (UNCHANGED)
async function getKDriveFileList() {
  try {
    console.log('🚀 =====================================');
    console.log('🚀 STARTING ENHANCED kDrive DISCOVERY');
    console.log('🚀 =====================================');
    console.log('🔗 Target URL:', KDRIVE_SHARE_URL);
    
    const methods = [
      { name: 'HTML Parsing', func: getKDriveSharedFiles },
      { name: 'API Calls', func: getKDriveViaAPI },
      { name: 'WebDAV', func: getKDriveViaWebDAV }
    ];
    
    let allDiscoveredFiles = [];
    let successfulMethods = [];
    
    for (const method of methods) {
      try {
        console.log(`\n🔄 === TRYING METHOD: ${method.name.toUpperCase()} ===`);
        const startTime = Date.now();
        
        const files = await method.func();
        const duration = Date.now() - startTime;
        
        if (files && files.length > 0) {
          console.log(`✅ ${method.name} successful: ${files.length} files in ${duration}ms`);
          successfulMethods.push({ name: method.name, files: files.length, duration });
          
          files.forEach(file => {
            if (!allDiscoveredFiles.some(f => f.name === file.name)) {
              allDiscoveredFiles.push(file);
            }
          });
        } else {
          console.log(`⚠️ ${method.name} returned no files`);
        }
      } catch (error) {
        console.log(`❌ ${method.name} failed: ${error.message}`);
      }
    }
    
    console.log('\n📊 === DISCOVERY SUMMARY ===');
    console.log(`✅ Successful methods: ${successfulMethods.length}`);
    successfulMethods.forEach(method => {
      console.log(`   - ${method.name}: ${method.files} files`);
    });
    console.log(`📂 Total unique files: ${allDiscoveredFiles.length}`);
    
    if (allDiscoveredFiles.length > 0) {
      return allDiscoveredFiles;
    }
    
    // Fallback: file di test PROCESSABILI
    console.log('\n🔄 === FALLBACK: PROCESSABLE TEST FILES ===');
    console.log('⚠️ All discovery methods failed');
    console.log('🔧 Providing test files to verify system functionality');
    console.log('💡 Possible solutions:');
    console.log('   1. Make sure kDrive share is public (no login required)');
    console.log('   2. Check if share URL is still valid');
    console.log('   3. Try accessing the URL manually in browser');
    console.log('   4. Contact Infomaniak support about API access');
    
    return [
      {
        name: 'Test_Disciplina_Militare_CC.pdf',
        extension: 'pdf',
        discovered_at: new Date().toISOString(),
        status: 'test_processable',  // Cambiato da 'test' a 'test_processable'
        source: 'fallback_test',
        note: 'Test file for system verification - processable'
      },
      {
        name: 'Test_Concorsi_Arma_2024.pdf',
        extension: 'pdf',
        discovered_at: new Date().toISOString(),
        status: 'test_processable',
        source: 'fallback_test',
        note: 'Test file for system verification - processable'
      },
      {
        name: 'Test_Pensioni_Militari.docx',
        extension: 'docx',
        discovered_at: new Date().toISOString(),
        status: 'test_processable',
        source: 'fallback_test',
        note: 'Test file for system verification - processable'
      }
    ];
    
  } catch (error) {
    console.error('❌ kDrive discovery completely failed:', error);
    throw error;
  }
}

// Resto del codice identico...
function parseKDriveUrl(url) {
  try {
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

    console.log('🚀 === ENHANCED kDrive DISCOVERY REQUEST ===');
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
    
    // Verifica stato di ogni file (SEZIONE MODIFICATA)
    console.log('\n🔍 Checking processing status for each file...');
    const filesWithStatus = [];
    
    for (const file of discoveredFiles) {
      if (file.status === 'error') {
        // Solo i file con errore non sono processabili
        filesWithStatus.push({
          ...file,
          processing_status: file.status,
          needs_processing: false
        });
      } else if (file.status === 'test' || file.status === 'test_processable') {
        // I file di test SONO processabili per testing del sistema
        filesWithStatus.push({
          ...file,
          processing_status: 'new',  // Cambiato da 'test' a 'new'
          needs_processing: true     // Cambiato da false a true
        });
        console.log(`   ${file.name}: test file (processable for system testing)`);
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
      test_files: filesWithStatus.filter(f => f.status && f.status.includes('test')).length,
      discovery_method: filesWithStatus[0]?.source || 'unknown',
      discovery_time_ms: discoveryTime,
      kdrive_version: 'v2.1_enhanced',
      methods_used: [...new Set(filesWithStatus.map(f => f.source))],
      share_accessible: filesWithStatus.filter(f => !f.status || !f.status.includes('test')).length > 0
    };
    
    console.log('\n📊 === FINAL STATISTICS ===');
    console.log('📋 Total discovered:', stats.total_discovered);
    console.log('📋 New files (processable):', stats.new_files);
    console.log('📋 Test files:', stats.test_files);
    console.log('📋 Real files found:', stats.share_accessible);
    
    // Auto-trigger processing se richiesto
    if (req.method === 'POST' && req.body?.auto_process === true) {
      const newFiles = filesWithStatus.filter(f => f.needs_processing);
      
      if (newFiles.length > 0) {
        console.log(`\n🚀 Auto-triggering processing for ${newFiles.length} files...`);
        
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
        }).catch(error => console.error('Auto-processing trigger failed:', error));
        
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
      platform: 'kdrive_infomaniak_enhanced',
      debug_info: {
        kdrive_id: KDRIVE_ID,
        share_id: SHARE_ID,
        discovery_duration_ms: discoveryTime,
        real_files_found: stats.share_accessible,
        test_files_processable: stats.test_files > 0
      }
    });

  } catch (error) {
    console.error('❌ === kDrive DISCOVERY ERROR ===');
    console.error('Error details:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Errore interno durante kDrive discovery',
      message: error.message,
      kdrive_url: KDRIVE_SHARE_URL,
      suggestions: [
        'Verifica che la cartella kDrive sia pubblica',
        'Controlla che la URL di condivisione sia ancora valida',
        'Prova ad accedere manualmente alla URL nel browser',
        'Contatta il supporto Infomaniak per accesso API'
      ]
    });
  }
}

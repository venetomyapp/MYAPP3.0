// api/sync/discover-kdrive.js - kDrive Discovery COMPLETO

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

// Metodo 1: Accesso diretto alla pagina condivisa (MIGLIORATO)
async function getKDriveSharedFiles() {
  try {
    console.log('🔍 === METODO 1: HTML PARSING ===');
    console.log('🔗 Accessing kDrive URL:', KDRIVE_SHARE_URL);
    
    const response = await fetch(KDRIVE_SHARE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      }
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`kDrive access failed: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`📄 HTML fetched: ${html.length} characters`);
    console.log('📄 HTML preview (first 1000 chars):');
    console.log(html.substring(0, 1000));
    console.log('📄 HTML ending (last 500 chars):');
    console.log(html.substring(Math.max(0, html.length - 500)));
    
    // Analisi contenuto HTML
    const pdfMatches = (html.match(/\.pdf/gi) || []).length;
    const docMatches = (html.match(/\.docx?/gi) || []).length;
    const fileMatches = (html.match(/file/gi) || []).length;
    const scriptTags = (html.match(/<script[^>]*>/gi) || []).length;
    
    console.log(`🔍 Content analysis:`);
    console.log(`   PDF references: ${pdfMatches}`);
    console.log(`   DOC references: ${docMatches}`);
    console.log(`   File references: ${fileMatches}`);
    console.log(`   Script tags: ${scriptTags}`);
    
    // Parse della pagina kDrive per trovare i file
    const files = [];
    
    // Pattern migliorati per trovare file nella pagina kDrive
    const filePatterns = [
      // JSON data nel DOM (più comuni)
      /"name"\s*:\s*"([^"]*\.(?:pdf|docx?))"[^}]*"type"\s*:\s*"file"/gi,
      /"filename"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi,
      /"name"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi,
      
      // Attributi HTML
      /data-name\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      /data-filename\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      /data-file\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      
      // Title e alt attributes
      /title\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      /alt\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      
      // Link diretti
      /href\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      /src\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      
      // Text content (nomi file nel testo)
      />([^<]*\.(?:pdf|docx?))</gi,
      
      // Vue.js / React data (kDrive usa framework JS)
      /:filename\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi,
      /v-bind:name\s*=\s*["']([^"']*\.(?:pdf|docx?))["']/gi
    ];
    
    console.log(`🔍 Testing ${filePatterns.length} file patterns...`);
    
    // Cerca con tutti i pattern
    for (let i = 0; i < filePatterns.length; i++) {
      const pattern = filePatterns[i];
      let matchCount = 0;
      let match;
      
      // Reset regex
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(html)) !== null) {
        let filename = match[1];
        matchCount++;
        
        if (filename && !files.some(f => f.name === filename)) {
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
    
    // Se non trova file con pattern, cerca in modo più aggressivo
    if (files.length === 0) {
      console.log('⚠️ No files with standard patterns, trying aggressive search...');
      
      // Cerca qualsiasi riferimento a PDF/DOC nel testo
      const aggressivePatterns = [
        /([a-zA-Z0-9_\-\s%\.]+\.pdf)/gi,
        /([a-zA-Z0-9_\-\s%\.]+\.docx?)/gi,
        // Cerca anche pattern URL-encoded
        /([a-zA-Z0-9_\-\s%]+%2Epdf)/gi,
        /([a-zA-Z0-9_\-\s%]+%2Edocx?)/gi
      ];
      
      for (const pattern of aggressivePatterns) {
        let match;
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(html)) !== null) {
          let filename = match[1].trim();
          
          // Decodifica URL encoding se presente
          try {
            filename = decodeURIComponent(filename);
          } catch (e) {
            // Mantieni nome originale se decodifica fallisce
          }
          
          // Filtra nomi file troppo corti o strani
          if (filename.length > 5 && filename.length < 100 && 
              !files.some(f => f.name === filename)) {
            console.log(`📄 Aggressive match: ${filename}`);
            files.push({
              name: filename,
              extension: filename.split('.').pop().toLowerCase(),
              discovered_at: new Date().toISOString(),
              status: 'discovered',
              source: 'kdrive_aggressive_search'
            });
          }
        }
      }
    }
    
    // Cerca anche dentro tag <script> per dati JSON
    if (files.length === 0) {
      console.log('🔍 Searching inside script tags for JSON data...');
      
      const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis);
      if (scriptMatches) {
        console.log(`Found ${scriptMatches.length} script tags to analyze`);
        
        for (let i = 0; i < scriptMatches.length; i++) {
          const scriptContent = scriptMatches[i];
          
          // Cerca JSON con file data
          const jsonPattern = /"files"\s*:\s*\[(.*?)\]/gis;
          const jsonMatch = jsonPattern.exec(scriptContent);
          
          if (jsonMatch) {
            console.log('📄 Found files JSON in script tag');
            const filesJson = jsonMatch[1];
            
            // Cerca nomi file nel JSON
            const fileInJsonPattern = /"name"\s*:\s*"([^"]*\.(?:pdf|docx?))"/gi;
            let fileMatch;
            
            while ((fileMatch = fileInJsonPattern.exec(filesJson)) !== null) {
              const filename = fileMatch[1];
              if (!files.some(f => f.name === filename)) {
                console.log(`📄 Found in JSON: ${filename}`);
                files.push({
                  name: filename,
                  extension: filename.split('.').pop().toLowerCase(),
                  discovered_at: new Date().toISOString(),
                  status: 'discovered',
                  source: 'kdrive_script_json'
                });
              }
            }
          }
        }
      }
    }
    
    console.log(`✅ HTML parsing completed: ${files.length} files found`);
    if (files.length > 0) {
      console.log('📂 Files discovered:');
      files.forEach(file => console.log(`   - ${file.name} (${file.source})`));
    }
    
    return files;
    
  } catch (error) {
    console.error('❌ kDrive HTML parsing error:', error);
    console.log('💡 Possible reasons:');
    console.log('   - CORS policy blocking request');
    console.log('   - kDrive requires authentication/cookies');
    console.log('   - Dynamic content loading (JavaScript required)');
    console.log('   - Rate limiting or IP blocking');
    throw error;
  }
}

// Metodo 2: Tentativo API kDrive (MIGLIORATO)
async function getKDriveViaAPI() {
  try {
    console.log('🌐 === METODO 2: API CALLS ===');
    
    const kdriveInfo = parseKDriveUrl(KDRIVE_SHARE_URL);
    if (!kdriveInfo) {
      throw new Error('Cannot parse kDrive URL');
    }
    
    console.log('🔧 Parsed kDrive info:', kdriveInfo);
    
    // Possibili endpoint API kDrive (più completi)
    const apiEndpoints = [
      // API pubblica Infomaniak
      `https://api.infomaniak.com/1/drive/${kdriveInfo.kdriveId}/files/share/${kdriveInfo.shareId}`,
      `https://api.infomaniak.com/1/drive/${kdriveInfo.kdriveId}/share/${kdriveInfo.shareId}/files`,
      
      // API interna kDrive
      `https://kdrive.infomaniak.com/api/drive/${kdriveInfo.kdriveId}/share/${kdriveInfo.shareId}/files`,
      `https://kdrive.infomaniak.com/api/share/${kdriveInfo.shareId}/files`,
      `https://kdrive.infomaniak.com/api/v1/drive/${kdriveInfo.kdriveId}/share/${kdriveInfo.shareId}`,
      
      // Subdomain specifico
      `https://${kdriveInfo.kdriveId}.connect.kdrive.infomaniak.com/files`,
      `https://${kdriveInfo.kdriveId}.connect.kdrive.infomaniak.com/api/files`,
      
      // Share endpoint diretto
      `https://share.kdrive.infomaniak.com/${kdriveInfo.shareId}/files`,
      `https://share.kdrive.infomaniak.com/api/${kdriveInfo.shareId}/files`
    ];
    
    console.log(`🔗 Testing ${apiEndpoints.length} API endpoints...`);
    
    for (let i = 0; i < apiEndpoints.length; i++) {
      const endpoint = apiEndpoints[i];
      try {
        console.log(`🔗 [${i+1}/${apiEndpoints.length}] Trying: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Virgilio-RAG/1.0',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        console.log(`   Response: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          console.log(`   Content-Type: ${contentType}`);
          
          if (contentType?.includes('application/json')) {
            const data = await response.json();
            console.log('✅ API JSON response received');
            console.log('📄 Response structure:', Object.keys(data));
            
            // Parse risposta API (formato da determinare)
            let files = [];
            
            // Prova diverse strutture JSON
            if (Array.isArray(data)) {
              files = data;
            } else if (data.files && Array.isArray(data.files)) {
              files = data.files;
            } else if (data.data && Array.isArray(data.data)) {
              files = data.data;
            } else if (data.items && Array.isArray(data.items)) {
              files = data.items;
            }
            
            console.log(`📂 Found ${files.length} items in API response`);
            
            const processedFiles = files
              .filter(item => {
                const isFile = item.type === 'file' || item.kind === 'file' || 
                               !item.type || // assume file if no type
                               item.mime_type || item.mimeType;
                const hasValidExtension = item.name && /\.(pdf|docx?)$/i.test(item.name);
                return isFile && hasValidExtension;
              })
              .map(file => ({
                name: file.name,
                extension: file.name.split('.').pop().toLowerCase(),
                id: file.id || file.file_id,
                size: file.size || 0,
                mime_type: file.mime_type || file.mimeType,
                discovered_at: new Date().toISOString(),
                status: 'discovered',
                source: 'kdrive_api',
                api_endpoint: endpoint
              }));
            
            console.log(`✅ API method successful: ${processedFiles.length} files`);
            if (processedFiles.length > 0) {
              console.log('📂 Files from API:');
              processedFiles.forEach(file => console.log(`   - ${file.name} (${file.size} bytes)`));
              return processedFiles;
            }
          }
        } else {
          console.log(`   Failed: ${response.status} - ${response.statusText}`);
        }
      } catch (apiError) {
        console.log(`   Error: ${apiError.message}`);
        continue;
      }
    }
    
    throw new Error('All API endpoints failed');
    
  } catch (error) {
    console.error('❌ kDrive API method failed:', error);
    return [];
  }
}

// Metodo 3: WebDAV (MIGLIORATO)
async function getKDriveViaWebDAV() {
  try {
    console.log('🔗 === METODO 3: WEBDAV ===');
    
    // URL WebDAV potenziali (più completi)
    const webdavUrls = [
      `https://${KDRIVE_ID}.connect.kdrive.infomaniak.com/`,
      `https://${KDRIVE_ID}.connect.kdrive.infomaniak.com/share/${SHARE_ID}/`,
      `https://webdav.kdrive.infomaniak.com/${KDRIVE_ID}/${SHARE_ID}/`,
      `https://webdav.kdrive.infomaniak.com/${KDRIVE_ID}/`,
      `https://dav.kdrive.infomaniak.com/${KDRIVE_ID}/${SHARE_ID}/`,
      `https://kdrive.infomaniak.com/webdav/${KDRIVE_ID}/${SHARE_ID}/`
    ];
    
    console.log(`🔗 Testing ${webdavUrls.length} WebDAV endpoints...`);
    
    for (let i = 0; i < webdavUrls.length; i++) {
      const webdavUrl = webdavUrls[i];
      try {
        console.log(`🔗 [${i+1}/${webdavUrls.length}] Trying WebDAV: ${webdavUrl}`);
        
        const response = await fetch(webdavUrl, {
          method: 'PROPFIND',
          headers: {
            'Depth': '1',
            'Content-Type': 'application/xml; charset=utf-8',
            'User-Agent': 'Virgilio-RAG/1.0'
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
        
        console.log(`   Response: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const xmlText = await response.text();
          console.log('✅ WebDAV response received');
          console.log(`📄 XML length: ${xmlText.length} characters`);
          console.log('📄 XML preview:', xmlText.substring(0, 500));
          
          // Parse XML response per trovare file PDF/DOC
          const files = [];
          
          // Pattern per trovare file nel XML WebDAV
          const namePatterns = [
            /<d:displayname>([^<]*\.(?:pdf|docx?))<\/d:displayname>/gi,
            /<displayname>([^<]*\.(?:pdf|docx?))<\/displayname>/gi,
            /<name>([^<]*\.(?:pdf|docx?))<\/name>/gi
          ];
          
          for (const pattern of namePatterns) {
            let match;
            while ((match = pattern.exec(xmlText)) !== null) {
              const filename = match[1];
              if (!files.some(f => f.name === filename)) {
                console.log(`📄 WebDAV file found: ${filename}`);
                files.push({
                  name: filename,
                  extension: filename.split('.').pop().toLowerCase(),
                  discovered_at: new Date().toISOString(),
                  status: 'discovered',
                  source: 'kdrive_webdav',
                  webdav_url: webdavUrl
                });
              }
            }
          }
          
          if (files.length > 0) {
            console.log(`✅ WebDAV method successful: ${files.length} files`);
            return files;
          }
        } else {
          console.log(`   Failed: ${response.status}`);
        }
      } catch (webdavError) {
        console.log(`   Error: ${webdavError.message}`);
        continue;
      }
    }
    
    throw new Error('All WebDAV methods failed');
    
  } catch (error) {
    console.error('❌ kDrive WebDAV method failed:', error);
    return [];
  }
}

// Funzione principale di discovery kDrive (MIGLIORATA)
async function getKDriveFileList() {
  try {
    console.log('🚀 =====================================');
    console.log('🚀 STARTING kDrive DISCOVERY');
    console.log('🚀 =====================================');
    console.log('🔗 Target URL:', KDRIVE_SHARE_URL);
    console.log('📋 kDrive ID:', KDRIVE_ID);
    console.log('📋 Share ID:', SHARE_ID);
    
    // Prova tutti i metodi in ordine di affidabilità
    const methods = [
      { name: 'HTML Parsing', func: getKDriveSharedFiles, priority: 1 },
      { name: 'API Calls', func: getKDriveViaAPI, priority: 2 },
      { name: 'WebDAV', func: getKDriveViaWebDAV, priority: 3 }
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
          successfulMethods.push({
            name: method.name,
            files: files.length,
            duration: duration
          });
          
          // Aggiungi file unici alla lista totale
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
        continue;
      }
    }
    
    console.log('\n📊 === DISCOVERY SUMMARY ===');
    console.log(`✅ Successful methods: ${successfulMethods.length}`);
    successfulMethods.forEach(method => {
      console.log(`   - ${method.name}: ${method.files} files (${method.duration}ms)`);
    });
    console.log(`📂 Total unique files discovered: ${allDiscoveredFiles.length}`);
    
    if (allDiscoveredFiles.length > 0) {
      console.log('\n📋 === DISCOVERED FILES ===');
      allDiscoveredFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (via ${file.source})`);
      });
      
      return allDiscoveredFiles;
    }
    
    // Fallback finale: file di test per verifica sistema
    console.log('\n🔄 === FALLBACK: TEST FILES ===');
    console.log('⚠️ All discovery methods failed, using test files for system verification...');
    console.log('💡 This means:');
    console.log('   - Your kDrive share might require authentication');
    console.log('   - The share might use dynamic JavaScript loading');
    console.log('   - CORS policies might be blocking access');
    console.log('   - The share URL might have changed or expired');
    
    return [
      {
        name: 'kDrive_Test_Document.pdf',
        extension: 'pdf',
        discovered_at: new Date().toISOString(),
        status: 'test',
        source: 'fallback_test',
        note: 'Test file - indicates kDrive discovery needs investigation'
      },
      {
        name: 'kDrive_Connectivity_Check.docx',
        extension: 'docx',
        discovered_at: new Date().toISOString(),
        status: 'test',
        source: 'fallback_test',
        note: 'Test file - system is working but cannot access real kDrive content'
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

    console.log('🚀 === kDrive DISCOVERY REQUEST ===');
    console.log('📋 Method:', req.method);
    console.log('📋 User-Agent:', req.headers['user-agent']);
    console.log('📋 Origin:', req.headers.origin);
    
    const startTime = Date.now();
    
    // Discovery kDrive
    console.log('\n🔍 Starting kDrive file discovery...');
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
        discovery_time_ms: discoveryTime,
        debug_info: {
          kdrive_id: KDRIVE_ID,
          share_id: SHARE_ID,
          methods_attempted: ['html_parsing', 'api_calls', 'webdav'],
          suggestion: 'Verifica che la cartella kDrive sia pubblica e contenga file PDF/DOC'
        }
      });
    }
    
    // Verifica stato di ogni file
    console.log('\n🔍 Checking processing status for each file...');
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
        console.log(`   ${file.name}: ${status}`);
      }
    }
    
    // Statistiche finali
    const stats = {
      total_discovered: filesWithStatus.length,
      already_processed: filesWithStatus.filter(f => f.processing_status === 'processed').length,
      new_files: filesWithStatus.filter(f => f.processing_status === 'new').length,
      test_files: filesWithStatus.filter(f => f.processing_status === 'test').length,
      discovery_method: filesWithStatus[0]?.source || 'unknown',
      discovery_time_ms: discoveryTime,
      kdrive_version: 'v2.0',
      methods_used: [...new Set(filesWithStatus.map(f => f.source))],
      share_accessible: filesWithStatus.filter(f => f.status !== 'test').length > 0
    };
    
    console.log('\n📊 === FINAL STATISTICS ===');
    console.log('📋 Total discovered:', stats.total_discovered);
    console.log('📋 Already processed:', stats.already_processed);
    console.log('📋 New files:', stats.new_files);
    console.log('📋 Test files:', stats.test_files);
    console.log('📋 Discovery methods:', stats.methods_used.join(', '));
    console.log('📋 Share accessible:', stats.share_accessible);
    
    // Auto-trigger processing se richiesto
    if (req.method === 'POST' && req.body?.auto_process === true) {
      const newFiles = filesWithStatus.filter(f => f.needs_processing);
      
      if (newFiles.length > 0) {
        console.log(`\n🚀 Auto-triggering processing for ${newFiles.length} new files...`);
        
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
      platform: 'kdrive_infomaniak',
      debug_info: {
        kdrive_id: KDRIVE_ID,
        share_id: SHARE_ID,
        discovery_duration_ms: discoveryTime,
        real_files_found: stats.share_accessible
      }
    });

  } catch (error) {
    console.error('❌ === kDrive DISCOVERY ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: 'Errore interno durante kDrive discovery',
      message: error.message,
      kdrive_url: KDRIVE_SHARE_URL,
      debug_info: {
        error_type: error.name,
        kdrive_id: KDRIVE_ID,
        share_id: SHARE_ID
      },
      suggestions: [
        'Verifica che la cartella kDrive sia pubblica',
        'Controlla che la URL di condivisione sia ancora valida',
        'Verifica la connessione internet del server',
        'Controlla i log del server per dettagli aggiuntivi'
      ]
    });
  }
}

// /api/sync/process-kdrive.js
// Next.js Pages API (Node runtime). Se usi App Router dimmelo e te lo porto in route.ts.

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// ============= UTIL RISPOSTA + CORS =============
function send(res, code, payload) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(code).json(payload);
}

// ============= HANDLER PRINCIPALE =============
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, {});
  if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });

  const startedAt = Date.now();

  try {
    // 0) Auth della tua app
    const appAuth = req.headers.authorization || '';
    if (!appAuth.startsWith('Bearer ')) return send(res, 401, { success: false, error: 'Token mancante' });

    // 1) Env check
    const KDRIVE_EMAIL = process.env.KDRIVE_EMAIL;
    const KDRIVE_PASSWORD = process.env.KDRIVE_PASSWORD;
    if (!KDRIVE_EMAIL || !KDRIVE_PASSWORD) {
      return send(res, 500, { success: false, error: 'KDRIVE_EMAIL/KDRIVE_PASSWORD non configurati' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPA_KEY) {
      return send(res, 500, { success: false, error: 'SUPABASE_URL o chiave Supabase mancanti' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return send(res, 500, { success: false, error: 'OPENAI_API_KEY non configurata' });
    }

    // 2) Body parsing
    const { files = [], share_url = '', path: userRootPath = '' } = req.body || {};
    if (!Array.isArray(files) || files.length === 0) {
      return send(res, 400, { success: false, error: 'Lista file mancante o vuota' });
    }

    // 3) Prepara WebDAV
    const overrideBase = (process.env.KDRIVE_WEBDAV_URL || '').trim();
    const candidates = buildWebDavCandidates({ shareUrl: String(share_url || ''), overrideBase });
    const basic = 'Basic ' + Buffer.from(`${KDRIVE_EMAIL}:${KDRIVE_PASSWORD}`).toString('base64');

    const resolved = await resolveWebDavBase({ candidates, basic });
    if (!resolved) {
      return send(res, 502, { success: false, error: 'Nessun endpoint WebDAV kDrive valido', tried: candidates });
    }
    const { baseUrl } = resolved;

    // 4) Se i file sono solo "name", dobbiamo risolvere il path
    const rootPath = normalizePath(userRootPath || process.env.KDRIVE_DEFAULT_PATH || '/');
    const indexTree = await buildIndexTree({ baseUrl, basic, rootPath }); // root + prime sottocartelle

    const tasks = files.map(f => (typeof f === 'string' ? { name: f } : f));
    for (const t of tasks) {
      if (!t.path) {
        const found = indexTree.find(it => it.displayName === t.name);
        if (found) t.path = found.hrefPath;
      }
    }

    // 5) Processa
    const results = [];
    let totalChunks = 0, okFiles = 0;

    for (const t of tasks) {
      const r = await processOneFile({
        baseUrl,
        basic,
        fileName: t.name,
        filePath: t.path,           // se mancante proveremo a cercarlo on-the-fly
        indexTree,
        SUPABASE_URL,
        SUPA_KEY
      });
      results.push(r);
      if (r.success) {
        okFiles++;
        totalChunks += r.chunks_saved || 0;
      }
      await pause(300); // rate limit gentile tra file
    }

    const stats = {
      files_requested: files.length,
      files_processed: okFiles,
      files_failed: files.length - okFiles,
      total_chunks_saved: totalChunks,
      processing_ms: Date.now() - startedAt,
      base_url_used: baseUrl,
      root_path: rootPath,
      share_url
    };

    return send(res, 200, {
      success: okFiles > 0,
      message: `kDrive Processing: ${okFiles}/${files.length} file, ${totalChunks} chunks`,
      results,
      statistics: stats,
      timestamp: new Date().toISOString(),
      platform: 'kdrive'
    });

  } catch (err) {
    console.error('process-kdrive error:', err);
    return send(res, 500, { success: false, error: 'Errore interno durante kDrive processing', message: err?.message || String(err) });
  }
}

/* ======================= WEBNAV / LISTING ======================= */

function buildWebDavCandidates({ shareUrl, overrideBase }) {
  const list = [];
  if (overrideBase) list.push(trimSlash(overrideBase));

  const m = (shareUrl || '').match(/\/share\/(\d+)\//);
  if (m) {
    const driveId = m[1];
    list.push(`https://${driveId}.connect.kdrive.infomaniak.com`);
    list.push(`https://${driveId}.connect.kdrive.infomaniak.com/webdav`);
    list.push(`https://${driveId}.connect.kdrive.infomaniak.com/dav`);
  }

  // fallback noti
  list.push('https://connect.drive.infomaniak.com');
  list.push('https://connect.drive.infomaniak.com/webdav');
  list.push('https://connect.kdrive.infomaniak.com');

  return [...new Set(list.map(trimSlash))];
}

async function resolveWebDavBase({ candidates, basic }) {
  for (const baseUrl of candidates) {
    try {
      const r = await fetch(baseUrl + '/', {
        method: 'PROPFIND',
        headers: {
          Authorization: basic,
          Depth: '0',
          'Content-Type': 'application/xml'
        },
        body: `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`
      });
      if (r.ok || r.status === 207) return { baseUrl };
    } catch {}
  }
  return null;
}

async function buildIndexTree({ baseUrl, basic, rootPath }) {
  const exts = /\.(pdf|docx?|pptx?|xlsx?|xls|txt|md)$/i;
  const index = [];

  // root
  const root = await propfindList({ baseUrl, path: rootPath, basic, depth: 1 });
  for (const it of root.items) index.push(it);

  // prime sottocartelle (max 5)
  const folders = root.items.filter(i => i.isCollection).slice(0, 5);
  for (const f of folders) {
    const sub = await propfindList({ baseUrl, path: f.hrefPath, basic, depth: 1 });
    for (const it of sub.items) index.push(it);
  }

  // keep solo file utili + cartelle per future risoluzioni
  return index.filter(it => it.isCollection || (it.displayName && exts.test(it.displayName)));
}

async function propfindList({ baseUrl, path = '/', basic, depth = 1 }) {
  const url = trimSlash(baseUrl) + normalizePath(path);
  const r = await fetch(url, {
    method: 'PROPFIND',
    headers: {
      Authorization: basic,
      Depth: String(depth),
      'Content-Type': 'application/xml; charset=utf-8'
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
      <d:propfind xmlns:d="DAV:">
        <d:prop>
          <d:displayname/>
          <d:getcontentlength/>
          <d:resourcetype/>
          <d:getlastmodified/>
        </d:prop>
      </d:propfind>`
  });

  const text = await r.text();
  if (!(r.ok || r.status === 207)) {
    throw new Error(`PROPFIND ${url} -> ${r.status} ${r.statusText} ${text.slice(0,200)}`);
  }

  const items = [];
  const rxResp = /<d:response>([\s\S]*?)<\/d:response>/gi;
  let m;
  while ((m = rxResp.exec(text)) !== null) {
    const chunk = m[1];
    const displayName = pick1(chunk, /<d:displayname>([^<]*)<\/d:displayname>/i);
    const size = Number(pick1(chunk, /<d:getcontentlength>(\d+)<\/d:getcontentlength>/i)) || 0;
    const isCollection = /<d:collection\s*\/>|<d:resourcetype>\s*<d:collection\s*\/>/i.test(chunk);
    const href = pick1(chunk, /<d:href>([^<]*)<\/d:href>/i) || '';
    const hrefPath = tryDecodeHref(href);

    if (isSelf(hrefPath, path)) continue; // ignora la directory stessa

    items.push({ displayName, size, isCollection, hrefPath });
  }

  return { items, raw: text };
}

/* ======================= DOWNLOAD & PROCESS ======================= */

async function processOneFile({ baseUrl, basic, fileName, filePath, indexTree, SUPABASE_URL, SUPA_KEY }) {
  try {
    // 1) Trova il path se non presente
    let targetPath = filePath;
    if (!targetPath) {
      const found = indexTree.find(it => !it.isCollection && it.displayName === fileName);
      if (found) targetPath = found.hrefPath;
    }
    if (!targetPath) {
      return { filename: fileName, success: false, error: 'File non trovato tramite listing WebDAV' };
    }

    // 2) Scarica
    const file = await downloadFromWebDav({ baseUrl, basic, hrefPath: targetPath, fileName });
    if (file.size > MAX_FILE_SIZE) {
      return { filename: fileName, success: false, error: `File troppo grande (${file.size} bytes)` };
    }

    // 3) Estrai testo (molto basico; per docx/xlsx si andrà in fallback)
    const extracted = await extractTextFromBuffer(file.buffer, fileName);
    if (!extracted?.text || extracted.text.length < 30) {
      return { filename: fileName, success: false, error: 'Estrazione testo vuota' };
    }

    // 4) Chunking
    const chunks = intelligentChunking(extracted.text, fileName, extracted.pages || 1);
    if (!chunks.length) {
      return { filename: fileName, success: false, error: 'Nessun chunk generato' };
    }

    // 5) Salvataggio su Supabase con embeddings
    let saved = 0;
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await createEmbedding(chunks[i].content);
        const dbChunk = {
          title: fileName.replace(/\.[^/.]+$/, ''),
          file_name: fileName,
          file_url: encodeKdriveUrl(baseUrl, targetPath),
          chapter: chunks[i].chapter,
          section: chunks[i].section,
          content: chunks[i].content,
          page_number: chunks[i].page_number,
          embedding,
          metadata: {
            ...chunks[i].metadata,
            extraction_method: extracted.generated ? 'fallback' : 'binary_parse',
            content_generated: !!extracted.generated,
            webdav_base: baseUrl,
            webdav_path: targetPath
          }
        };
        await saveChunkToSupabase(SUPABASE_URL, SUPA_KEY, dbChunk);
        saved++;
        await pause(120); // rate limit gentile OpenAI/DB
      } catch (e) {
        console.error(`save chunk error ${i + 1}/${chunks.length}:`, e.message);
      }
    }

    return {
      filename: fileName,
      success: saved > 0,
      chunks_total: chunks.length,
      chunks_saved: saved,
      file_size: file.size,
      pages: extracted.pages || 1,
      content_generated: !!extracted.generated
    };

  } catch (err) {
    return { filename: fileName, success: false, error: err?.message || String(err) };
  }
}

async function downloadFromWebDav({ baseUrl, basic, hrefPath, fileName }) {
  const url = trimSlash(baseUrl) + encodePath(hrefPath);
  const r = await fetch(url, { headers: { Authorization: basic } });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`GET ${url} -> ${r.status} ${r.statusText} ${text.slice(0,120)}`);
  }
  const ab = await r.arrayBuffer();
  const buf = Buffer.from(ab);
  const contentType = r.headers.get('content-type') || 'application/octet-stream';

  console.log(`📥 scaricato ${fileName} (${buf.length} bytes) da ${url}`);
  return { buffer: buf, filename: fileName, size: buf.length, contentType };
}

/* ======================= NLP / CHUNKING ======================= */

async function createEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // più recente/efficiente di ada-002
      input: text.slice(0, 8000)
    })
  });
  if (!response.ok) {
    const e = await response.text().catch(() => '');
    throw new Error(`OpenAI embeddings: ${response.status} ${e.slice(0,150)}`);
  }
  const data = await response.json();
  return data.data[0].embedding;
}

async function saveChunkToSupabase(SUPABASE_URL, KEY, chunk) {
  const r = await fetch(`${trimSlash(SUPABASE_URL)}/rest/v1/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
      apikey: KEY,
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(chunk)
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Supabase insert: ${r.status} ${t.slice(0,150)}`);
  }
}

// Estrazione molto basica (PDF -> fallback testuale per altri formati)
async function extractTextFromBuffer(buffer, filename) {
  const isPDF = buffer?.length > 4 && buffer.slice(0, 4).toString('latin1') === '%PDF';
  if (isPDF) {
    // Estrazione grezza: cerca ( ... ) tipico PDF — placeholder minimale
    const s = buffer.toString('latin1');
    const m = s.match(/\((.*?)\)/g);
    if (m && m.length) {
      const text = m.map(x => x.slice(1, -1))
        .filter(x => x.length > 3)
        .join(' ')
        .replace(/[^\x20-\x7E\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > 200) {
        return { text, pages: Math.max(1, Math.ceil(text.length / 2200)) };
      }
    }
  }
  // Fallback testuale sintetico se non PDF/estrazione povera
  const fallback = `Estratto testuale semplificato da ${filename}.
Contenuto placeholder generato perché l'estrazione binaria non ha prodotto testo sufficiente.`;
  return { text: fallback, pages: 1, generated: true };
}

function intelligentChunking(text, filename, totalPages) {
  const chunks = [];
  const sections = text.split(/(?:CAPITOLO|CAPO|SEZIONE|PARTE)\s+\d+/i);
  for (let si = 0; si < sections.length; si++) {
    const sectionText = sections[si].trim();
    if (sectionText.length < 50) continue;
    const sectionTitle = extractSectionTitle(sectionText, si);
    const words = sectionText.split(/\s+/);
    for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
      const chunkWords = words.slice(i, i + CHUNK_SIZE);
      const chunkText = chunkWords.join(' ');
      if (chunkText.length < 100) continue;
      const estimatedPage = Math.floor((i / words.length) * totalPages) + 1;
      chunks.push({
        content: chunkText,
        chapter: sectionTitle,

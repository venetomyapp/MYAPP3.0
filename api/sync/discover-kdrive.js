// /api/sync/discover-kdrive.js
// Next.js Pages API (Node runtime). Se usi App Router, dimmelo e te lo porto in route.ts.

// Utility: risposta JSON con CORS
function send(res, code, payload) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(code).json(payload);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, {});
  if (req.method !== 'GET') return send(res, 405, { success: false, error: 'Method not allowed' });

  const startedAt = Date.now();

  try {
    // --- Auth dell'app (token dell'utente che usa la dashboard) ---
    const appAuth = req.headers.authorization || '';
    if (!appAuth.startsWith('Bearer ')) return send(res, 401, { success: false, error: 'Token mancante' });

    // --- ENV kDrive ---
    const KDRIVE_EMAIL = process.env.KDRIVE_EMAIL;
    const KDRIVE_PASSWORD = process.env.KDRIVE_PASSWORD;
    if (!KDRIVE_EMAIL || !KDRIVE_PASSWORD) {
      return send(res, 500, { success: false, error: 'KDRIVE_EMAIL/KDRIVE_PASSWORD non configurati' });
    }

    // --- ENV Supabase ---
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return send(res, 500, { success: false, error: 'SUPABASE_URL o KEY mancanti' });
    }

    // --- Parametri richiesta ---
    const shareUrl = (req.query.share_url || '').toString().trim();
    const overrideBase = (process.env.KDRIVE_WEBDAV_URL || '').trim();
    const defaultPath = (process.env.KDRIVE_DEFAULT_PATH || '').trim(); // opzionale
    const userPath = (req.query.path || '').toString().trim(); // opzionale

    // --- Costruzione lista endpoint candidati ---
    const candidates = buildWebDavCandidates({ shareUrl, overrideBase, email: KDRIVE_EMAIL });

    // --- Auth header Basic ---
    const basic = 'Basic ' + Buffer.from(`${KDRIVE_EMAIL}:${KDRIVE_PASSWORD}`).toString('base64');

    // --- Trova il primo endpoint che risponde al PROPFIND di base ---
    const resolved = await resolveWebDavBase({ candidates, basic });

    if (!resolved) {
      return send(res, 502, {
        success: false,
        error: 'Nessun endpoint WebDAV kDrive ha risposto correttamente',
        tried: candidates
      });
    }

    const { baseUrl } = resolved;

    // Path iniziale: prioritario userPath > defaultPath > root
    const rootPath = normalizePath(userPath || defaultPath || '/');

    // 1) Lista nel path principale (Depth:1)
    const rootListing = await propfindList({ baseUrl, path: rootPath, basic, depth: 1 });

    // Estrai file e cartelle
    const exts = /\.(pdf|docx?|pptx?|xlsx?|xls|txt|md)$/i;
    const files = [];
    const folders = [];

    for (const it of rootListing.items) {
      if (it.isCollection) {
        if (it.displayName && it.displayName !== '.' && it.displayName !== '..') {
          folders.push(joinPath(rootPath, it.displayName));
        }
      } else if (it.displayName && exts.test(it.displayName)) {
        files.push({
          name: it.displayName,
          extension: (it.displayName.split('.').pop() || '').toLowerCase(),
          size: it.size || 0,
          path: it.hrefPath,
          discovered_at: new Date().toISOString(),
          status: 'discovered',
          source: 'kdrive_webdav'
        });
      }
    }

    // 2) Se non abbiamo abbastanza file, esplora un po’ di sottocartelle (limitato)
    const MAX_FOLDERS = 5;
    const subfolders = folders.slice(0, MAX_FOLDERS);

    for (const f of subfolders) {
      const sub = await propfindList({ baseUrl, path: f, basic, depth: 1 });
      for (const it of sub.items) {
        if (!it.isCollection && it.displayName && exts.test(it.displayName)) {
          files.push({
            name: it.displayName,
            extension: (it.displayName.split('.').pop() || '').toLowerCase(),
            size: it.size || 0,
            path: it.hrefPath,
            folder: f,
            discovered_at: new Date().toISOString(),
            status: 'discovered',
            source: 'kdrive_webdav'
          });
        }
      }
    }

    // 3) Arricchisci con stato Supabase (processed/new)
    const checked = await markProcessingStatus(files, { SUPABASE_URL, SUPABASE_KEY });

    const stats = {
      total_discovered: checked.length,
      already_processed: checked.filter(f => f.processing_status === 'processed').length,
      new_files: checked.filter(f => f.processing_status === 'new').length,
      discovery_method: 'webdav',
      discovery_time_ms: Date.now() - startedAt,
      base_url_used: baseUrl,
      root_path: rootPath,
      share_url: shareUrl || null
    };

    return send(res, 200, {
      success: true,
      message: `Discovery completato`,
      files: checked,
      statistics: stats,
      timestamp: new Date().toISOString(),
      platform: 'kdrive'
    });

  } catch (err) {
    console.error('discover-kdrive error:', err);
    return send(res, 500, {
      success: false,
      error: 'Errore durante kDrive discovery',
      message: err?.message || String(err)
    });
  }
}

/* ======================= HELPERS ======================= */

// Crea candidate base URLs: da ENV, da share_url (driveId), fallback generico
function buildWebDavCandidates({ shareUrl, overrideBase, email }) {
  const list = [];

  // 1) Se forzato da ENV
  if (overrideBase) list.push(trimSlash(overrideBase));

  // 2) Dalla share: https://kdrive.infomaniak.com/app/share/<driveId>/<uuid>
  const m = shareUrl.match(/\/share\/(\d+)\//);
  if (m) {
    const driveId = m[1];
    // varianti tipiche usate da kDrive
    list.push(`https://${driveId}.connect.kdrive.infomaniak.com`);
    list.push(`https://${driveId}.connect.kdrive.infomaniak.com/webdav`);
    list.push(`https://${driveId}.connect.kdrive.infomaniak.com/dav`);
  }

  // 3) Fallback generici noti
  list.push('https://connect.drive.infomaniak.com');
  list.push('https://connect.drive.infomaniak.com/webdav');
  list.push('https://connect.drive.infomaniak.com/dav');
  list.push('https://connect.kdrive.infomaniak.com');

  // Dedup
  return [...new Set(list.map(trimSlash))];
}

// Prova i candidati con PROPFIND Depth:0 (solo base)
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
        // body minimo valido
        body: `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`
      });

      if (r.ok || r.status === 207) {
        return { baseUrl };
      }
    } catch (e) {
      // ignora e passa al prossimo
    }
  }
  return null;
}

// Esegue PROPFIND su un path (Depth:1 di default) e parse basilare dell’XML
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

  // Parsing leggero (regex) per evitare dipendenze
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

    // salta il nodo relativo alla directory stessa
    if (isSelf(hrefPath, path)) continue;

    items.push({ displayName, size, isCollection, hrefPath });
  }

  return { items, raw: text };
}

function pick1(str, rx) {
  const m = str.match(rx);
  return m ? m[1] : '';
}

function tryDecodeHref(href) {
  try {
    const u = new URL(href, 'http://x');
    return decodeURIComponent(u.pathname || '/');
  } catch {
    try { return decodeURIComponent(href); } catch { return href; }
  }
}

function isSelf(hrefPath, currentPath) {
  const a = normalizePath(hrefPath);
  const b = normalizePath(currentPath);
  return a === b || a === b + '/';
}

function normalizePath(p) {
  if (!p) return '/';
  let s = p.startsWith('/') ? p : '/' + p;
  s = s.replace(/\/{2,}/g, '/');
  if (!s.endsWith('/')) s += '/';
  return s;
}

function joinPath(base, name) {
  return normalizePath(base + '/' + name);
}

function trimSlash(s) {
  return s.replace(/\/+$/, '');
}

// Marca lo stato in base alla presenza su Supabase
async function markProcessingStatus(files, { SUPABASE_URL, SUPABASE_KEY }) {
  const out = [];
  for (const f of files) {
    const status = await checkDocumentStatusSUPA(SUPABASE_URL, SUPABASE_KEY, f.name);
    out.push({ ...f, processing_status: status, needs_processing: status === 'new' });
  }
  return out;
}

async function checkDocumentStatusSUPA(SUPABASE_URL, KEY, filename) {
  try {
    // ⚠️ Per la REST di Supabase, Authorization deve essere la chiave (anon o service-role)
    const url = `${trimSlash(SUPABASE_URL)}/rest/v1/documents?file_name=eq.${encodeURIComponent(filename)}&select=id`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${KEY}`,
        apikey: KEY
      }
    });
    if (!r.ok) return 'unknown';
    const data = await r.json();
    return Array.isArray(data) && data.length > 0 ? 'processed' : 'new';
  } catch {
    return 'unknown';
  }
}

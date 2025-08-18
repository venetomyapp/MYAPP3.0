// pages/api/sync/discover-kdrive.js
// Discover kDrive via WebDAV + Supabase status
// Frontend: GET /api/sync/discover-kdrive?share_url=...&path=...

/* ============== CORS / RESP ============== */
function send(res, code, payload) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(code).json(payload);
}

/* ============== HANDLER ============== */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, {});
  if (req.method !== 'GET') return send(res, 405, { success: false, error: 'Method not allowed' });

  const startedAt = Date.now();

  try {
    // 0) Auth della tua app (token Bearer della dashboard)
    const appAuth = req.headers.authorization || '';
    if (!appAuth.startsWith('Bearer ')) {
      return send(res, 401, { success: false, error: 'Token mancante' });
    }

    // 1) ENV kDrive
    const KDRIVE_EMAIL = process.env.KDRIVE_EMAIL;
    const KDRIVE_PASSWORD = process.env.KDRIVE_PASSWORD;
    if (!KDRIVE_EMAIL || !KDRIVE_PASSWORD) {
      return send(res, 500, { success: false, error: 'KDRIVE_EMAIL/KDRIVE_PASSWORD non configurati' });
    }

    // 2) ENV Supabase
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return send(res, 500, { success: false, error: 'SUPABASE_URL o KEY mancanti' });
    }

    // 3) Parametri
    const shareUrl = (req.query.share_url || '').toString().trim();
    const overrideBase = (process.env.KDRIVE_WEBDAV_URL || '').trim();
    const defaultPath = (process.env.KDRIVE_DEFAULT_PATH || '').trim();
    const userPath = (req.query.path || '').toString().trim();
    const rootPath = normalizePath(userPath || defaultPath || '/');

    // 4) Endpoint candidati + Auth Basic
    const candidates = buildWebDavCandidates({ shareUrl, overrideBase });
    const basic = 'Basic ' + Buffer.from(`${KDRIVE_EMAIL}:${KDRIVE_PASSWORD}`).toString('base64');

    // 5) Risolvi baseUrl (con diagnostics auth vs endpoint)
    const resolved = await resolveWebDavBase({ candidates, basic });

    if (!resolved || !resolved.baseUrl) {
      return send(res, 502, {
        success: false,
        error: 'Nessun endpoint WebDAV kDrive ha risposto correttamente',
        tried: resolved?.tried || candidates
      });
    }

    const { baseUrl } = resolved;

    if (resolved.auth === 'fail') {
      // Endpoint ok ma credenziali KO: tipicamente serve app-password se 2FA
      return send(res, 401, {
        success: false,
        error: 'Autenticazione WebDAV fallita (401/403)',
        hint: 'Verifica KDRIVE_EMAIL/KDRIVE_PASSWORD. Se hai 2FA, usa una password applicativa.',
        base_url_used: baseUrl,
        tried: resolved.tried || []
      });
    }

    // 6) PROPFIND (Depth:1) su root + prime sottocartelle
    const rootListing = await propfindList({ baseUrl, path: rootPath, basic, depth: 1 });

    const exts = /\.(pdf|docx?|pptx?|ppt|xlsx?|xls|txt|md|csv)$/i;
    const folders = [];
    const files = [];

    for (const it of rootListing.items) {
      if (it.isCollection) {
        if (it.displayName && it.displayName !== '.' && it.displayName !== '..') {
          folders.push(it.hrefPath);
        }
      } else if (it.displayName && exts.test(it.displayName)) {
        files.push(makeFileRow(it, rootPath));
      }
    }

    // Esplora alcune sottocartelle (limitato)
    const MAX_FOLDERS = 5;
    for (const f of folders.slice(0, MAX_FOLDERS)) {
      const sub = await propfindList({ baseUrl, path: f, basic, depth: 1 });
      for (const it of sub.items) {
        if (!it.isCollection && it.displayName && exts.test(it.displayName)) {
          files.push(makeFileRow({ ...it, folder: f }, rootPath));
        }
      }
    }

    // 7) Stato Supabase (processed/new)
    const checked = await markProcessingStatus(files, { SUPABASE_URL, SUPABASE_KEY });

    // 8) Statistiche e risposta
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
      message: 'Discovery completato',
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

/* ============== HELPERS ============== */

// Entry dei file coerente col frontend
function makeFileRow(it, rootPath) {
  return {
    name: it.displayName,
    extension: (it.displayName.split('.').pop() || '').toLowerCase(),
    size: it.size || 0,
    path: it.hrefPath,
    folder: it.folder || (isSelf(it.hrefPath, rootPath) ? null : rootPath),
    discovered_at: new Date().toISOString(),
    status: 'discovered',
    source: 'kdrive_webdav'
  };
}

// Candidate base URLs: da ENV, dalla share (ID drive), fallback ufficiali
function buildWebDavCandidates({ shareUrl, overrideBase }) {
  const out = [];
  if (overrideBase) out.push(trimSlash(overrideBase));

  // dalla share tipo .../share/1781004/<uuid>
  const m = (shareUrl || '').match(/\/share\/(\d+)\//);
  if (m) {
    const driveId = m[1];
    out.push(`https://${driveId}.connect.kdrive.infomaniak.com`);
    out.push(`https://${driveId}.connect.kdrive.infomaniak.com/webdav`);
    out.push(`https://${driveId}.connect.kdrive.infomaniak.com/dav`);
  }

  // server generici noti
  out.push('https://connect.drive.infomaniak.com');
  out.push('https://connect.drive.infomaniak.com/webdav');
  out.push('https://connect.drive.infomaniak.com/dav');

  // dedup
  return [...new Set(out.map(trimSlash))];
}

// Risolve il primo endpoint che risponde (200/207) o che almeno dà 401/403 (auth KO ma endpoint giusto)
async function resolveWebDavBase({ candidates, basic }) {
  const tried = [];

  for (const baseUrl of candidates) {
    let status = 0, ok = false, auth = 'unknown', note = '';

    // Tentativo PROPFIND depth:0
    try {
      const r = await fetch(baseUrl + '/', {
        method: 'PROPFIND',
        headers: {
          Authorization: basic,
          Depth: '0',
          'Content-Type': 'application/xml'
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
          <d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`
      });
      status = r.status;
      if (status === 200 || status === 207) { ok = true; auth = 'ok'; }
      else if (status === 401 || status === 403) { ok = true; auth = 'fail'; }
    } catch (e) {
      note = e.message || String(e);
    }

    tried.push({ baseUrl, status, auth, ok, note });
    if (ok) return { baseUrl, auth, tried };

    // Fallback: OPTIONS come "ping"
    try {
      const r2 = await fetch(baseUrl + '/', { method: 'OPTIONS', headers: { Authorization: basic } });
      const s2 = r2.status;
      tried.push({ baseUrl, status: s2, auth: (s2 === 401 || s2 === 403) ? 'fail' : 'unknown', ok: s2 >= 200 && s2 < 500, note: 'OPTIONS fallback' });
      if (s2 >= 200 && s2 < 500) return { baseUrl, auth: (s2 === 401 || s2 === 403) ? 'fail' : 'unknown', tried };
    } catch (e2) {
      tried.push({ baseUrl, status: 0, auth: 'unknown', ok: false, note: 'OPTIONS error: ' + (e2.message || e2) });
    }
  }
  return { baseUrl: null, tried };
}

// PROPFIND + parse leggero (regex)
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

    if (isSelf(hrefPath, path)) continue; // salta la directory stessa
    items.push({ displayName, size, isCollection, hrefPath });
  }

  return { items, raw: text };
}

// Stato Supabase (processed/new)
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
    const url = `${trimSlash(SUPABASE_URL)}/rest/v1/documents?file_name=eq.${encodeURIComponent(filename)}&select=id`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${KEY}`, apikey: KEY }
    });
    if (!r.ok) return 'unknown';
    const data = await r.json();
    return Array.isArray(data) && data.length > 0 ? 'processed' : 'new';
  } catch {
    return 'unknown';
  }
}

/* ============== STRINGS / PATH UTILS ============== */
function pick1(str, rx) { const m = str.match(rx); return m ? m[1] : ''; }

function tryDecodeHref(href) {
  try { const u = new URL(href, 'http://x'); return decodeURIComponent(u.pathname || '/'); }
  catch { try { return decodeURIComponent(href); } catch { return href; } }
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

function trimSlash(s) { return s.replace(/\/+$/, ''); }

// pages/api/sync/discover-share.js
// Scopre i file partendo SOLO dalla pagina pubblica della share kDrive (no login, no WebDAV)

function send(res, code, payload) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(code).json(payload);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, {});
  if (req.method !== 'GET') return send(res, 405, { success:false, error:'Method not allowed' });

  try {
    const shareUrl = (req.query.share_url || '').toString().trim();
    if (!shareUrl.startsWith('http')) {
      return send(res, 400, { success:false, error:'Parametro share_url mancante o invalido' });
    }

    // scarica l’HTML della share pubblica
    const htmlRes = await fetch(shareUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Virgilio-Share-Discover/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    const html = await htmlRes.text();

    // estensioni interessanti
    const extRx = /\.(pdf|docx?|pptx?|ppt|xlsx?|xls|txt|md|csv)$/i;

    // 1) prova a pescare JSON in script "nuxt/next" (molte app lo fanno)
    const jsonCandidates = [];
    const scriptRx = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let sm;
    while ((sm = scriptRx.exec(html)) !== null) {
      const body = sm[1] || '';
      if (body.length > 50 && /[{[]/.test(body) && /files|items|name|download/i.test(body)) {
        jsonCandidates.push(body);
      }
    }

    const found = new Map(); // name -> {name, url?}
    function push(name, url) {
      if (!name || !extRx.test(name)) return;
      if (!found.has(name)) found.set(name, { name, url: url || null });
    }

    // 1a) estrai da JSON grezzi eventuali file
    for (const raw of jsonCandidates) {
      try {
        // ripulisci eventuale assegnazione tipo "window.__STATE__ = {...}"
        const jsonStr = raw.replace(/^[^[{]*([{\[].*[\]}])[^]*$/s, '$1');
        const obj = JSON.parse(jsonStr);
        scanObjectForFiles(obj, push);
      } catch (_) { /* ignore */ }
    }

    // 2) Heuristic: link <a href="..."> che sembrano file scaricabili
    const anchorRx = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]{1,120})<\/a>/gi;
    let am;
    while ((am = anchorRx.exec(html)) !== null) {
      const href = am[1];
      const label = (am[2] || '').trim();
      if (extRx.test(href)) push(tailName(href), absolutize(shareUrl, href));
      if (extRx.test(label)) push(label, absolutize(shareUrl, href));
    }

    // 3) Heuristic: data-url / data-download / src=...
    const dataRx = /\s(?:data-url|data-download-url|src|content|href)=["']([^"']+)["']/gi;
    let dm;
    while ((dm = dataRx.exec(html)) !== null) {
      const u = dm[1];
      if (extRx.test(u)) push(tailName(u), absolutize(shareUrl, u));
    }

    const files = Array.from(found.values());
    return send(res, 200, {
      success: true,
      message: `Trovati ${files.length} file (dal link pubblico)`,
      files,
      statistics: {
        total_discovered: files.length,
        discovery_method: 'share_public_html'
      },
      timestamp: new Date().toISOString()
    });

  } catch (e) {
    return send(res, 500, { success:false, error:'Errore discover share', message: e.message });
  }
}

/* === helpers === */

function scanObjectForFiles(obj, onFile) {
  // ricorsivo: cerca chiavi/valori che assomigliano a file
  if (Array.isArray(obj)) {
    for (const v of obj) scanObjectForFiles(v, onFile);
    return;
  }
  if (obj && typeof obj === 'object') {
    // pattern comuni
    const name = obj.name || obj.filename || obj.fileName || obj.title;
    const url = obj.url || obj.downloadUrl || obj.href;
    if (name && (typeof name === 'string')) {
      onFile(name, typeof url === 'string' ? url : null);
    }
    for (const k of Object.keys(obj)) scanObjectForFiles(obj[k], onFile);
  }
}

function tailName(u) {
  try { const p = new URL(u, 'http://x'); return decodeURIComponent((p.pathname.split('/').pop() || '').split('?')[0]); }
  catch { return decodeURIComponent(u.split('/').pop() || ''); }
}

function absolutize(base, maybe) {
  try {
    if (/^https?:\/\//i.test(maybe)) return maybe;
    if (maybe.startsWith('//')) return 'https:' + maybe;
    if (maybe.startsWith('/')) {
      const b = new URL(base);
      return `${b.protocol}//${b.host}${maybe}`;
    }
    return base.replace(/\/+$/, '') + '/' + maybe.replace(/^\/+/, '');
  } catch { return maybe; }
}

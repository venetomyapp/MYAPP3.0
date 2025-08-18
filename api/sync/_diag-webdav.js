function send(res, code, payload) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(code).json(payload);
}
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, {});
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'Method not allowed' });

  const email = process.env.KDRIVE_EMAIL || '';
  const pass  = process.env.KDRIVE_PASSWORD || '';
  const overrideBase = (process.env.KDRIVE_WEBDAV_URL || '').trim();
  const shareUrl = (req.query.share_url || '').toString();

  if (!email || !pass) return send(res, 500, { ok: false, error: 'KDRIVE_EMAIL/KDRIVE_PASSWORD mancanti' });

  const candidates = buildCandidates(shareUrl, overrideBase);
  const basic = 'Basic ' + Buffer.from(`${email}:${pass}`).toString('base64');
  const tried = [];
  for (const baseUrl of candidates) {
    try {
      const r = await fetch(baseUrl + '/', {
        method: 'PROPFIND',
        headers: { Authorization: basic, Depth: '0', 'Content-Type': 'application/xml' },
        body: `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`
      });
      tried.push({ baseUrl, method: 'PROPFIND', status: r.status });
    } catch (e) {
      tried.push({ baseUrl, method: 'PROPFIND', status: 0, note: e.message || String(e) });
    }
  }
  return send(res, 200, {
    ok: true,
    email_masked: email.replace(/(.{2}).+(@.+)/, '$1***$2'),
    pass_len: pass.length,
    candidates,
    tried
  });
}
function buildCandidates(shareUrl, overrideBase) {
  const out = [];
  if (overrideBase) out.push(trim(overrideBase));
  const m = (shareUrl || '').match(/\/share\/(\d+)\//);
  if (m) {
    const id = m[1];
    out.push(`https://${id}.connect.kdrive.infomaniak.com`);
    out.push(`https://${id}.connect.kdrive.infomaniak.com/webdav`);
    out.push(`https://${id}.connect.kdrive.infomaniak.com/dav`);
  }
  out.push('https://connect.drive.infomaniak.com');
  out.push('https://connect.drive.infomaniak.com/webdav');
  out.push('https://connect.drive.infomaniak.com/dav');
  return [...new Set(out.map(trim))];
}
const trim = s => s.replace(/\/+$/, '');

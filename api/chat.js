// api/chat.js — DIAGNOSTICO: verifica JWT come /api/whoami e risponde "pong"
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  const debug = { step: 'start' };

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env vars', debug });
  }

  try {
    const auth = req.headers.authorization || '';
    debug.hasAuthHeader = auth.startsWith('Bearer ');
    if (!debug.hasAuthHeader) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header', debug });
    }

    const vr = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY }
    });
    debug.supabaseStatus = vr.status;
    debug.supabaseBody = (await vr.text()).slice(0, 200);

    if (vr.status !== 200) {
      return res.status(401).json({ error: 'Invalid or expired token', debug });
    }

    // OK: rispondi nel formato che si aspetta il tuo client
    return res.status(200).json({
      id: 'diag',
      choices: [{ index: 0, message: { role: 'assistant', content: 'pong ✅' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      web_search_performed: false,
      debug
    });
  } catch (e) {
    debug.exception = String(e);
    return res.status(500).json({ error: 'Internal server error', debug });
  }
}

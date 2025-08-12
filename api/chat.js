// api/chat.js — verifica token Supabase e inoltra a OpenAI
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing Supabase env vars' });
  }
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing OPENAI_API_KEY' });
  }

  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    // 1) Verifica JWT con Supabase (stessa chiamata di /api/whoami)
    const vr = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY }
    });
    if (vr.status !== 200) {
      const detail = await vr.text().catch(()=> '');
      return res.status(401).json({ error: 'Invalid or expired token', detail: detail.slice(0,200) });
    }

    // 2) Legge il body dal client
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      messages = [],
      model = 'gpt-4o-mini',
      max_tokens = 500,
      temperature = 0.7,
      system_context
    } = body;

    const chatMessages = [];
    if (system_context) chatMessages.push({ role: 'system', content: system_context });
    for (const m of Array.isArray(messages) ? messages : []) {
      if (m?.role && m?.content) chatMessages.push({ role: m.role, content: m.content });
    }

    // 3) Richiesta a OpenAI
    const oa = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: chatMessages, temperature, max_tokens })
    });

    if (!oa.ok) {
      const txt = await oa.text().catch(()=>'');
      return res.status(oa.status).json({ error: `OpenAI error: ${txt || oa.statusText}` });
    }

    const data = await oa.json();
    // 4) Risponde nel formato atteso dal frontend
    return res.status(200).json({ ...data, web_search_performed: false });
  } catch (e) {
    console.error('API /api/chat error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

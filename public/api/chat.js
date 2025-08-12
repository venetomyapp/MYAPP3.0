// api/chat.js — Vercel Serverless Function (Node runtime)
// Verifica token Supabase + chiama OpenAI e restituisce compatibile col tuo client

const SUPABASE_URL = process.env.SUPABASE_URL;          // es: https://pvzdilkozpspsnepedqc.supabase.co
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req, res) {
  // CORS "amichevole" (same-origin non lo richiede, ma non fa danni)
  const origin = req.headers.origin || '';
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1) Verifica header Authorization
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    // 2) Verifica il token con Supabase (senza librerie: chiamiamo /auth/v1/user)
    const vr = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY }
    });

    if (vr.status !== 200) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // const user = await vr.json(); // se ti serve

    // 3) Leggi il body dal client
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      messages = [],
      model = 'gpt-4o-mini',
      max_tokens = 500,
      temperature = 0.7,
      system_context
    } = body;

    // Prepara i messaggi in formato OpenAI
    const chatMessages = [];
    if (system_context) {
      chatMessages.push({ role: 'system', content: system_context });
    }
    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (m && m.role && m.content) chatMessages.push({ role: m.role, content: m.content });
      }
    }

    // 4) Chiama OpenAI
    const oa = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        temperature,
        max_tokens
      })
    });

    if (!oa.ok) {
      const txt = await oa.text().catch(() => '');
      return res.status(oa.status).json({ error: `OpenAI error: ${txt || oa.statusText}` });
    }

    const data = await oa.json();

    // 5) Rispondi al client *nello stesso formato* che il tuo HTML si aspetta
    // data ha già "choices[0].message.content" e "usage" come vuole il tuo client.
    return res.status(200).json({
      ...data,
      web_search_performed: false  // il tuo client lo gestisce già come opzionale
    });

  } catch (e) {
    console.error('API /api/chat error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

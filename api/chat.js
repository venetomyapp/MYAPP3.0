// api/chat.js — Vercel Serverless Function (Node runtime)
const UPSTREAM = 'https://myapp-chatbot-server.onrender.com/api/chat';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    });

    const ct = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).setHeader('Content-Type', ct).send(buf);
  } catch (e) {
    console.error('Proxy error:', e);
    res.status(502).json({ error: 'Upstream unavailable' });
  }
}

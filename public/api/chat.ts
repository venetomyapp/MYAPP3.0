// api/chat.ts — Vercel Serverless Function (Node runtime)
// Proxy verso Render per evitare CORS e rispondere a /api/chat

import type { VercelRequest, VercelResponse } from '@vercel/node';

const UPSTREAM = 'https://myapp-chatbot-server.onrender.com/api/chat';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS (in same-origin non serve, ma è innocuo e utile se testerai da altri domini)
  const origin = (req.headers.origin as string) || '';
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
        // gira il Bearer di Supabase all'upstream
        'Authorization': (req.headers['authorization'] as string) || ''
      },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    });

    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    const buf = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status).setHeader('Content-Type', contentType).send(buf);
  } catch (e) {
    console.error('Proxy error:', e);
    res.status(502).json({ error: 'Upstream unavailable' });
  }
}

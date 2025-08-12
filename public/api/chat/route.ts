// api/chat/route.ts  — Vercel Edge Function stile "route.ts"
// Proxy verso Render per evitare CORS

export const config = { runtime: 'edge' }; // va bene Edge; se preferisci Node, dimmelo

const UPSTREAM = 'https://myapp-chatbot-server.onrender.com/api/chat';

export async function POST(request: Request) {
  try {
    // pass-through del body senza doppio parse
    const body = await request.text();

    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // gira l'Authorization di Supabase così com'è
        'Authorization': request.headers.get('authorization') ?? ''
      },
      body
    });

    // inoltra status + content-type + body (anche stream)
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8'
      }
    });
  } catch (e) {
    console.error('Proxy error:', e);
    return new Response(JSON.stringify({ error: 'Upstream unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

export async function OPTIONS() {
  // non serve per same-origin, ma rispondiamo pulito
  return new Response(null, { status: 200 });
}

// api/chat.js — Chat + Web Search (Tavily) con citazioni
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// Util: limita stringhe
const truncate = (s, n) => (s && s.length > n ? s.slice(0, n) + "…" : s || "");

export default async function handler(req, res) {
  // CORS base
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ENV check
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Server misconfigured: missing Supabase env vars" });
  }
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Server misconfigured: missing OPENAI_API_KEY" });
  }

  try {
    // 0) Auth
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const vr = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY },
    });
    if (vr.status !== 200) {
      const detail = await vr.text().catch(() => "");
      return res.status(401).json({ error: "Invalid or expired token", detail: detail.slice(0, 200) });
    }

    // 1) Body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const {
      messages = [],
      model = "gpt-4o-mini",
      max_tokens = 500,
      temperature = 0.7,
      system_context,
      enable_web_search = false,
      web_search_query = null,
    } = body;

    // 2) Costruisci il prompt base
    const chatMessages = [];
    if (system_context) chatMessages.push({ role: "system", content: system_context });

    // 3) (Opzionale) Web Search via Tavily
    let sources = [];
    let contextChunks = [];
    let webSearchDone = false;

    if (enable_web_search && TAVILY_API_KEY) {
      const userQuery =
        (typeof web_search_query === "string" && web_search_query.trim()) ||
        // fallback: ultimo messaggio dell’utente
        [...messages].reverse().find((m) => m?.role === "user")?.content ||
        "";

      if (userQuery) {
        try {
          const tavilyResp = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: TAVILY_API_KEY,
              query: userQuery,
              search_depth: "advanced",
              include_answer: false,
              max_results: 5,
            }),
          });

          if (tavilyResp.ok) {
            const tjson = await tavilyResp.json();
            const results = Array.isArray(tjson.results) ? tjson.results : [];
            // prendi i migliori 3
            sources = results.slice(0, 3).map((r, i) => ({
              idx: i + 1,
              title: truncate(r.title, 120),
              url: r.url,
              content: truncate(r.content, 3000),
            }));
            contextChunks = sources.map(
              (s) => `[${s.idx}] ${s.title}\nURL: ${s.url}\nEstratto:\n${s.content}\n`
            );
            webSearchDone = sources.length > 0;
          }
        } catch (_) {
          // se la ricerca fallisce, prosegui senza bloccare la chat
        }
      }
    }

    // 4) Prompt per OpenAI (se abbiamo contesto, lo alleghiamo)
    if (webSearchDone && contextChunks.length) {
      chatMessages.push({
        role: "system",
        content:
          "Hai a disposizione delle fonti web aggiornate. Usa solo queste per rispondere. " +
          "Cita in linea come [1], [2], ecc. quando usi un fatto. Se una risposta non è nelle fonti, dillo chiaramente.",
      });
      chatMessages.push({
        role: "system",
        content: "FONTI:\n" + contextChunks.join("\n---\n"),
      });
    }

    // Aggiungi la cronologia del client
    for (const m of Array.isArray(messages) ? messages : []) {
      if (m?.role && m?.content) chatMessages.push({ role: m.role, content: m.content });
    }

    // 5) Chiamata a OpenAI
    const oa = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: chatMessages, temperature, max_tokens }),
    });

    if (!oa.ok) {
      const txt = await oa.text().catch(() => "");
      return res.status(oa.status).json({ error: `OpenAI error: ${txt || oa.statusText}` });
    }

    const data = await oa.json();

    // 6) Se abbiamo fatto web search, aggiungi elenco fonti in coda al testo
    if (webSearchDone && data?.choices?.[0]?.message?.content) {
      const refs =
        sources.length > 0
          ? "\n\nFonti:\n" + sources.map((s) => `[${s.idx}] ${s.title} — ${s.url}`).join("\n")
          : "";
      data.choices[0].message.content += refs;
    }

    return res.status(200).json({
      ...data,
      web_search_performed: webSearchDone,
    });
  } catch (e) {
    console.error("API /api/chat error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}

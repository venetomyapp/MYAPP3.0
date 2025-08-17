// /api/chat.js — versione stabile senza doc-search (nessun import extra)
// Requisiti ENV: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY
export default async function handler(req, res) {
  // CORS
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: "Server misconfigured (Supabase ENV missing)" });
    }
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Server misconfigured (OPENAI_API_KEY missing)" });
    }

    // Autenticazione Supabase
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const vr = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY }
    });
    if (vr.status !== 200) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Parse body sicuro
    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const {
      messages = [],
      model = "gpt-4o-mini",
      max_tokens = 650,
      temperature = 0.3,
      system_context = null,
      // qualunque flag doc-search viene ignorato completamente in questa versione
    } = body;

    // Prompt minimale ma robusto
    const systemPreamble =
      "Sei un assistente virtuale professionale per il personale dell’Arma dei Carabinieri e il Sindacato. " +
      "Rispondi in italiano, chiaro e istituzionale. Non fornire consulenza legale individuale. " +
      "Cita fonti ufficiali quando possibile. Se l’informazione non è nelle fonti, indicalo e rimanda al dirigente competente.";

    const chat = [{ role: "system", content: systemPreamble }];
    if (system_context) chat.push({ role: "system", content: system_context });
    for (const m of Array.isArray(messages) ? messages : []) {
      if (m?.role && m?.content) chat.push({ role: m.role, content: m.content });
    }

    // Chiamata OpenAI
    const oa = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: chat, temperature, max_tokens })
    });

    if (!oa.ok) {
      const txt = await oa.text().catch(() => "");
      return res.status(oa.status).json({ error: "OpenAI error", detail: txt || oa.statusText });
    }

    const data = await oa.json();
    return res.status(200).json(data);
  } catch (e) {
    console.error("API /api/chat fatal:", e);
    return res.status(500).json({ error: "Internal server error", detail: String(e?.message || e) });
  }
}

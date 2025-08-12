// api/chat.js — Chat con Web Search “guidata” per fonti istituzionali IT (2023–2025)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

const truncate = (s, n) => (s && s.length > n ? s.slice(0, n) + "…" : s || "");

// Domini prioritari/istituzionali
const GOOD_DOMAINS = [
  // Istituzionali primari
  "carabinieri.it", "difesa.it", "gazzettaufficiale.it", "giustizia.it", "governo.it",
  "interno.gov.it", "funzionepubblica.gov.it", "aranagenzia.it", "mef.gov.it",
  "noipa.mef.gov.it", "inps.it", "normattiva.it", "senato.it", "camera.it",
  "poliziadistato.it", "questure.poliziadistato.it",
  // Giuridiche specializzate
  "altalex.com", "diritto.it", "giuristidemocratici.it", "cortedicassazione.it", "consigliodistato.it"
];

// Parole chiave “di contesto” e di autorevolezza
const MUST_HAVE = ["carabinieri", "militare", "regolamento", "normativa", "ufficiale"];
const IT_KEYWORDS = [
  "contratto", "rinnovo", "contrattazione", "ccnl", "comparto sicurezza", "difesa",
  "aumenti", "2025", "2024", "2023", "decreto legislativo", "circolare ministeriale",
  "regolamento ufficiale", "gazzetta ufficiale", "normativa vigente"
];

// Esclusioni “rumore”
const EXCLUDE_DOMAINS = [
  "wikipedia.org", "britannica.com", "facebook.com", "x.com", "twitter.com",
  "instagram.com", "linkedin.com", "youtube.com", "tiktok.com"
];

// Preferenza formati
const PREFERRED_FILE_EXT = [".pdf", ".doc", ".docx"];

// Scoring euristico per ranking
function scoreResult(r) {
  const url = (r.url || "").toLowerCase();
  const title = (r.title || "").toLowerCase();
  const content = (r.content || "").toLowerCase();
  let score = 0;

  // Domini buoni
  if (GOOD_DOMAINS.some(d => url.includes(d))) score += 10;

  // Parole chiave autorità
  for (const k of IT_KEYWORDS) if ((title + " " + content).includes(k)) score += 2;

  // MUST_HAVE (rafforza il contesto militare)
  for (const k of MUST_HAVE) if ((title + " " + content).includes(k)) score += 1;

  // Preferenza PDF/DOC
  if (PREFERRED_FILE_EXT.some(ext => url.endsWith(ext))) score += 3;

  // Penalizza domini esclusi
  if (EXCLUDE_DOMAINS.some(d => url.includes(d))) score -= 6;

  // Boost “recency” (grossolano se manca una data strutturata)
  if (/(2025|2024|2023)/.test(title + " " + content)) score += 2;

  return score;
}

// Query builder in IT con filtri, range anni e pattern specializzati
function buildQueries(userQueryRaw = "") {
  const base = userQueryRaw.trim();

  // template comuni (derivati dai tuoi esempi)
  const templates = [
    // Disciplina militare
    `"disciplina militare" OR "codice ordinamento militare" filetype:pdf`,
    // Regolamento generale & art. 398
    `"regolamento generale arma carabinieri" ("articolo 398" OR "art. 398" OR trasferimento)`,
    // Licenze/permessi d'arma
    `("licenze armi" OR "permessi porto armi") carabinieri normativa`,
    // Congedo maternità personale militare
    `("congedo maternità" OR "lavoratrici madri") "personale militare" carabinieri`
  ];

  // Domini ammessi come OR
  const sites = [
    "site:carabinieri.it", "site:difesa.it", "site:gazzettaufficiale.it", "site:giustizia.it", "site:governo.it",
    "site:interno.gov.it", "site:funzionepubblica.gov.it", "site:aranagenzia.it", "site:mef.gov.it",
    "site:noipa.mef.gov.it", "site:inps.it", "site:normattiva.it", "site:senato.it", "site:camera.it",
    "site:poliziadistato.it", "site:questure.poliziadistato.it",
    "site:altalex.com", "site:diritto.it", "site:giuristidemocratici.it", "site:cortedicassazione.it", "site:consigliodistato.it"
  ].join(" OR ");

  // filtri negativi
  const negatives = `-site:wikipedia.org -site:forum.* -site:blog.* -site:social.*`;

  // preferenza formati e range anni
  const formats = `(filetype:pdf OR filetype:doc OR filetype:docx)`;
  const years = `2023..2025`;

  const always = MUST_HAVE.join(" ");

  const baseBoosted = `(${base}) ${always} (${sites}) ${formats} ${negatives} ${years}`;
  const specialty = templates.map(t => `(${t}) ${always} (${sites}) ${formats} ${negatives} ${years}`);

  // Fallback “neutro” ma focalizzato Italia/comparto sicurezza
  const fallback = `Italia Carabinieri contratto rinnovo "comparto sicurezza" difesa ${always} (${sites}) ${formats} ${negatives} ${years}`;

  return [baseBoosted, ...specialty, fallback];
}

async function tavilySearch(query) {
  // Tavily ignora campi non supportati senza errore: includiamo include_domains + depth
  const resp = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      include_answer: false,
      max_results: 10,
      include_domains: GOOD_DOMAINS
    })
  });
  if (!resp.ok) return [];
  const json = await resp.json();
  return Array.isArray(json.results) ? json.results : [];
}

function selectTopSources(results, k = 3) {
  // filtra per keyword minime e rimuovi esclusi
  const cleaned = results.filter(r => {
    const u = (r.url || "").toLowerCase();
    if (EXCLUDE_DOMAINS.some(d => u.includes(d))) return false;
    const txt = ((r.title || "") + " " + (r.content || "")).toLowerCase();
    return MUST_HAVE.some(m => txt.includes(m)) || IT_KEYWORDS.some(m => txt.includes(m));
  });

  // rank per punteggio
  const ranked = (cleaned.length ? cleaned : results)
    .map(r => ({ ...r, __score: scoreResult(r) }))
    .sort((a, b) => b.__score - a.__score);

  return ranked.slice(0, k).map((r, i) => ({
    idx: i + 1,
    title: truncate(r.title, 160),
    url: r.url,
    content: truncate(r.content, 4000)
  }));
}

export default async function handler(req, res) {
  // CORS base
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Env check
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Server misconfigured: missing Supabase env vars" });
  }
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Server misconfigured: missing OPENAI_API_KEY" });
  }

  try {
    // Auth Supabase (come /api/whoami)
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "Missing or invalid Authorization header" });

    const vr = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY }
    });
    if (vr.status !== 200) return res.status(401).json({ error: "Invalid or expired token" });

    // Body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const {
      messages = [],
      model = "gpt-4o-mini",
      max_tokens = 600,
      temperature = 0.4,
      system_context,
      enable_web_search = false,
      web_search_query = null
    } = body;

    // Prompt iniziale
    const chatMessages = [];
    if (system_context) chatMessages.push({ role: "system", content: system_context });

    // ====== Ricerca web “guidata” ======
    let sources = [];
    let webSearchDone = false;

    if (enable_web_search && TAVILY_API_KEY) {
      const lastUser = [...messages].reverse().find(m => m?.role === "user")?.content || "";
      const raw = (typeof web_search_query === "string" && web_search_query.trim()) || lastUser;
      const queries = buildQueries(raw);

      // Prova in sequenza finché non troviamo 2-3 fonti buone
      for (const q of queries) {
        const results = await tavilySearch(q);
        const top = selectTopSources(results, 3);
        if (top.length >= 2) { // chiedi almeno 2 conferme
          sources = top;
          webSearchDone = true;
          break;
        }
      }
    }

    // Se abbiamo fonti, aggiungi contesto e istruzioni
    if (webSearchDone && sources.length) {
      const context = sources
        .map(s => `[${s.idx}] ${s.title}\nURL: ${s.url}\nEstratto:\n${s.content}\n`)
        .join("\n---\n");

      chatMessages.push({
        role: "system",
        content:
          "Usa solo le fonti fornite (istituzionali/giuridiche italiane). " +
          "Cita sempre i fatti come [1], [2], [3]. Se una cosa non è nelle fonti, dichiaralo esplicitamente."
      });
      chatMessages.push({ role: "system", content: "FONTI:\n" + context });
    }

    // Aggiungi cronologia utente/assistant
    for (const m of Array.isArray(messages) ? messages : []) {
      if (m?.role && m?.content) chatMessages.push({ role: m.role, content: m.content });
    }

    // OpenAI
    const oa = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: chatMessages, temperature, max_tokens })
    });

    if (!oa.ok) {
      const txt = await oa.text().catch(() => "");
      return res.status(oa.status).json({ error: `OpenAI error: ${txt || oa.statusText}` });
    }

    const data = await oa.json();

    // Append elenco fonti in coda
    if (webSearchDone && data?.choices?.[0]?.message?.content) {
      const refs = "\n\nFonti:\n" + sources.map(s => `[${s.idx}] ${s.title} — ${s.url}`).join("\n");
      data.choices[0].message.content += refs;
    }

    return res.status(200).json({ ...data, web_search_performed: webSearchDone });
  } catch (e) {
    console.error("API /api/chat error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}

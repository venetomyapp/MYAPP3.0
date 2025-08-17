// api/chat.js — Chat “guidata” con fonti ufficiali + web search istituzionale
// Requisiti ENV: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY, (opz.) TAVILY_API_KEY

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

const CONTACT_LINK = "https://myapp31.vercel.app/richieste.html";

const truncate = (s, n) => (s && s.length > n ? s.slice(0, n) + "…" : s || "");

// ————— FONTI PINNATE (ufficiali) —————
const PINNED = {
  disciplina: [
    { title: "Guida Tecnica — Procedure disciplinari (2023) — Difesa", url: "https://www.difesa.it/assets/allegati/6105/06_guida_tecnica_disciplina_anno_2023.pdf" }
  ],
  com: [
    { title: "COM — Supplemento al n.3 — Carabinieri", url: "https://www.carabinieri.it/docs/default-source/default-document-library/supplemento-al-n-3.pdf?sfvrsn=811b6d23_0" }
  ],
  tuom: [
    { title: "Normativa Difesa — TUOM (sezione normativa)", url: "https://www.difesa.it" }
  ],
  leggi: [
    { title: "Gazzetta Ufficiale", url: "https://www.gazzettaufficiale.it" }
  ],
  tulps: [
    { title: "Ministero dell’Interno — Normativa", url: "https://www.interno.gov.it" }
  ],
  cds: [
    { title: "MIT — Portale normativo (Codice della Strada)", url: "https://www.mit.gov.it" }
  ],
  civile: [
    { title: "Ministero della Giustizia — Codici", url: "https://www.giustizia.it" }
  ],
  regolamento_generale: [
    { title: "Arma dei Carabinieri — Sito istituzionale", url: "https://www.carabinieri.it" }
  ],
  regolamento_organico: [
    { title: "Arma dei Carabinieri — Documenti ufficiali", url: "https://www.carabinieri.it" }
  ],
  concorsi: [
    { title: "Arma — Area Concorsi", url: "https://www.carabinieri.it/concorsi/area-concorsi" },
    { title: "Extranet Arma — Domande online", url: "https://extranet.carabinieri.it/concorsionline20" },
    { title: "INPA — Portale reclutamento", url: "https://www.inpa.gov.it" },
    { title: "Concorsi Difesa", url: "https://concorsi.difesa.it" },
    { title: "Gazzetta Ufficiale — Concorsi", url: "https://www.gazzettaufficiale.it" }
  ]
};

// ————— Domini affidabili per web-search —————
const GOOD_DOMAINS = [
  "carabinieri.it","difesa.it","gazzettaufficiale.it","giustizia.it","governo.it",
  "interno.gov.it","funzionepubblica.gov.it","aranagenzia.it","mef.gov.it",
  "noipa.mef.gov.it","inps.it","normattiva.it","senato.it","camera.it",
  "mit.gov.it","poliziadistato.it","questure.poliziadistato.it",
  "inpa.gov.it","concorsi.difesa.it"
];

const EXCLUDE_DOMAINS = ["wikipedia.org","britannica.com","facebook.com","x.com","twitter.com","instagram.com","linkedin.com","youtube.com","tiktok.com"];
const PREFERRED_FILE_EXT = [".pdf",".doc",".docx"];

function scoreWebResult(r) {
  const u = (r.url||"").toLowerCase();
  const t = (r.title||"").toLowerCase();
  const c = (r.content||"").toLowerCase();
  let s = 0;
  if (GOOD_DOMAINS.some(d => u.includes(d))) s += 8;
  if (PREFERRED_FILE_EXT.some(ext => u.endsWith(ext))) s += 3;
  if (/(2025|2024|2023)/.test(t + " " + c)) s += 2;
  if (EXCLUDE_DOMAINS.some(d => u.includes(d))) s -= 6;
  return s;
}

function detectTopic(q) {
  const x = (q||"").toLowerCase();
  if (/dirigent[ei]|regionale|provinciale/.test(x)) return "dirigenti";
  if (/disciplina|sanzion/i.test(x)) return "disciplina";
  if (/\bcom\b|ordinamento\s+militar/i.test(x)) return "com";
  if (/tuom|testo\s+unico\s+(dell'|dell’)?ordinamento/i.test(x)) return "tuom";
  if (/gazzetta|legge|decreto|normattiva/i.test(x)) return "leggi";
  if (/tulps|pubblica\s+sicurezza|porto\s+armi/i.test(x)) return "tulps";
  if (/codice\s+della\s+strada|cds\b/i.test(x)) return "cds";
  if (/codice\s+civile|civile\b/.test(x)) return "civile";
  if (/regolamento\s+generale/i.test(x)) return "regolamento_generale";
  if (/regolamento\s+organico/i.test(x)) return "regolamento_organico";
  if (/concors/i.test(x)) return "concorsi";
  if (/licenz|istanza|pratica|permess/i.test(x)) return "licenze_istanze";
  return "generico";
}

function pinnedForTopic(topic) {
  return PINNED[topic] || [];
}

async function tavilySearch(query) {
  if (!TAVILY_API_KEY) return [];
  const resp = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      include_answer: false,
      max_results: 8,
      include_domains: GOOD_DOMAINS
    })
  });
  if (!resp.ok) return [];
  const j = await resp.json();
  const results = Array.isArray(j.results) ? j.results : [];
  const cleaned = results.filter(r => !EXCLUDE_DOMAINS.some(d => (r.url||"").toLowerCase().includes(d)));
  const ranked = cleaned.map(r => ({...r, __s: scoreWebResult(r)})).sort((a,b)=>b.__s-a.__s);
  return ranked.slice(0,3).map((r,i)=>({
    idx: i+1,
    title: truncate(r.title, 160),
    url: r.url,
    content: truncate(r.content, 3800)
  }));
}

function buildSystemPreamble(topic) {
  // Stile & responsabilità come da tue linee guida
  const base =
    "Sei un assistente virtuale professionale per il personale dell’Arma dei Carabinieri e il Sindacato. " +
    "Rispondi in italiano, con tono chiaro e istituzionale. Non fornire consulenza legale individuale. " +
    "Cita sempre le fonti ufficiali disponibili usando riferimenti [1][2][3]. " +
    "Se l’informazione non è nelle fonti, indicalo e rimanda al dirigente competente.\n\n";

  const dirigentiNote =
    "Se l’utente chiede contatti dei dirigenti, prima chiedi: (a) livello (regionale/provinciale); " +
    "(b) se provinciale, la provincia. L’elenco dirigenti è gestito internamente dal sistema.\n\n";

  let ambiti = 
    "Ambiti e fonti ufficiali principali: Disciplina Militare (Difesa), COM (Carabinieri), TUOM (Difesa), " +
    "Leggi su Gazzetta Ufficiale, TULPS (Interno), Codice della Strada (MIT), Codice Civile (Giustizia), " +
    "Regolamenti Carabinieri (sito Arma), Concorsi (Carabinieri/Extranet/INPA/Difesa/GU).";

  return base + dirigentiNote + ambiti;
}

function closingForLicenzeIstanze() {
  return (
    `\n\nPuoi verificare tutti i dettagli consultando direttamente la fonte ufficiale indicata. ` +
    `Per questa pratica ti consiglio di contattare il dirigente di zona: specifica se regionale o provinciale e di quale provincia. ` +
    `Puoi inviare subito la tua richiesta tramite questo link: ${CONTACT_LINK}\n\n` +
    `Per problemi in dettaglio contatta il tuo dirigente di zona.`
  );
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(500).json({ error:"Server misconfigured (Supabase)" });
  if (!OPENAI_API_KEY) return res.status(500).json({ error:"Server misconfigured (OPENAI_API_KEY)" });

  try {
    // Verifica token Supabase (come /api/whoami)
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return res.status(401).json({ error:"Missing or invalid Authorization header" });

    const vr = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY }
    });
    if (vr.status !== 200) return res.status(401).json({ error:"Invalid or expired token" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const {
      messages = [],
      model = "gpt-4o-mini",
      max_tokens = 650,
      temperature = 0.3,
      system_context = null,
      enable_web_search = true,             // di default ON, si può spegnere dal client
      web_search_query = null
    } = body;

    // Prepara prompt
    const chat = [];
    const lastUser = [...messages].reverse().find(m => m?.role === "user")?.content || "";
    const topic = detectTopic(lastUser || web_search_query || "");
    const preamble = buildSystemPreamble(topic);
    chat.push({ role: "system", content: preamble });
    if (system_context) chat.push({ role:"system", content: system_context });

    // Inserisci fonti pinned per il topic
    const pinned = pinnedForTopic(topic);
    let sources = [];
    if (pinned.length) {
      const ctx = pinned.map((s,i)=>`[${i+1}] ${s.title}\nURL: ${s.url}`).join("\n");
      chat.push({
        role: "system",
        content:
          "FONTI PINNATE (ufficiali, da usare come prioritarie):\n" + ctx +
          "\n\nUsa queste fonti dove pertinenti e cita con [1][2][3]."
      });
      // aggiungi anche come array per stampare in coda
      sources = pinned.map((s,i)=>({ idx:i+1, title:s.title, url:s.url, content:"" }));
    }

    // Web search istituzionale (se abilitata)
    let web_search_performed = false;
    if (enable_web_search && TAVILY_API_KEY) {
      const raw = (typeof web_search_query === "string" && web_search_query.trim()) || lastUser;
      // Query arricchita per Italia/comparto sicurezza e formati preferiti
      const enriched = `${raw} Italia carabinieri normativa ufficiale 2023..2025 filetype:pdf OR filetype:doc OR filetype:docx`;
      const web = await tavilySearch(enriched);
      if (web.length) {
        web_search_performed = true;
        const offset = sources.length;
        web.forEach((w, i) => sources.push({ ...w, idx: offset + i + 1 }));
        const webCtx = web
          .map(s => `[${s.idx}] ${s.title}\nURL: ${s.url}\nEstratto:\n${s.content}`)
          .join("\n---\n");
        chat.push({
          role: "system",
          content:
            "FONTI WEB (istituzionali filtrate):\n" + webCtx +
            "\n\nCita fatti con [ref] coerenti."
        });
      }
    }

    // Cronologia utente/assistant
    for (const m of Array.isArray(messages) ? messages : []) {
      if (m?.role && m?.content) chat.push({ role: m.role, content: m.content });
    }

    // OpenAI
    const oa = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type":"application/json" },
      body: JSON.stringify({ model, messages: chat, temperature, max_tokens })
    });

    if (!oa.ok) {
      const txt = await oa.text().catch(()=> "");
      return res.status(oa.status).json({ error: `OpenAI error: ${txt || oa.statusText}` });
    }
    const data = await oa.json();

    // Post-processing: chiusura speciale per licenze/istanze
    const needsClosing = topic === "licenze_istanze";
    if (data?.choices?.[0]?.message?.content) {
      if (needsClosing) {
        data.choices[0].message.content += closingForLicenzeIstanze();
      }
      if (sources.length) {
        // stampa elenco fonti in coda
        data.choices[0].message.content +=
          "\n\nFonti:\n" + sources.map(s => `[${s.idx}] ${s.title} — ${s.url}`).join("\n");
      }
    }

    return res.status(200).json({ ...data, web_search_performed });
  } catch (e) {
    console.error("API /api/chat error:", e);
    return res.status(500).json({ error:"Internal server error" });
  }
}

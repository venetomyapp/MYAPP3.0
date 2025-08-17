// api/chat.js — Chat doc-first (MEGA) + web-after (opz.) con fonti ufficiali
// Requisiti ENV: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY
// Opzionali: MEGA_FOLDER_URL (cartella pubblica), TAVILY_API_KEY (web search istituzionale)

import mega from "megajs";
const { Storage } = mega;

// ——— ENV
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MEGA_FOLDER_URL = process.env.MEGA_FOLDER_URL;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

const CONTACT_LINK = "https://myapp31.vercel.app/richieste.html";

// ——— Utility
const truncate = (s, n) => (s && s.length > n ? s.slice(0, n) + "…" : s || "");
const toBuf = async (stream) => {
  const chunks = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
};

// ——— Scoring web (se userai Tavily)
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

// ——— Fonti “pinnate” (ufficiali)
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
  ],
  pensioni: [
    { title: "INPS — Requisiti pensionistici comparto difesa e sicurezza", url: "https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.50727.requisiti-pensionistici-per-il-personale-comparto-difesa-sicurezza-e-soccorso-pubblico.html" },
    { title: "INPS — Pensione di privilegio", url: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.pensione-di-privilegio-50626.pensione-di-privilegio.html" },
    { title: "INPS — Contributi figurativi servizio militare", url: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.accredito-dei-contributi-figurativi-per-il-servizio-militare-obbligatorio-50013.accredito-dei-contributi-figurativi-per-il-servizio-militare-obbligatorio.html" }
  ]
};

// ——— Topic detection
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
  if (/pension/i.test(x)) return "pensioni";
  if (/licenz|istanza|pratica|permess/i.test(x)) return "licenze_istanze";
  return "generico";
}

function pinnedForTopic(topic) {
  return PINNED[topic] || [];
}

function buildSystemPreamble() {
  return [
    "Sei un assistente virtuale professionale per il personale dell’Arma dei Carabinieri e il Sindacato.",
    "Rispondi in italiano, in modo chiaro e istituzionale. Non fornire consulenza legale individuale.",
    "Cita sempre le fonti ufficiali disponibili (usa riferimenti [1][2] etc.).",
    "Se l’informazione non è nelle fonti, dillo e rimanda al dirigente competente.",
    "Per richieste sui dirigenti: se manca il livello, chiedi gentilmente se desidera i contatti regionali o di quale provincia.",
    "Se l’utente chiede direttamente i dirigenti del Veneto, mostra quelli regionali, evitando duplicati.",
  ].join(" ");
}

function closingForLicenzeIstanze() {
  return (
    `\n\nPuoi verificare tutti i dettagli consultando direttamente la fonte ufficiale indicata. ` +
    `Per questa pratica ti consiglio di contattare il dirigente di zona (regionale o provinciale, specifica la provincia). ` +
    `Puoi inviare subito la tua richiesta da qui: ${CONTACT_LINK}\n\n` +
    `Per problemi in dettaglio contatta il tuo dirigente di zona.`
  );
}

// ——— MEGA: helper per aprire storage e cercare file
function waitReady(storage) {
  return new Promise((resolve, reject) => {
    storage.on("ready", () => resolve(storage));
    storage.on("error", reject);
  });
}
function walkFiles(node, out = []) {
  if (!node) return out;
  if (node.children && node.children.length) {
    for (const ch of node.children) walkFiles(ch, out);
  } else {
    out.push(node);
  }
  return out;
}

// Estrazione testo in RAM (pdf/docx/txt)
async function extractTextFromBuffer(name, buf) {
  const low = name.toLowerCase();
  if (low.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buf);
    return data.text || "";
  }
  if (low.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value || "";
  }
  if (low.endsWith(".txt")) {
    return buf.toString("utf8");
  }
  return "";
}

function chunkText(txt, max = 1400) {
  const chunks = [];
  let i = 0;
  while (i < txt.length) {
    chunks.push(txt.slice(i, i + max));
    i += max;
  }
  return chunks;
}
function scoreChunk(chunk, query) {
  const q = (query || "").toLowerCase().split(/\s+/).filter(Boolean);
  const t = (chunk || "").toLowerCase();
  return q.reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0);
}

// ——— Tavily web search (opzionale)
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

// ——— Handler principale
export default async function handler(req, res) {
  // CORS base
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(500).json({ error:"Server misconfigured (Supabase)" });
  if (!OPENAI_API_KEY) return res.status(500).json({ error:"Server misconfigured (OPENAI_API_KEY)" });

  try {
    // Verifica token Supabase
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return res.status(401).json({ error:"Missing or invalid Authorization header" });

    const vr = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY }
    });
    if (vr.status !== 200) return res.status(401).json({ error:"Invalid or expired token" });

    // Body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const {
      messages = [],
      model = "gpt-4o-mini",
      max_tokens = 700,
      temperature = 0.3,
      system_context = null,
      // flags
      enable_doc_search = true,
      enable_web_search = false, // puoi tenerlo false e abilitarlo lato client quando serve
      web_search_query = null
    } = body;

    // ——— Prepara il prompt
    const chat = [];
    const lastUser = [...messages].reverse().find(m => m?.role === "user")?.content || "";
    const topic = detectTopic(lastUser || web_search_query || "");
    const preamble = buildSystemPreamble();
    chat.push({ role: "system", content: preamble });
    if (system_context) chat.push({ role:"system", content: system_context });

    // Fonti pin
    const pinned = pinnedForTopic(topic);
    let sources = [];
    if (pinned.length) {
      const ctx = pinned.map((s,i)=>`[${i+1}] ${s.title}\nURL: ${s.url}`).join("\n");
      chat.push({
        role: "system",
        content: "FONTI PINNATE (ufficiali, prioritarie):\n" + ctx + "\n\nCita con [1][2] ecc. quando pertinente."
      });
      sources = pinned.map((s,i)=>({ idx:i+1, title:s.title, url:s.url, kind: "official", content: "" }));
    }

    // ——— DOC-FIRST: MEGA folder (se disponibile) — nessuna persistenza
    let doc_search_performed = false;
    if (enable_doc_search && MEGA_FOLDER_URL) {
      try {
        const storage = Storage.fromURL(MEGA_FOLDER_URL);
        await waitReady(storage);

        // prendi lista file ammessi
        const allow = [".pdf", ".docx", ".txt"];
        const all = walkFiles(storage.root, [])
          .filter(f => allow.some(ext => f.name?.toLowerCase().endsWith(ext)));

        // Heuristica veloce: rank per match nel filename
        const q = (lastUser || "").toLowerCase();
        const ranked = all
          .map(f => {
            const name = (f.name || "").toLowerCase();
            let score = 0;
            for (const w of q.split(/\s+/).filter(Boolean)) {
              if (name.includes(w)) score += 1;
            }
            // preferisci PDF se a parità
            if (name.endsWith(".pdf")) score += 0.25;
            return { node: f, score };
          })
          .sort((a,b) => b.score - a.score);

        // scarica e analizza massimo 3 file
        const MAX_FILES = 3;
        const MAX_MB = 20 * 1024 * 1024;
        const selected = ranked.slice(0, MAX_FILES);

        const docSnippets = [];
        for (const { node } of selected) {
          // Scarica in RAM (limite dimensione)
          if (node.size && node.size > MAX_MB) continue; // skip file molto grandi
          const stream = node.download();
          const buf = await toBuf(stream);

          // Estrai testo
          const raw = await extractTextFromBuffer(node.name, buf);
          if (!raw) continue;

          // Chunk & score
          const chunks = chunkText(raw, 1600);
          const scored = chunks
            .map((c, i) => ({ i, c, s: scoreChunk(c, q) }))
            .sort((a,b)=> b.s - a.s)
            .slice(0, 2); // 2 estratti per file

          for (const sn of scored) {
            docSnippets.push({
              doc: node.name,
              excerpt: sn.c.trim().slice(0, 1600)
            });
          }
        }

        if (docSnippets.length) {
          doc_search_performed = true;
          // Inserisci nel prompt come “Documenti interni”
          const startIdx = sources.length;
          const lines = docSnippets.map((d, i) => {
            const idx = startIdx + i + 1;
            sources.push({ idx, title: `Documento interno — ${d.doc}`, url: "(MEGA)", kind: "internal", content: d.excerpt });
            return `[${idx}] ${d.doc}\nEstratto:\n${d.excerpt}`;
          });
          chat.push({
            role: "system",
            content: "DOCUMENTI INTERNI (MEGA — estratti pertinenti):\n" + lines.join("\n---\n") + "\n\nUsa questi estratti come priorità."
          });
        }
      } catch (e) {
        // non bloccare la risposta se MEGA fallisce
        console.warn("MEGA retrieval skipped:", e?.message);
      }
    }

    // ——— WEB (opzionale) dopo i documenti
    let web_search_performed = false;
    if (enable_web_search && TAVILY_API_KEY) {
      const raw = (typeof web_search_query === "string" && web_search_query.trim()) || lastUser;
      const enriched = `${raw} Italia carabinieri normativa ufficiale 2023..2025 filetype:pdf OR filetype:doc OR filetype:docx`;
      const web = await tavilySearch(enriched);
      if (web.length) {
        web_search_performed = true;
        const offset = sources.length;
        web.forEach((w, i) => sources.push({ ...w, idx: offset + i + 1, kind: "web" }));
        const webCtx = web
          .map(s => `[${s.idx}] ${s.title}\nURL: ${s.url}\nEstratto:\n${s.content}`)
          .join("\n---\n");
        chat.push({
          role: "system",
          content:
            "FONTI WEB (istituzionali filtrate):\n" + webCtx +
            "\n\nCita i fatti con riferimenti [n]."
        });
      }
    }

    // ——— Cronologia utente/assistant
    for (const m of Array.isArray(messages) ? messages : []) {
      if (m?.role && m?.content) chat.push({ role: m.role, content: m.content });
    }

    // ——— OpenAI
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

    // ——— Post processing
    const needsClosing = topic === "licenze_istanze";
    if (data?.choices?.[0]?.message?.content) {
      if (needsClosing) data.choices[0].message.content += closingForLicenzeIstanze();
      if (sources.length) {
        data.choices[0].message.content +=
          "\n\nFonti:\n" + sources.map(s =>
            `[${s.idx}] ${s.title} — ${s.url === "(MEGA)" ? "Documento interno" : s.url}`
          ).join("\n");
      }
    }

    return res.status(200).json({ ...data, doc_search_performed, web_search_performed });
  } catch (e) {
    console.error("API /api/chat error:", e);
    return res.status(500).json({ error:"Internal server error" });
  }
}

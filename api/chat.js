// api/chat.js — stabile: doc-search disattivata finché non setti MEGA_DOCS_ENABLED=1
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

    // opzionali
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
    const MEGA_FOLDER_URL = process.env.MEGA_FOLDER_URL || "";
    const MEGA_DOCS_ENABLED = process.env.MEGA_DOCS_ENABLED === "1"; // << bandierina

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: "Server misconfigured (Supabase ENV missing)" });
    }
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Server misconfigured (OPENAI_API_KEY missing)" });
    }

    // Auth Supabase
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

    // Input
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const {
      messages = [],
      model = "gpt-4o-mini",
      max_tokens = 650,
      temperature = 0.3,
      system_context = null,
      enable_web_search = true,
      enable_doc_search = false,   // il client può chiederla, ma la ignoriamo senza flag ENV
      web_search_query = null
    } = body;

    const CONTACT_LINK = "https://myapp31.vercel.app/richieste.html";
    const truncate = (s, n) => (s && s.length > n ? s.slice(0, n) + "…" : s || "");

    // Fonti pin
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
      leggi: [{ title: "Gazzetta Ufficiale", url: "https://www.gazzettaufficiale.it" }],
      tulps: [{ title: "Ministero dell’Interno — Normativa", url: "https://www.interno.gov.it" }],
      cds: [{ title: "MIT — Portale normativo (Codice della Strada)", url: "https://www.mit.gov.it" }],
      civile: [{ title: "Ministero della Giustizia — Codici", url: "https://www.giustizia.it" }],
      regolamento_generale: [{ title: "Arma dei Carabinieri — Sito istituzionale", url: "https://www.carabinieri.it" }],
      regolamento_organico: [{ title: "Arma dei Carabinieri — Documenti ufficiali", url: "https://www.carabinieri.it" }],
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
        { title: "INPS — Contributi figurativi per servizio militare", url: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.accredito-dei-contributi-figurativi-per-il-servizio-militare-obbligatorio-50013.accredito-dei-contributi-figurativi-per-il-servizio-militare-obbligatorio.html" }
      ]
    };

    const GOOD_DOMAINS = [
      "carabinieri.it","difesa.it","gazzettaufficiale.it","giustizia.it","governo.it",
      "interno.gov.it","funzionepubblica.gov.it","aranagenzia.it","mef.gov.it",
      "noipa.mef.gov.it","inps.it","normattiva.it","senato.it","camera.it",
      "mit.gov.it","poliziadistato.it","questure.poliziadistato.it",
      "inpa.gov.it","concorsi.difesa.it"
    ];
    const EXCLUDE_DOMAINS = ["wikipedia.org","britannica.com","facebook.com","x.com","twitter.com","instagram.com","linkedin.com","youtube.com","tiktok.com"];
    const PREFERRED_FILE_EXT = [".pdf",".doc",".docx"];
    const scoreWebResult = (r) => {
      const u = (r.url||"").toLowerCase();
      const t = (r.title||"").toLowerCase();
      const c = (r.content||"").toLowerCase();
      let s = 0;
      if (GOOD_DOMAINS.some(d => u.includes(d))) s += 8;
      if (PREFERRED_FILE_EXT.some(ext => u.endsWith(ext))) s += 3;
      if (/(2025|2024|2023)/.test(t + " " + c)) s += 2;
      if (EXCLUDE_DOMAINS.some(d => u.includes(d))) s -= 6;
      return s;
    };

    function detectTopic(q) {
      const x = (q||"").toLowerCase();
      if (/dirigent[ei]|regionale|provinciale|veneto|treviso|padova|verona|vicenza|rovigo|venezia|belluno/.test(x)) return "dirigenti";
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
    function pinnedForTopic(topic) { return PINNED[topic] || []; }

    function buildSystemPreamble() {
      const base =
        "Sei un assistente virtuale professionale per il personale dell’Arma dei Carabinieri e il Sindacato. " +
        "Rispondi in italiano, chiaro e istituzionale. Non fornire consulenza legale individuale. " +
        "Cita sempre le fonti ufficiali disponibili con riferimenti [1][2][3]. " +
        "Se l’informazione non è nelle fonti, indicalo e rimanda al dirigente competente.\n\n";
      const dirigentiNote =
        "Se l’utente chiede contatti dei dirigenti, chiedi se desidera quelli regionali o di una specifica provincia. " +
        "L’elenco dirigenti è gestito internamente dal sistema e aggiornato da Supabase.\n\n";
      const ambiti =
        "Ambiti e fonti ufficiali: Disciplina (Difesa), COM (Carabinieri), TUOM (Difesa), Gazzetta Ufficiale, " +
        "TULPS (Interno), CdS (MIT), Codice Civile (Giustizia), Regolamenti Carabinieri (sito Arma), " +
        "Concorsi (Carabinieri/Extranet/INPA/Difesa/GU), Pensioni (INPS).";
      return base + dirigentiNote + ambiti;
    }
    const closingForLicenzeIstanze = (link) =>
      `\n\nPuoi verificare tutti i dettagli consultando direttamente la fonte ufficiale indicata. ` +
      `Per questa pratica ti consiglio di contattare il dirigente di zona: specifica se regionale o provinciale e di quale provincia. ` +
      `Puoi inviare subito la tua richiesta tramite questo link: ${link}\n\n` +
      `Per problemi in dettaglio contatta il tuo dirigente di zona.`;

    async function tavilySearch(query) {
      const key = TAVILY_API_KEY;
      if (!key) return [];
      try {
        const resp = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({
            api_key: key,
            query,
            search_depth: "advanced",
            include_answer: false,
            max_results: 8,
            include_domains: GOOD_DOMAINS
          })
        });
        if (!resp.ok) return [];
        const j = await resp.json();
        const cleaned = (j.results || []).filter(r => !EXCLUDE_DOMAINS.some(d => (r.url||"").toLowerCase().includes(d)));
        const ranked = cleaned.map(r => ({...r, __s: scoreWebResult(r)})).sort((a,b)=>b.__s-a.__s);
        return ranked.slice(0,3).map((r,i)=>({ idx:i+1, title: r.title?.slice(0,160)||"", url:r.url, content: (r.content||"").slice(0,3800) }));
      } catch { return []; }
    }

    // Prompt
    const chat = [];
    const lastUser = [...messages].reverse().find(m => m?.role === "user")?.content || "";
    const topic = detectTopic(lastUser || web_search_query || "");
    chat.push({ role: "system", content: buildSystemPreamble() });
    if (system_context) chat.push({ role: "system", content: system_context });

    // Fonti pin in cima
    const pinned = pinnedForTopic(topic);
    let sources = [];
    if (pinned.length) {
      const ctx = pinned.map((s,i)=>`[${i+1}] ${s.title}\nURL: ${s.url}`).join("\n");
      chat.push({ role: "system", content: "FONTI PINNATE (ufficiali, prioritarie):\n" + ctx + "\n\nCita con [1][2][3]." });
      sources = pinned.map((s,i)=>({ idx:i+1, title:s.title, url:s.url, content:"" }));
    }

    // DOC-FIRST: attiva solo se abilitata da ENV (altrimenti assolutamente ignorata)
    let doc_search_used = false;
    let doc_diagnostics = "doc-search disabled (flag not set)";
    if (enable_doc_search && MEGA_DOCS_ENABLED && MEGA_FOLDER_URL) {
      try {
        // import dinamici solo quando la bandierina è attiva
        const megajs = await import('megajs');
        const pdfParseMod = await import('pdf-parse').catch(()=>null);
        const mammothMod = await import('mammoth').catch(()=>null);
        const pdfParse = pdfParseMod?.default || null;
        const mammoth = mammothMod?.default || null;

        const { File } = megajs;
        const root = await File.fromURL(MEGA_FOLDER_URL);
        await root.loadAttributes();
        const children = root.children || [];
        const files = children.filter(n => n.type === 'file' && /\.(pdf|docx?|txt)$/i.test(n.name)).slice(0,5);

        const terms = (lastUser||"").toLowerCase().split(/\W+/).filter(Boolean).slice(0,8);
        const docSources = [];
        for (const f of files) {
          let text = "";
          try {
            const buf = await f.downloadBuffer();
            if (/\.pdf$/i.test(f.name) && pdfParse) {
              const r = await pdfParse(buf);
              text = (r?.text || "").slice(0,16000);
            } else if (/\.(docx|doc)$/i.test(f.name) && mammoth) {
              const r = await mammoth.extractRawText({ buffer: buf });
              text = (r?.value || "").slice(0,16000);
            } else if (/\.txt$/i.test(f.name)) {
              text = buf.toString('utf8').slice(0,16000);
            }
          } catch {}
          if (!text) continue;
          const lc = text.toLowerCase();
          const score = terms.reduce((acc,w)=> acc + (lc.includes(w) ? 1 : 0), 0);
          docSources.push({ title:f.name, url:"(MEGA) "+f.name, content: truncate(text,3800), score });
        }
        docSources.sort((a,b)=>b.score-a.score);
        if (docSources.length) {
          doc_search_used = true;
          const offset = sources.length;
          docSources.slice(0,3).forEach((w,i)=>sources.push({ ...w, idx: offset+i+1 }));
          const webCtx = docSources.slice(0,3).map(s => `[${s.idx}] ${s.title}\nEstratto:\n${s.content}`).join("\n---\n");
          chat.push({ role: "system", content: "FONTI DOCUMENTALI (MEGA):\n" + webCtx + "\n\nCita con [ref] coerenti." });
          doc_diagnostics = `parsed ${docSources.length} docs`;
        } else {
          doc_diagnostics = "no parsable docs";
        }
      } catch (e) {
        doc_diagnostics = "doc parse failed: " + (e?.message || String(e));
      }
    }

    // WEB-SEARCH solo se abilitata e non abbiamo docs
    let web_search_performed = false;
    if (enable_web_search && !doc_search_used && TAVILY_API_KEY) {
      const raw = (typeof web_search_query === "string" && web_search_query.trim()) || lastUser;
      const enriched = `${raw} Italia carabinieri normativa ufficiale 2023..2025 filetype:pdf OR filetype:doc OR filetype:docx`;
      const web = await (async () => {
        try {
          const resp = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type":"application/json" },
            body: JSON.stringify({ api_key:TAVILY_API_KEY, query: enriched, search_depth:"advanced", include_answer:false, max_results:8, include_domains: GOOD_DOMAINS })
          });
          if (!resp.ok) return [];
          const j = await resp.json();
          const cleaned = (j.results || []).filter(r => !EXCLUDE_DOMAINS.some(d => (r.url||"").toLowerCase().includes(d)));
          const ranked = cleaned.map(r => ({...r, __s: scoreWebResult(r)})).sort((a,b)=>b.__s-a.__s);
          return ranked.slice(0,3).map((r,i)=>({ idx:i+1, title:r.title?.slice(0,160)||"", url:r.url, content:(r.content||"").slice(0,3800) }));
        } catch { return []; }
      })();
      if (web.length) {
        web_search_performed = true;
        const offset = sources.length;
        web.forEach((w,i)=>sources.push({ ...w, idx: offset+i+1 }));
        const webCtx = web.map(s => `[${s.idx}] ${s.title}\nURL: ${s.url}\nEstratto:\n${s.content}`).join("\n---\n");
        chat.push({ role:"system", content: "FONTI WEB (istituzionali filtrate):\n" + webCtx + "\n\nCita con [ref] coerenti." });
      }
    }

    // Storia chat
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
      return res.status(oa.status).json({ error: "OpenAI error", detail: txt || oa.statusText });
    }
    const data = await oa.json();

    // Post-processing
    if (data?.choices?.[0]?.message?.content && detectTopic(lastUser) === "licenze_istanze") {
      data.choices[0].message.content += closingForLicenzeIstanze(CONTACT_LINK);
    }
    if (data?.choices?.[0]?.message?.content && sources.length) {
      data.choices[0].message.content += "\n\nFonti:\n" + sources.map(s => `[${s.idx}] ${s.title}${s.url ? " — " + s.url : ""}`).join("\n");
    }

    const diagnostics = {
      doc_search_requested: !!enable_doc_search,
      doc_search_enabled_env: MEGA_DOCS_ENABLED,
      doc_folder_set: !!MEGA_FOLDER_URL,
      doc_diagnostics,
      web_search_performed
    };

    return res.status(200).json({ ...data, doc_search_used, web_search_performed, diagnostics });
  } catch (e) {
    console.error("API /api/chat fatal:", e);
    return res.status(500).json({ error: "Internal server error", detail: String(e?.message || e) });
  }
}

// api/chat.js — Chat “doc-first” con fonti ufficiali + fallback web-search
// ENV richieste: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY
// ENV opzionali: MEGA_FOLDER_URL, TAVILY_API_KEY

export default async function handler(req, res) {
  // CORS basic
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // ====== ENV ======
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const MEGA_FOLDER_URL = process.env.MEGA_FOLDER_URL || ""; // opzionale
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";   // opzionale

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: "Server misconfigured (Supabase ENV missing)" });
    }
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Server misconfigured (OPENAI_API_KEY missing)" });
    }

    // ====== Auth Supabase ======
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

    // ====== Input ======
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const {
      messages = [],
      model = "gpt-4o-mini",
      max_tokens = 650,
      temperature = 0.3,
      system_context = null,
      enable_web_search = true,
      enable_doc_search = false,
      web_search_query = null
    } = body;

    const CONTACT_LINK = "https://myapp31.vercel.app/richieste.html";
    const truncate = (s, n) => (s && s.length > n ? s.slice(0, n) + "…" : s || "");

    // ====== Fonti pin ufficiali ======
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

    function pinnedForTopic(topic) {
      return PINNED[topic] || [];
    }

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

    function closingForLicenzeIstanze(link) {
      return (
        `\n\nPuoi verificare tutti i dettagli consultando direttamente la fonte ufficiale indicata. ` +
        `Per questa pratica ti consiglio di contattare il dirigente di zona: specifica se regionale o provinciale e di quale provincia. ` +
        `Puoi inviare subito la tua richiesta tramite questo link: ${link}\n\n` +
        `Per problemi in dettaglio contatta il tuo dirigente di zona.`
      );
    }

    // ====== Web search (Tavily) — best effort ======
    async function tavilySearch(query) {
      const key = TAVILY_API_KEY;
      if (!key) return [];
      try {
        const resp = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        const results = Array.isArray(j.results) ? j.results : [];
        const cleaned = results.filter(r => !EXCLUDE_DOMAINS.some(d => (r.url||"").toLowerCase().includes(d)));
        const ranked = cleaned.map(r => ({...r, __s: scoreWebResult(r)})).sort((a,b)=>b.__s-a.__s);
        return ranked.slice(0,3).map((r,i)=>({
          idx: i+1,
          title: truncate(r.title, 160),
          url: r.url,
          content: truncate(r.content, 3800)
        }));
      } catch {
        return [];
      }
    }

    // ====== Doc-first (MEGA) — best effort, no crash ======
    async function docFirstSearch(query) {
      const diagnostics = { tried: false, ok: false, message: "" };
      const sources = [];
      if (!enable_doc_search) return { used: false, sources, diagnostics: { ...diagnostics, message: "disabled" } };
      if (!MEGA_FOLDER_URL) return { used: false, sources, diagnostics: { ...diagnostics, message: "MEGA_FOLDER_URL missing" } };

      diagnostics.tried = true;
      try {
        // Dynamic imports per non caricare in build se non usati
        const megajs = await import('megajs').catch(() => null);
        if (!megajs) throw new Error("megajs not available");
        const pdfParseMod = await import('pdf-parse').catch(() => null);
        const mammothMod = await import('mammoth').catch(() => null);

        const pdfParse = pdfParseMod?.default || null;
        const mammoth = mammothMod?.default || null;

        const { File } = megajs;
        const root = await File.fromURL(MEGA_FOLDER_URL);
        await root.loadAttributes();

        const children = root.children || [];
        const files = children
          .filter(n => n.type === 'file' && /\.(pdf|docx?|txt)$/i.test(n.name))
          .slice(0, 5); // limite conservativo per function time

        const terms = query.toLowerCase().split(/\W+/).filter(Boolean).slice(0, 8);

        for (const f of files) {
          let text = "";
          try {
            const buf = await f.downloadBuffer();

            if (/\.pdf$/i.test(f.name) && pdfParse) {
              const r = await pdfParse(buf);
              text = (r?.text || "").slice(0, 16000);
            } else if (/\.(docx|doc)$/i.test(f.name) && mammoth) {
              const r = await mammoth.extractRawText({ buffer: buf });
              text = (r?.value || "").slice(0, 16000);
            } else if (/\.txt$/i.test(f.name)) {
              text = buf.toString('utf8').slice(0, 16000);
            }
          } catch {
            // ignora file non parsabili
          }

          if (!text) continue;

          const lc = text.toLowerCase();
          const score = terms.reduce((acc, w) => acc + (lc.includes(w) ? 1 : 0), 0);
          sources.push({
            title: f.name,
            url: "(MEGA) " + f.name, // link pubblico ai singoli file non sempre disponibile; manteniamo descrittivo
            content: truncate(text, 3800),
            score
          });
        }

        sources.sort((a, b) => b.score - a.score);
        diagnostics.ok = true;
        diagnostics.message = `parsed ${sources.length} sources`;
        return { used: true, sources: sources.slice(0, 3), diagnostics };
      } catch (e) {
        diagnostics.ok = false;
        diagnostics.message = e?.message || "doc parse failed";
        return { used: false, sources: [], diagnostics };
      }
    }

    // ====== Costruzione prompt ======
    const chat = [];
    const lastUser = [...messages].reverse().find(m => m?.role === "user")?.content || "";
    const topic = detectTopic(lastUser || web_search_query || "");
    const preamble = buildSystemPreamble();

    chat.push({ role: "system", content: preamble });
    if (system_context) chat.push({ role: "system", content: system_context });

    // Fonti pin in testa
    const pinned = pinnedForTopic(topic);
    let sources = [];
    if (pinned.length) {
      const ctx = pinned.map((s, i) => `[${i+1}] ${s.title}\nURL: ${s.url}`).join("\n");
      chat.push({
        role: "system",
        content: "FONTI PINNATE (ufficiali, prioritarie):\n" + ctx + "\n\nUsa queste fonti dove pertinenti e cita con [1][2][3]."
      });
      sources = pinned.map((s, i) => ({ idx: i + 1, title: s.title, url: s.url, content: "" }));
    }

    // ====== DOC-FIRST ======
    const docDiag = await docFirstSearch(lastUser || "");
    let doc_search_used = docDiag.used;
    if (docDiag.used && docDiag.sources.length) {
      const offset = sources.length;
      docDiag.sources.forEach((w, i) => sources.push({ ...w, idx: offset + i + 1 }));
      const webCtx = docDiag.sources
        .map(s => `[${s.idx}] ${s.title}\nEstratto:\n${s.content}`)
        .join("\n---\n");
      chat.push({
        role: "system",
        content:
          "FONTI DOCUMENTALI (MEGA):\n" + webCtx +
          "\n\nCita con [ref] coerenti."
      });
    }

    // ====== WEB-SEARCH (solo se abilitata e doc vuoto) ======
    let web_search_performed = false;
    if (enable_web_search && !doc_search_used && TAVILY_API_KEY) {
      const raw = (typeof web_search_query === "string" && web_search_query.trim()) || lastUser;
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

    // ====== OpenAI ======
    const oa = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: chat, temperature, max_tokens })
    });

    if (!oa.ok) {
      const txt = await oa.text().catch(() => "");
      return res.status(oa.status).json({ error: `OpenAI error`, detail: txt || oa.statusText });
    }

    const data = await oa.json();

    // Chiusura speciale per licenze/istanze
    if (data?.choices?.[0]?.message?.content && topic === "licenze_istanze") {
      data.choices[0].message.content += closingForLicenzeIstanze(CONTACT_LINK);
    }

    // Stampa elenco fonti in coda (se presenti)
    if (data?.choices?.[0]?.message?.content && sources.length) {
      data.choices[0].message.content +=
        "\n\nFonti:\n" + sources.map(s => `[${s.idx}] ${s.title}${s.url ? " — " + s.url : ""}`).join("\n");
    }

    // Diagnostica utile al client
    const diagnostics = {
      doc_search_tried: docDiag.diagnostics?.tried || false,
      doc_search_ok: docDiag.diagnostics?.ok || false,
      doc_search_msg: docDiag.diagnostics?.message || "",
      web_search_performed
    };

    return res.status(200).json({ ...data, web_search_performed, doc_search_used, diagnostics });
  } catch (e) {
    // Qualsiasi errore residuo → sempre JSON
    console.error("API /api/chat fatal:", e);
    return res.status(500).json({ error: "Internal server error", detail: String(e?.message || e) });
  }
}

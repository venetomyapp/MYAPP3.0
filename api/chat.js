
// /api/chat.js — Chat “guidata” con fonti ufficiali + web search istituzionale
// ENV richieste: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY, (opz.) TAVILY_API_KEY

export const config = { runtime: 'nodejs18.x' };

// ------------------------ ENV ------------------------
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// ------------------------ COSTANTI ------------------------
const CONTACT_LINK = 'https://myapp31.vercel.app/richieste.html';
const truncate = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || '');

// FONTI PINNATE (ufficiali) — coprono TUTTI gli ambiti del tuo prompt
const PINNED = {
  disciplina: [
    {
      title: 'Guida Tecnica — Procedure disciplinari (2023) — Difesa',
      url: 'https://www.difesa.it/assets/allegati/6105/06_guida_tecnica_disciplina_anno_2023.pdf',
    },
  ],
  com: [
    {
      title: 'COM — Supplemento al n.3 — Carabinieri',
      url: 'https://www.carabinieri.it/docs/default-source/default-document-library/supplemento-al-n-3.pdf?sfvrsn=811b6d23_0',
    },
  ],
  tuom: [
    { title: "TUOM — Ministero della Difesa (sezione normativa)", url: "https://www.difesa.it" },
  ],
  leggi: [
    { title: 'Gazzetta Ufficiale della Repubblica Italiana', url: 'https://www.gazzettaufficiale.it' },
  ],
  tulps: [
    { title: 'Ministero dell’Interno — Normativa (TULPS)', url: 'https://www.interno.gov.it' },
  ],
  cds: [
    { title: 'MIT — Portale normativo (Codice della Strada)', url: 'https://www.mit.gov.it' },
  ],
  civile: [
    { title: 'Ministero della Giustizia — Codici (Codice Civile)', url: 'https://www.giustizia.it' },
  ],
  regolamento_generale: [
    { title: 'Arma dei Carabinieri — Sito istituzionale', url: 'https://www.carabinieri.it' },
  ],
  regolamento_organico: [
    { title: 'Arma dei Carabinieri — Documenti ufficiali', url: 'https://www.carabinieri.it' },
  ],
  concorsi: [
    { title: 'Arma — Area Concorsi', url: 'https://www.carabinieri.it/concorsi/area-concorsi' },
    { title: 'Extranet Arma — Domande online', url: 'https://extranet.carabinieri.it/concorsionline20' },
    { title: 'INPA — Portale reclutamento', url: 'https://www.inpa.gov.it' },
    { title: 'Concorsi Difesa', url: 'https://concorsi.difesa.it' },
    { title: 'Gazzetta Ufficiale — Concorsi', url: 'https://www.gazzettaufficiale.it' },
  ],
  pensioni: [
    {
      title: 'INPS — Requisiti pensionistici comparto Difesa, Sicurezza e Soccorso',
      url: 'https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.50727.requisiti-pensionistici-per-il-personale-comparto-difesa-sicurezza-e-soccorso-pubblico.html',
    },
    {
      title: 'INPS — Pensione di privilegio',
      url: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.pensione-di-privilegio-50626.pensione-di-privilegio.html',
    },
    {
      title: 'INPS — Accredito contributi figurativi servizio militare obbligatorio',
      url: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.accredito-dei-contributi-figurativi-per-il-servizio-militare-obbligatorio-50013.accredito-dei-contributi-figurativi-per-il-servizio-militare-obbligatorio.html',
    },
  ],
};

const DEFAULT_GOOD_DOMAINS = [
  'carabinieri.it',
  'difesa.it',
  'gazzettaufficiale.it',
  'giustizia.it',
  'governo.it',
  'interno.gov.it',
  'funzionepubblica.gov.it',
  'aranagenzia.it',
  'mef.gov.it',
  'noipa.mef.gov.it',
  'inps.it',
  'normattiva.it',
  'senato.it',
  'camera.it',
  'mit.gov.it',
  'poliziadistato.it',
  'questure.poliziadistato.it',
  'inpa.gov.it',
  'concorsi.difesa.it',
  // eccezione “strumento attendibile” (non istituzionale) ammessa SOLO per pensioni:
  // sarà agganciata dinamicamente se topic === 'pensioni'
];

const DEFAULT_EXCLUDE_DOMAINS = [
  'wikipedia.org',
  'britannica.com',
  'facebook.com',
  'x.com',
  'twitter.com',
  'instagram.com',
  'linkedin.com',
  'youtube.com',
  'tiktok.com',
];

const PREFERRED_FILE_EXT = ['.pdf', '.doc', '.docx'];

// ------------------------ UTILS ------------------------
function getHostname(u = '') {
  try { return new URL(u).hostname.toLowerCase(); } catch { return ''; }
}
function hostEndsWith(host, domain) {
  return host === domain || host.endsWith('.' + domain);
}
function hasPreferredExt(u = '') {
  const ul = u.toLowerCase();
  return PREFERRED_FILE_EXT.some((ext) => ul.endsWith(ext));
}
function scoreWebResult(r, goodDomains = DEFAULT_GOOD_DOMAINS, excludeDomains = DEFAULT_EXCLUDE_DOMAINS) {
  const host = getHostname(r.url);
  const t = (r.title || '').toLowerCase();
  const c = (r.content || '').toLowerCase();
  let s = 0;
  if (goodDomains.some((d) => hostEndsWith(host, d))) s += 8;
  if (hasPreferredExt(r.url)) s += 3;
  if (/(2025|2024|2023)/.test(t + ' ' + c)) s += 2;
  if (excludeDomains.some((d) => hostEndsWith(host, d))) s -= 6;
  return s;
}
function withinYears(dateStr, years = 3) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d)) return true;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return d >= cutoff;
}

function detectTopic(q) {
  const x = (q || '').toLowerCase();
  if (/dirigent[ei]|regionale|provinciale/.test(x)) return 'dirigenti';
  if (/disciplina|sanzion/i.test(x)) return 'disciplina';
  if (/\bcom\b|ordinamento\s+militar/i.test(x)) return 'com';
  if (/tuom|testo\s+unico\s+(dell'|dell’)?ordinamento/i.test(x)) return 'tuom';
  if (/gazzetta|legge|decreto|normattiva/i.test(x)) return 'leggi';
  if (/tulps|pubblica\s+sicurezza|porto\s+armi/i.test(x)) return 'tulps';
  if (/codice\s+della\s+strada|cds\b/i.test(x)) return 'cds';
  if (/codice\s+civile|civile\b/.test(x)) return 'civile';
  if (/regolamento\s+generale/i.test(x)) return 'regolamento_generale';
  if (/regolamento\s+organico/i.test(x)) return 'regolamento_organico';
  if (/concors/i.test(x)) return 'concorsi';
  if (/licenz|istanza|pratica|permess/i.test(x)) return 'licenze_istanze';
  if (/pension/i.test(x) || /ausiliar/i.test(x) || /\briserv[ae]\b/.test(x) || /\btfs\b/.test(x) || /figurativ/i.test(x) || /privilegi/i.test(x)) return 'pensioni';
  return 'generico';
}
function pinnedForTopic(topic) {
  return PINNED[topic] || [];
}

function buildSystemPreamble(topic) {
  const base =
    'Sei un assistente virtuale professionale per il personale dell’Arma dei Carabinieri e il Sindacato. ' +
    'Rispondi in italiano con tono chiaro e istituzionale. Non fornire consulenza legale individuale. ' +
    'Cita sempre le fonti ufficiali disponibili usando riferimenti [1][2][3]. ' +
    'Se l’informazione non è nelle fonti indicate, dichiaralo e rimanda al dirigente competente.\n\n';
  const dirigentiNote =
    'Se l’utente chiede contatti dei dirigenti, chiedi prima: (a) livello (regionale/provinciale); (b) se provinciale, la provincia. ' +
    "L'elenco dirigenti è gestito internamente dal sistema.\n\n";
  const ambiti =
    'Ambiti coperti e fonti: Disciplina Militare (Difesa), COM (Carabinieri), TUOM (Difesa), ' +
    'Leggi (Gazzetta Ufficiale), TULPS (Interno), Codice della Strada (MIT), Codice Civile (Giustizia), ' +
    'Regolamenti Arma (carabinieri.it), Concorsi (Carabinieri/Extranet/INPA/Difesa/GU), ' +
    'Pensioni Militari (INPS). Monitora gli aggiornamenti normativi e, per le pensioni, i coefficienti di trasformazione (aggiornamento biennale).\n';
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

function enrichQuery(raw, topic, filetypes = []) {
  const extHint = Array.isArray(filetypes) && filetypes.length
    ? ` ${filetypes.map((f) => `filetype:${f}`).join(' OR ')}`
    : ' filetype:pdf OR filetype:doc OR filetype:docx';

  if (topic === 'pensioni') {
    return `${raw} pensioni militari comparto difesa sicurezza INPS coefficienti di trasformazione 2023..2025${extHint}`;
  }
  return `${raw} Italia carabinieri normativa ufficiale 2023..2025${extHint}`;
}

// ------------------------ TAVILY ------------------------
async function tavilySearch(query, {
  include_domains = DEFAULT_GOOD_DOMAINS,
  exclude_domains = DEFAULT_EXCLUDE_DOMAINS,
  max_results = 8,
  years = 3,
  filetypes = []
} = {}) {
  if (!TAVILY_API_KEY) return { used: false, results: [] };

  const payload = {
    api_key: TAVILY_API_KEY,
    query,
    search_depth: 'advanced',
    include_answer: false,
    max_results,
    include_domains,
    exclude_domains,
  };

  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    return { used: true, results: [], error: `Tavily ${resp.status}: ${t.slice(0, 200)}` };
  }

  const j = await resp.json();
  const arr = Array.isArray(j.results) ? j.results : [];

  const filtered = arr.filter((r) => {
    const host = getHostname(r.url);
    if (!host) return false;
    if (exclude_domains.some((d) => hostEndsWith(host, d))) return false;
    if (!withinYears(r.published_date, years)) return false;
    if (Array.isArray(filetypes) && filetypes.length) {
      const ok = filetypes.some((ft) => r.url?.toLowerCase().endsWith('.' + ft.toLowerCase()));
      if (!ok) return false;
    }
    return true;
  });

  const ranked = filtered
    .map((r) => ({ ...r, __s: scoreWebResult(r, include_domains, exclude_domains) }))
    .sort((a, b) => b.__s - a.__s);

  const top = ranked.slice(0, 6).map((r) => ({
    title: truncate(r.title, 160),
    url: r.url,
    content: truncate(r.content || r.raw_content || '', 3800),
    published_date: r.published_date || null,
  }));

  return { used: true, results: top };
}

// ------------------------ HANDLER ------------------------
export default async function handler(req, res) {
  // CORS
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server misconfigured (Supabase)' });
  }
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured (OPENAI_API_KEY)' });
  }

  try {
    // 1) Verifica token Supabase
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const vr = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY },
    });
    if (vr.status !== 200) {
      const t = await vr.text().catch(() => '');
      return res.status(401).json({ error: 'Invalid or expired token', details: t.slice(0, 200) });
    }

    // 2) Body parsing
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      messages = [],
      model = 'gpt-4o-mini',
      max_tokens = 650,
      temperature = 0.3,
      system_context = null,

      // ricerca
      enable_web_search = true,
      web_search_query = null,
      search_domains = DEFAULT_GOOD_DOMAINS,
      search_exclude_domains = DEFAULT_EXCLUDE_DOMAINS,
      search_years = 3,
      search_filetypes = [], // es: ['pdf','doc','docx']
    } = body;

    // 3) Prompt & topic
    const chat = [];
    const lastUser = [...messages].reverse().find((m) => m?.role === 'user')?.content || '';
    const topic = detectTopic(lastUser || web_search_query || '');
    const preamble = buildSystemPreamble(topic);
    chat.push({ role: 'system', content: preamble });
    if (system_context) chat.push({ role: 'system', content: system_context });

    // 4) Fonti pinned per topic
    const pinned = pinnedForTopic(topic);
    let sources = [];
    if (pinned.length) {
      const ctx = pinned.map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}`).join('\n');
      chat.push({
        role: 'system',
        content:
          'FONTI PINNATE (ufficiali, da usare come prioritarie):\n' +
          ctx +
          '\n\nCita con [1][2][3] quando pertinente.',
      });
      sources = pinned.map((s, i) => ({ idx: i + 1, title: s.title, url: s.url, content: '' }));
    }

    // 5) Web search istituzionale (con eccezione per Altroconsumo SOLO in tema pensioni)
    let web_search_performed = false;
    let web_sources_meta = [];
    if (enable_web_search && TAVILY_API_KEY) {
      const rawQ = (typeof web_search_query === 'string' && web_search_query.trim()) || lastUser;

      // se pensioni, estendiamo i domini includendo lo strumento "attendibile" Altroconsumo
      const effective_domains =
        topic === 'pensioni'
          ? Array.from(new Set([...search_domains, 'altroconsumo.it']))
          : search_domains;

      const enriched = enrichQuery(rawQ, topic, search_filetypes);
      const t = await tavilySearch(enriched, {
        include_domains: effective_domains,
        exclude_domains: search_exclude_domains,
        max_results: 8,
        years: Number(search_years) || 3,
        filetypes: Array.isArray(search_filetypes) ? search_filetypes : [],
      });

      if (t.used) web_search_performed = true;
      if (t.error) console.warn('Tavily error:', t.error);

      if (t.results && t.results.length) {
        const offset = sources.length;
        t.results.forEach((w, i) => sources.push({ ...w, idx: offset + i + 1 }));
        const webCtx = t.results
          .map((s, i) => `[${offset + i + 1}] ${s.title}\nURL: ${s.url}\nEstratto:\n${s.content}`)
          .join('\n---\n');
        chat.push({
          role: 'system',
          content:
            'FONTI WEB (istituzionali filtrate):\n' +
            webCtx +
            '\n\nCita i fatti con riferimenti coerenti [n].',
        });

        web_sources_meta = t.results.map((s, i) => ({
          id: offset + i + 1,
          title: s.title,
          url: s.url,
          published_date: s.published_date || null,
        }));
      }
    }

    // 6) Cronologia utente/assistant
    for (const m of Array.isArray(messages) ? messages : []) {
      if (m?.role && m?.content) chat.push({ role: m.role, content: m.content });
    }

    // 7) OpenAI
    const oa = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: chat, temperature, max_tokens }),
    });

    if (!oa.ok) {
      const txt = await oa.text().catch(() => '');
      return res.status(oa.status).json({ error: `OpenAI error: ${txt || oa.statusText}` });
    }

    const data = await oa.json();

    // 8) Post-processing: chiusure & fonti + strumenti pensioni
    const needsClosing = topic === 'licenze_istanze';
    if (data?.choices?.[0]?.message?.content) {
      if (needsClosing) {
        data.choices[0].message.content += closingForLicenzeIstanze();
      }

      // Strumenti pensioni (come da prompt): CUSI (nota), MyINPS, Altroconsumo
      if (topic === 'pensioni') {
        data.choices[0].message.content +=
          '\n\nStrumenti utili (pensioni):\n' +
          '• CUSI — Applicativo interforze (accesso riservato al personale; simulazioni ausiliaria/riserva, moltiplicatore, TFS)\n' +
          '• MyINPS — “La mia pensione futura” (area personale INPS)\n' +
          '• Calcolatore Altroconsumo — stima indicativa: https://www.altroconsumo.it/soldi/lavoro-pensione/calcola-risparmia/calcolarepensioni';
      }

      if (sources.length) {
        data.choices[0].message.content +=
          '\n\nFonti:\n' + sources.map((s) => `[${s.idx}] ${s.title} — ${s.url}`).join('\n');
      }
    }

    const pinned_sources_meta = pinned.map((s, i) => ({
      id: i + 1,
      title: s.title,
      url: s.url,
    }));

    return res.status(200).json({
      ...data,
      web_search_performed,
      web_sources: web_sources_meta,
      pinned_sources: pinned_sources_meta,
    });
  } catch (e) {
    console.error('API /api/chat error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

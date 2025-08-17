// api/chat.js - Virgilio Expert: Assistente Sindacale Carabinieri

// FONTI UFFICIALI PER AMBITO (dal prompt professionale)
const EXPERT_SOURCES = {
  disciplina: [
    {
      title: 'Guida Tecnica "Procedure disciplinari" (2023) — Ministero della Difesa',
      url: 'https://www.difesa.it/assets/allegati/6105/06_guida_tecnica_disciplina_anno_2023.pdf',
    },
  ],
  com: [
    {
      title: 'Supplemento al n.3 — Arma dei Carabinieri',
      url: 'https://www.carabinieri.it/docs/default-source/default-document-library/supplemento-al-n-3.pdf?sfvrsn=811b6d23_0',
    },
  ],
  tuom: [
    { title: 'Ministero della Difesa — Sezione normativa', url: 'https://www.difesa.it' },
  ],
  leggi: [
    { title: 'Gazzetta Ufficiale della Repubblica Italiana', url: 'https://www.gazzettaufficiale.it' },
  ],
  tulps: [
    { title: 'Ministero dell\'Interno — Sezione normativa', url: 'https://www.interno.gov.it' },
  ],
  cds: [
    { title: 'Ministero dei Trasporti — Portale normativo', url: 'https://www.mit.gov.it' },
  ],
  civile: [
    { title: 'Ministero della Giustizia — Sezione codici', url: 'https://www.giustizia.it' },
  ],
  regolamento_generale: [
    { title: 'Arma dei Carabinieri — Sezione istituzionale', url: 'https://www.carabinieri.it' },
  ],
  regolamento_organico: [
    { title: 'Arma dei Carabinieri — Documenti ufficiali', url: 'https://www.carabinieri.it' },
  ],
  concorsi: [
    { title: 'Area Concorsi ufficiale Arma dei Carabinieri', url: 'https://www.carabinieri.it/concorsi/area-concorsi' },
    { title: 'Portale domande online Extranet Carabinieri', url: 'https://extranet.carabinieri.it/concorsionline20' },
    { title: 'INPA — Portale del reclutamento pubblico', url: 'https://www.inpa.gov.it' },
    { title: 'Concorsi Ministero della Difesa', url: 'https://concorsi.difesa.it' },
    { title: 'Gazzetta Ufficiale — Pubblicazione bandi', url: 'https://www.gazzettaufficiale.it' },
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
      title: 'INPS — Accredito contributi figurativi servizio militare',
      url: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.accredito-dei-contributi-figurativi-per-il-servizio-militare-obbligatorio-50013.accredito-dei-contributi-figurativi-per-il-servizio-militare-obbligatorio.html',
    },
  ],
};

// DIRIGENTI SINDACALI (dal database interno)
const DIRIGENTI = {
  veneto: {
    regionale: [
      'Antonio Grande – Segretario Generale Regionale – 335 147 0886 – antoniogrande81@gmail.com',
      'Andrea Modolo – Segretario Generale Regionale Aggiunto – 377 096 9168 – andreamodolo.85@gmail.com',
      'Niccolò Foroni – Segretario Regionale – 340 727 9855 – nforoni86@gmail.com',
      'Massimo Salciccioli – Segretario Regionale – 331 369 1024 – contemax1970@gmail.com',
      'Massimiliano Riccio – Segretario Generale Provinciale – 331 364 7088 – max.riccio2015@tiscali.it',
      'Gianluca Sciuto – Segretario Generale Provinciale – 340 817 3344 – gianluca.sciuto@live.it'
    ],
    email: 'veneto@carabinierinsc.it'
  },
  treviso: {
    provinciale: [
      'Andrea Modolo – Segretario Generale Provinciale – 377 096 9168 – andreamodolo.85@gmail.com',
      'Aldo Capua – Segretario Provinciale – 3207025658',
      'Niccolò Foroni – Segretario Generale Provinciale – 340 727 9855 – nforoni86@gmail.com',
      'Errante Christian – Segretario Generale Provinciale – 3893167040 – christian91m@hotmail.it'
    ],
    email: 'treviso@carabinierinsc.it'
  }
};

const CONTACT_LINK = 'https://myapp31.vercel.app/richieste.html';

// EXPERT SYSTEM PROMPT COMPLETO
const EXPERT_SYSTEM_PROMPT = `Sei un assistente virtuale professionale per il personale dell'Arma dei Carabinieri e il Sindacato. Rispondi con competenza su tutti gli aspetti della professione, attingendo sempre alle fonti ufficiali indicate salvo che per l'elenco dirigenti (già caricato internamente).

### AMBITI DI COMPETENZA E FONTI UFFICIALI

1. **Disciplina Militare** - Tipologie di sanzioni, strumenti, principi e procedure
2. **Codice dell'Ordinamento Militare (COM)** - Doveri, diritti, gerarchia, avanzamenti  
3. **Testo Unico dell'Ordinamento Militare (TUOM)** - Disposizioni generali e specifiche
4. **Leggi Ordinarie e Speciali** - Applicabili alle Forze Armate e all'Arma
5. **TULPS** - Testo Unico Leggi Pubblica Sicurezza
6. **Codice della Strada (CdS)** - Norme sulla circolazione, competenze
7. **Codice Civile** - Aspetti di rilevanza civile per militari
8. **Regolamento Generale Arma** - Disposizioni interne e organizzative
9. **Regolamento Organico Arma** - Struttura e funzioni  
10. **Concorsi nell'Arma** - Bandi, procedure, requisiti per tutti i ruoli
11. **Pensioni Militari** - Requisiti, calcolo, sistemi, coefficienti di trasformazione

### GESTIONE DIRIGENTI
Quando richiesto informazioni sui dirigenti, chiedi sempre:
a) Livello (regionale/provinciale)  
b) Se provinciale, specificare la provincia

### STILE E RESPONSABILITÀ
- Linguaggio professionale, chiaro e puntuale
- Cita sempre la fonte ufficiale con link diretto  
- Usa elenchi e struttura ordinata per maggiore chiarezza
- Non fornire consulenza legale individuale
- Se l'informazione non è nelle fonti indicate, rimanda al dirigente competente

Rispondi sempre in italiano, con tono rispettoso e istituzionale.`;

// Rileva il topic dalla domanda (versione expert)
function detectExpertTopic(query = '') {
  const q = query.toLowerCase();
  
  // Dirigenti
  if (/dirigent[ei]|regionale|provinciale|contatt|sindacat/i.test(q)) return 'dirigenti';
  
  // Ambiti tecnici specifici
  if (/disciplina|sanzion|procediment.*disciplinar/i.test(q)) return 'disciplina';
  if (/\bcom\b|ordinamento\s+militar|doveri|diritti|gerarchia|avanzament/i.test(q)) return 'com';
  if (/tuom|testo\s+unico\s+(dell'|dell')?ordinamento/i.test(q)) return 'tuom';
  if (/gazzetta|legge|decreto|normattiva|disposizion/i.test(q)) return 'leggi';
  if (/tulps|pubblica\s+sicurezza|porto\s+armi/i.test(q)) return 'tulps';
  if (/codice\s+della\s+strada|cds\b|circolazion|patente/i.test(q)) return 'cds';
  if (/codice\s+civile|civile\b|contratt/i.test(q)) return 'civile';
  if (/regolamento\s+generale/i.test(q)) return 'regolamento_generale';
  if (/regolamento\s+organico|struttura.*arma|organizzazion/i.test(q)) return 'regolamento_organico';
  
  // Concorsi (keywords estese)
  if (/concors|bando|allievi|ufficiali|maresciall|atleti|reclutament|selezione/i.test(q)) return 'concorsi';
  
  // Pensioni (keywords estese)  
  if (/pension|ausiliar|riserv|tfs|tfr|contribut|requisit.*pensionist|coefficent|età.*pensiona|inps/i.test(q)) return 'pensioni';
  
  // Licenze/istanze (nuovo)
  if (/licenz|istanza|pratica|permess|autorizzazion|domanda/i.test(q)) return 'licenze_istanze';
  
  return 'generale';
}

// Gestione dirigenti con lista completa
function handleDirigentiQuery(query) {
  const q = query.toLowerCase();
  let response = '';
  
  if (q.includes('treviso')) {
    response = `**DIRIGENTI PROVINCIA DI TREVISO:**\n\n${DIRIGENTI.treviso.provinciale.join('\n')}\n\n**Email:** ${DIRIGENTI.treviso.email}`;
  } else if (q.includes('veneto') || q.includes('regionale')) {
    response = `**DIRIGENTI REGIONE VENETO:**\n\n${DIRIGENTI.veneto.regionale.join('\n')}\n\n**Email:** ${DIRIGENTI.veneto.email}`;
  } else {
    response = `Per fornirti i contatti corretti, specifica:\n\n**a) Livello:** regionale o provinciale\n**b) Se provinciale:** indica la provincia\n\n**Esempio:** "Dirigenti provinciali di Treviso" oppure "Dirigenti regionali Veneto"`;
  }
  
  return response + `\n\nPer altre province o regioni, invia una richiesta specifica tramite: ${CONTACT_LINK}`;
}

// System prompt dinamico con fonti specifiche
function buildExpertSystemPrompt(topic) {
  let contextSources = '';
  
  if (topic !== 'dirigenti' && topic !== 'generale') {
    const sources = EXPERT_SOURCES[topic] || [];
    if (sources.length > 0) {
      contextSources = '\n\n### FONTI UFFICIALI DISPONIBILI:\n' + 
        sources.map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}`).join('\n\n');
    }
  }
  
  return EXPERT_SYSTEM_PROMPT + contextSources + '\n\nCita sempre le fonti con [1][2][3] quando pertinente.';
}

// Chiusura speciale per licenze/istanze
function getLicenseClosing() {
  return `\n\nPuoi verificare tutti i dettagli consultando direttamente la fonte ufficiale indicata. Per questa pratica ti consiglio di contattare il dirigente di zona: specifica se regionale o provinciale e di quale provincia. Puoi inviare subito la tua richiesta tramite questo link: ${CONTACT_LINK}\n\n**Per problemi in dettaglio contatta il tuo dirigente di zona.**`;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verifica variabili d'ambiente
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY non configurata' });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: 'Supabase non configurato' });
    }

    // Verifica autenticazione Supabase
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token mancante' });
    }

    // Verifica token con Supabase
    const supabaseResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': process.env.SUPABASE_ANON_KEY
      }
    });

    if (!supabaseResponse.ok) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    const user = await supabaseResponse.json();

    // Parse del body
    const { 
      messages = [], 
      model = 'gpt-4o-mini', 
      max_tokens = 800, 
      temperature = 0.2 
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messaggi mancanti' });
    }

    // Rileva il topic dall'ultimo messaggio utente
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const topic = detectExpertTopic(lastUserMessage);

    // Gestione speciale per dirigenti (risposta diretta)
    if (topic === 'dirigenti') {
      const dirigentiResponse = handleDirigentiQuery(lastUserMessage);
      
      return res.status(200).json({
        choices: [{
          message: {
            content: dirigentiResponse,
            role: 'assistant'
          }
        }],
        usage: { total_tokens: 50 },
        expert_topic: topic,
        direct_response: true
      });
    }

    // Costruisci il prompt expert con fonti specifiche
    const expertPrompt = buildExpertSystemPrompt(topic);
    
    const openaiMessages = [
      { role: 'system', content: expertPrompt },
      ...messages
    ];

    // Chiamata a OpenAI con parametri expert
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: openaiMessages,
        max_tokens,
        temperature,
        user: user.id,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('OpenAI Error:', errorData);
      return res.status(500).json({ 
        error: 'Servizio temporaneamente non disponibile',
        details: errorData.error?.message 
      });
    }

    const openaiData = await openaiResponse.json();

    // Post-processing expert della risposta
    if (openaiData?.choices?.[0]?.message?.content) {
      let content = openaiData.choices[0].message.content;

      // Aggiungi strumenti per pensioni (expert mode)
      if (topic === 'pensioni') {
        content += '\n\n**CALCOLATORI ATTENDIBILI:**\n• **APPLICATIVO CUSI** (Centro Unico Stipendiale Interforze) - Solo per personale militare a 2 anni dalla pensione\n• **MyINPS** - Sezione "La mia pensione futura" (riservato agli iscritti)\n• **Simulatore Altroconsumo** - https://www.altroconsumo.it/soldi/lavoro-pensione/calcola-risparmia/calcolarepensioni';
      }

      // Chiusura speciale per licenze/istanze
      if (topic === 'licenze_istanze') {
        content += getLicenseClosing();
      }

      // Aggiungi fonti expert in fondo
      const sources = EXPERT_SOURCES[topic];
      if (sources && sources.length > 0) {
        content += '\n\n**FONTI UFFICIALI:**\n' + sources.map((s, i) => `[${i + 1}] ${s.title}\n    ${s.url}`).join('\n');
      }

      openaiData.choices[0].message.content = content;
    }

    // Aggiungi metadati expert
    openaiData.expert_topic = topic;
    openaiData.sources_count = EXPERT_SOURCES[topic]?.length || 0;

    // Log della conversazione expert
    try {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/chat_logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id: user.id,
          topic: topic,
          query: lastUserMessage,
          response: openaiData.choices[0]?.message?.content?.substring(0, 1000),
          tokens_used: openaiData.usage?.total_tokens,
          expert_mode: true,
          created_at: new Date().toISOString()
        })
      });
    } catch (logError) {
      console.warn('Log error (non-blocking):', logError.message);
    }

    return res.status(200).json(openaiData);

  } catch (error) {
    console.error('Expert API Error:', error);
    return res.status(500).json({ 
      error: 'Errore interno del server',
      message: error.message 
    });
  }
}

// api/chat.js - Versione semplificata compatibile con Vercel

// FONTI PINNATE per ogni argomento
const PINNED_SOURCES = {
  disciplina: [
    {
      title: 'Guida Tecnica — Procedure disciplinari (2023) — Difesa',
      url: 'https://www.difesa.it/assets/allegati/6105/06_guida_tecnica_disciplina_anno_2023.pdf',
    },
  ],
  concorsi: [
    { title: 'Arma — Area Concorsi', url: 'https://www.carabinieri.it/concorsi/area-concorsi' },
    { title: 'Extranet Arma — Domande online', url: 'https://extranet.carabinieri.it/concorsionline20' },
    { title: 'INPA — Portale reclutamento', url: 'https://www.inpa.gov.it' },
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
  ],
  com: [
    {
      title: 'COM — Supplemento al n.3 — Carabinieri',
      url: 'https://www.carabinieri.it/docs/default-source/default-document-library/supplemento-al-n-3.pdf?sfvrsn=811b6d23_0',
    },
  ],
  generale: [
    { title: 'Arma dei Carabinieri — Sito istituzionale', url: 'https://www.carabinieri.it' },
    { title: 'Gazzetta Ufficiale della Repubblica Italiana', url: 'https://www.gazzettaufficiale.it' },
  ],
};

const CONTACT_LINK = 'https://myapp31.vercel.app/richieste.html';

// Rileva il topic dalla domanda
function detectTopic(query = '') {
  const q = query.toLowerCase();
  if (/dirigent[ei]|regionale|provinciale/.test(q)) return 'dirigenti';
  if (/disciplina|sanzion/i.test(q)) return 'disciplina';
  if (/\bcom\b|ordinamento\s+militar/i.test(q)) return 'com';
  if (/concors/i.test(q)) return 'concorsi';
  if (/pension/i.test(q) || /ausiliar/i.test(q) || /\briserv[ae]\b/.test(q) || /\btfs\b/.test(q)) return 'pensioni';
  return 'generale';
}

// System prompt per OpenAI
function buildSystemPrompt(topic) {
  const sources = PINNED_SOURCES[topic] || PINNED_SOURCES.generale;
  const sourcesList = sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n');
  
  return `Sei Virgilio, assistente virtuale professionale per il personale dell'Arma dei Carabinieri e il Sindacato.

REGOLE:
- Rispondi in italiano con tono chiaro e istituzionale
- Non fornire consulenza legale individuale
- Cita sempre le fonti usando [1][2][3]
- Se l'informazione non è nelle fonti, dichiaralo e rimanda al dirigente competente

FONTI UFFICIALI DISPONIBILI:
${sourcesList}

AMBITI COPERTI:
- Disciplina Militare, COM, Concorsi, Pensioni Militari, Normative generali
- Per dirigenti: chiedi prima livello (regionale/provinciale) e provincia se applicabile

${topic === 'pensioni' ? '\nSTRUMENTI PENSIONI:\n• CUSI — Applicativo interforze (simulazioni)\n• MyINPS — "La mia pensione futura"\n• Calcolatore Altroconsumo — https://www.altroconsumo.it/soldi/lavoro-pensione/calcola-risparmia/calcolarepensioni' : ''}`;
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

    const token = authHeader.split(' ')[1];
    
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
      max_tokens = 600, 
      temperature = 0.3 
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messaggi mancanti' });
    }

    // Rileva il topic dall'ultimo messaggio utente
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const topic = detectTopic(lastUserMessage);

    // Costruisci il prompt con fonti
    const systemPrompt = buildSystemPrompt(topic);
    
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Chiamata a OpenAI
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
        user: user.id
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

    // Post-processing della risposta
    if (openaiData?.choices?.[0]?.message?.content) {
      let content = openaiData.choices[0].message.content;

      // Aggiungi strumenti per pensioni
      if (topic === 'pensioni') {
        content += '\n\nStrumenti utili:\n• CUSI — Applicativo interforze (simulazioni ausiliaria/riserva)\n• MyINPS — "La mia pensione futura"\n• Calcolatore Altroconsumo — https://www.altroconsumo.it/soldi/lavoro-pensione/calcola-risparmia/calcolarepensioni';
      }

      // Aggiungi link contatti per licenze/istanze
      if (lastUserMessage.toLowerCase().includes('licenz') || lastUserMessage.toLowerCase().includes('istanza')) {
        content += `\n\nPer questa pratica contatta il dirigente di zona: ${CONTACT_LINK}`;
      }

      // Aggiungi fonti in fondo
      const sources = PINNED_SOURCES[topic] || PINNED_SOURCES.generale;
      content += '\n\nFonti:\n' + sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n');

      openaiData.choices[0].message.content = content;
    }

    // Log della conversazione (opzionale, senza bloccare se fallisce)
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
          created_at: new Date().toISOString()
        })
      });
    } catch (logError) {
      console.warn('Log error (non-blocking):', logError.message);
    }

    return res.status(200).json(openaiData);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Errore interno del server',
      message: error.message 
    });
  }
}

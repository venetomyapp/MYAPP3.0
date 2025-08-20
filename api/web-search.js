// pages/api/web-search.js
// Endpoint per ricerca web quando non si trovano documenti in R2

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query mancante' });
    }

    // Risultati di fallback per il Sindacato Carabinieri
    const fallbackResults = [
      {
        title: "Normativa Sindacato Carabinieri - Informazioni Generali",
        snippet: "Per normative specifiche su contratti, disciplina e diritti del personale, consultare i documenti ufficiali aggiornati presso il sindacato.",
        url: "sindacato-carabinieri"
      },
      {
        title: "Regolamenti e Disposizioni",
        snippet: "Le disposizioni specifiche su ferie, permessi, concorsi e avanzamenti sono contenute nei regolamenti ufficiali del Corpo.",
        url: "regolamenti-ufficiali"
      }
    ];

    res.status(200).json({
      query,
      results: fallbackResults,
      source: "fallback_search",
      note: "Informazioni generali - Per dettagli specifici consultare documenti ufficiali"
    });

  } catch (error) {
    res.status(500).json({ 
      error: "Errore ricerca web", 
      details: error.message 
    });
  }
}

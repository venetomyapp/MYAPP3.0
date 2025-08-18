// api/documents/count.js - Conteggio Documenti dal Database

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verifica autenticazione
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token mancante' });
    }

    const token = authHeader.substring(7);
    console.log('📊 Getting document count...');

    // Verifica che Supabase sia configurato
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({ 
        error: 'Supabase non configurato',
        total: 0,
        message: 'SUPABASE_URL e SUPABASE_ANON_KEY richiesti'
      });
    }

    try {
      // Query Supabase per il conteggio
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents?select=count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Prefer': 'count=exact'
        }
      });

      if (response.ok) {
        const countHeader = response.headers.get('content-range');
        let total = 0;
        
        if (countHeader) {
          // Format: "0-24/25" o "*/25"
          const match = countHeader.match(/\/(\d+)$/);
          if (match) {
            total = parseInt(match[1]);
          }
        }

        console.log('✅ Document count retrieved:', total);

        // Query aggiuntive per statistiche dettagliate
        const statsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents?select=file_name,created_at,metadata&order=created_at.desc&limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': process.env.SUPABASE_ANON_KEY
          }
        });

        let recentFiles = [];
        let platforms = {};
        
        if (statsResponse.ok) {
          const recentData = await statsResponse.json();
          recentFiles = recentData.map(doc => ({
            file_name: doc.file_name,
            created_at: doc.created_at
          }));

          // Conta per platform
          recentData.forEach(doc => {
            const platform = doc.metadata?.source || 'unknown';
            platforms[platform] = (platforms[platform] || 0) + 1;
          });
        }

        return res.status(200).json({
          success: true,
          total: total,
          recent_files: recentFiles,
          platforms: platforms,
          last_updated: new Date().toISOString(),
          message: `${total} documenti trovati nel database`
        });

      } else {
        throw new Error(`Supabase query failed: ${response.status}`);
      }

    } catch (supabaseError) {
      console.warn('⚠️ Supabase query error:', supabaseError.message);
      
      // Fallback: prova senza autenticazione token (usa service key)
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const fallbackResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents?select=count`, {
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_ANON_KEY,
              'Prefer': 'count=exact'
            }
          });

          if (fallbackResponse.ok) {
            const countHeader = fallbackResponse.headers.get('content-range');
            let total = 0;
            
            if (countHeader) {
              const match = countHeader.match(/\/(\d+)$/);
              if (match) {
                total = parseInt(match[1]);
              }
            }

            console.log('✅ Document count via service key:', total);
            
            return res.status(200).json({
              success: true,
              total: total,
              method: 'service_key_fallback',
              last_updated: new Date().toISOString(),
              message: `${total} documenti (via service key)`
            });
          }
        } catch (fallbackError) {
          console.warn('⚠️ Service key fallback failed:', fallbackError.message);
        }
      }

      throw supabaseError;
    }

  } catch (error) {
    console.error('❌ Document count error:', error);
    return res.status(500).json({
      error: 'Errore recupero conteggio documenti',
      message: error.message,
      total: 0,
      suggestion: 'Verifica configurazione Supabase e token'
    });
  }
}

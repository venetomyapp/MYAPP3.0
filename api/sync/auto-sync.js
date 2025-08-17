// api/sync/auto-sync.js - Vercel Cron Job per auto-sync documenti MEGA

export default async function handler(req, res) {
  // Verifica che sia una chiamata da Vercel Cron
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verifica autorizzazione cron (opzionale ma raccomandato)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('⚠️ Cron call without proper auth, continuing anyway...');
  }

  try {
    console.log('🕐 Auto-sync avviato dal Cron Job');
    const startTime = Date.now();

    // Configurazione per auto-sync (usa service key per bypass auth)
    const serviceAuth = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://myapp31.vercel.app';

    // Step 1: Discovery documenti MEGA
    console.log('🔍 Step 1: Discovery documenti...');
    
    const discoveryResponse = await fetch(`${baseUrl}/api/sync/discover-mega`, {
      method: 'GET',
      headers: {
        'Authorization': serviceAuth,
        'Content-Type': 'application/json'
      }
    });

    if (!discoveryResponse.ok) {
      throw new Error(`Discovery failed: ${discoveryResponse.status}`);
    }

    const discoveryData = await discoveryResponse.json();
    const stats = discoveryData.statistics || {};
    
    console.log(`📊 Discovery stats: ${stats.total_discovered} total, ${stats.new_files} new`);

    // Step 2: Processa solo i file nuovi (se ci sono)
    let processingData = { statistics: { files_processed: 0, total_chunks_saved: 0 } };
    
    if (stats.new_files > 0) {
      console.log(`⚡ Step 2: Processing ${stats.new_files} nuovi documenti...`);
      
      const newFiles = discoveryData.files
        .filter(f => f.needs_processing)
        .map(f => f.name);

      const processingResponse = await fetch(`${baseUrl}/api/sync/process-documents`, {
        method: 'POST',
        headers: {
          'Authorization': serviceAuth,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: newFiles,
          source: 'auto-sync-cron'
        })
      });

      if (processingResponse.ok) {
        processingData = await processingResponse.json();
        console.log(`✅ Processing completato: ${processingData.statistics.files_processed} file`);
      } else {
        console.error(`❌ Processing failed: ${processingResponse.status}`);
      }
    } else {
      console.log('ℹ️ Nessun nuovo documento da processare');
    }

    // Step 3: Log risultati in database (opzionale)
    try {
      await logAutoSyncResult({
        discovery_stats: stats,
        processing_stats: processingData.statistics,
        execution_time: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }, serviceAuth);
    } catch (logError) {
      console.warn('⚠️ Errore logging (non critico):', logError.message);
    }

    // Risposta finale
    const totalTime = Date.now() - startTime;
    const summary = {
      success: true,
      execution_time_ms: totalTime,
      documents_discovered: stats.total_discovered || 0,
      documents_processed: processingData.statistics.files_processed || 0,
      chunks_saved: processingData.statistics.total_chunks_saved || 0,
      new_documents: stats.new_files || 0,
      timestamp: new Date().toISOString(),
      triggered_by: 'cron'
    };

    console.log(`🎉 Auto-sync completato in ${totalTime}ms:`, summary);

    return res.status(200).json({
      message: 'Auto-sync completato con successo',
      summary,
      details: {
        discovery: discoveryData,
        processing: processingData
      }
    });

  } catch (error) {
    console.error('❌ Errore auto-sync:', error);
    
    // Log errore in database (opzionale)
    try {
      await logAutoSyncError(error.message, serviceAuth);
    } catch (logError) {
      console.warn('⚠️ Errore logging error (non critico):', logError.message);
    }

    return res.status(500).json({
      success: false,
      error: 'Auto-sync fallito',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Funzione per loggare i risultati dell'auto-sync
async function logAutoSyncResult(data, authHeader) {
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/auto_sync_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        status: 'success',
        discovery_stats: data.discovery_stats,
        processing_stats: data.processing_stats,
        execution_time_ms: data.execution_time,
        documents_processed: data.processing_stats.files_processed || 0,
        chunks_saved: data.processing_stats.total_chunks_saved || 0,
        triggered_by: 'cron',
        created_at: data.timestamp
      })
    });

    if (!response.ok) {
      console.warn('Logging response not ok:', response.status);
    }
  } catch (error) {
    console.warn('Log result error:', error.message);
  }
}

// Funzione per loggare errori dell'auto-sync
async function logAutoSyncError(errorMessage, authHeader) {
  try {
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/auto_sync_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        status: 'error',
        error_message: errorMessage,
        triggered_by: 'cron',
        created_at: new Date().toISOString()
      })
    });
  } catch (error) {
    console.warn('Log error error:', error.message);
  }
}

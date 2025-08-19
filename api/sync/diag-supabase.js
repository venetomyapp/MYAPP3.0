// pages/api/sync/diag-supabase.js
export const config = { runtime: 'nodejs' };

import { createClient } from '@supabase/supabase-js';

function supa() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req, res) {
  const envPresence = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const out = { ok: true, envPresence };

  try {
    const db = supa();

    // test documents
    const doc = await db.from('documents').select('id, path').limit(1);
    out.documents_ok = !doc.error;
    if (doc.error) out.documents_error = doc.error.message;

    // test chunks
    const chk = await db.from('chunks').select('id, doc_id').limit(1);
    out.chunks_ok = !chk.error;
    if (chk.error) out.chunks_error = chk.error.message;

    // test funzione match_chunks (se presente)
    try {
      const zero = new Array(1536).fill(0);
      const rpc = await db.rpc('match_chunks', { query_embedding: zero, match_count: 1 });
      out.match_chunks_ok = !rpc.error;
      if (rpc.error) out.match_chunks_error = rpc.error.message;
    } catch (e) {
      out.match_chunks_ok = false;
      out.match_chunks_error = String(e);
    }

    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, ...out, error: String(e) });
  }
}

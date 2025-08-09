"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin • Ingestion da Google Drive
 *
 * Pagina protetta: richiede login con Supabase e autorizzazione admin.
 * Mostra un pulsante per avviare l'import dei file dalla cartella Drive configurata.
 */
export default function IngestDriveAdminPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.warn("Env Supabase mancanti nel client.");
    }
    return createClient(url!, key!);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email || null;
      setUserEmail(email);
    })();
  }, [supabase]);

  async function triggerImport() {
    try {
      setStatus("Avvio import...");
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) {
        setStatus("Devi effettuare l'accesso per continuare.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/ingest/drive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await res.json().catch(() => ({}));
      setResults(payload);

      if (!res.ok) {
        setStatus(`Errore: ${payload.error || res.statusText}`);
      } else {
        const count = payload?.ingested ?? payload?.importedCount ?? 0;
        setStatus(`✅ Import completato • File indicizzati: ${count}`);
      }
    } catch (e: any) {
      setStatus(`Errore: ${e?.message || "imprevisto"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import da Google Drive</h1>
        <p className="text-sm text-slate-600 mt-1">
          Questa pagina avvia l'indicizzazione dei PDF / DOCX / TXT presenti nella cartella Drive configurata.
          Devi essere autenticato come admin per usarla.
        </p>
      </div>

      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="text-sm">
          <div className="font-medium">Stato autenticazione</div>
          <div className="text-slate-600">{userEmail ? `Loggato come ${userEmail}` : "Non autenticato"}</div>
        </div>
        <button
          onClick={triggerImport}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
        >
          {loading ? "Import in corso..." : "Importa ora"}
        </button>
      </div>

      {status && (
        <div className="text-sm rounded-lg p-3 border" role="status">
          {status}
        </div>
      )}

      {results && (
        <pre className="bg-slate-900 text-slate-50 text-xs p-3 rounded-lg overflow-x-auto">
{JSON.stringify(results, null, 2)}
        </pre>
      )}

      <div className="text-xs text-slate-500">
        Suggerimento: se vedi errore 401/Forbidden, controlla la allow-list admin in <code>app/api/_utils/auth.ts</code>.
      </div>
    </div>
  );
}

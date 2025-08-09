// app/api/ingest/drive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/_utils/auth";
import { listFolderFiles, downloadFile } from "@/lib/drive";
import { parseBufferToText, chunkText } from "@/lib/parse";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedBatch(texts: string[]) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supaUrl || !serviceKey) throw new Error("Supabase server env missing");

    const supabase = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID");

    const files = await listFolderFiles(folderId);
    if (!files.length) return NextResponse.json({ ok: true, ingested: 0, results: [] });

    const results: any[] = [];

    for (const f of files) {
      const buf = await downloadFile(f.id);
      const text = await parseBufferToText(buf, f.mimeType, f.name);
      if (!text || text.length < 50) {
        results.push({ name: f.name, skipped: true, reason: "empty_or_short" });
        continue;
      }

      // documento
      const { data: doc, error: docErr } = await supabase
        .from("knowledge_documents")
        .insert({ title: f.name, source_url: `https://drive.google.com/file/d/${f.id}/view` })
        .select("id")
        .single();
      if (docErr) throw docErr;

      // chunk + embedding
      const chunks = chunkText(text, 1200, 200);
      const embeddings = await embedBatch(chunks);

      const rows = chunks.map((c, idx) => ({
        document_id: doc.id,
        chunk_index: idx,
        content: c,
        embedding: embeddings[idx] as any, // vector(1536)
      }));

      const { error: insErr } = await supabase.from("knowledge_chunks").insert(rows);
      if (insErr) throw insErr;

      results.push({ name: f.name, chunks: rows.length });
    }

    return NextResponse.json({ ok: true, ingested: results.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error importing from Drive" }, { status: 500 });
  }
}

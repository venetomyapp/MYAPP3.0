// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedQuery(text: string) {
  const r = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return r.data[0].embedding;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    const userMsg = messages[messages.length - 1]?.content || body.query || "";
    const useDrive = Boolean(body.enable_drive_knowledge);

    // Retrieval (se richiesto)
    let context = "";
    let sources: Array<{ id: number; title?: string; url?: string | null; similarity?: number }> = [];

    if (useDrive && userMsg) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );

      const qEmb = await embedQuery(userMsg);
      // chiama la funzione SQL match_knowledge
      const { data: matches, error } = await supabase.rpc("match_knowledge", {
        query_embedding: qEmb as any,
        match_count: 8,
        similarity_threshold: 0.72,
      });
      if (error) throw error;

      if (Array.isArray(matches) && matches.length) {
        context = matches
          .map(
            (m: any, i: number) =>
              `[#${i + 1}] ${m.title || "Documento"}${m.source_url ? ` (${m.source_url})` : ""}\n${m.content}`
          )
          .join("\n\n");
        sources = matches.map((m: any, i: number) => ({
          id: i + 1,
          title: m.title,
          url: m.source_url,
          similarity: m.similarity,
        }));
      }
    }

    const systemContext =
      body.system_context ||
      "Sei Virgilio, assistente del Sindacato Carabinieri. Rispondi in modo conciso e professionale. Se usi il contesto recuperato, aggiungi 'Fonti:' con riferimenti [#].";

    const system = [
      systemContext,
      "Di seguito un CONTENUTO RECUPERATO dai documenti (può essere vuoto):",
      context || "(nessun contenuto recuperato)",
      "Regole:",
      "- Se rispondi usando il contesto, aggiungi 'Fonti:' con riferimenti [#].",
      "- Se la domanda non è coperta, dillo chiaramente.",
    ].join("\n\n");

    const completion = await openai.chat.completions.create({
      model: body.model || "gpt-4o-mini",
      temperature: body.temperature ?? 0.5,
      max_tokens: body.max_tokens ?? 500,
      messages: [{ role: "system", content: system }, ...messages],
    });

    const text = completion.choices[0].message?.content || "";

    return NextResponse.json({
      choices: [{ message: { content: text } }],
      usage: completion.usage || {},
      web_search_performed: false,
      drive_knowledge_used: useDrive && context.length > 0,
      sources,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Errore" }, { status: 500 });
  }
}

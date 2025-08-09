// app/api/health/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function GET() {
  try {
    const okEnv = [
      !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      !!process.env.OPENAI_API_KEY,
    ].every(Boolean);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error: pingErr } = await supabase.from("knowledge_documents").select("id").limit(1);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    await openai.models.list();

    return NextResponse.json({ okEnv, supabaseOk: !pingErr, openaiOk: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "health error" }, { status: 500 });
  }
}

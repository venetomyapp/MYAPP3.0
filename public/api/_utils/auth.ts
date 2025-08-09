// app/api/_utils/auth.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export async function requireAdmin(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Supabase env missing");

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new Error("Missing auth token");

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new Error("Invalid user");

  // allowlist admin
  const ADMINS = ["veneto.nsc@gmail.com"];
  if (!ADMINS.includes(data.user.email || "")) throw new Error("Forbidden");

  return data.user;
}

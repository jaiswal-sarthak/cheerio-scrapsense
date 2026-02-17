import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Dev-only: test Supabase service role access to public.users and public.accounts.
 * Open http://localhost:3000/api/auth/check-db to see if your .env Supabase key can read the schema.
 * Returns 404 in production.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secret) {
    return NextResponse.json({
      ok: false,
      error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env",
    });
  }

  const supabase = createClient(url, secret, {
    db: { schema: "public" },
    auth: { persistSession: false },
  });

  const results: { users?: string; accounts?: string } = {};

  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("id, email")
    .limit(1);

  if (usersError) {
    results.users = `Error: ${usersError.message} (code: ${usersError.code})`;
  } else {
    results.users = `OK (${usersData?.length ?? 0} row(s))`;
  }

  const { data: accountsData, error: accountsError } = await supabase
    .from("accounts")
    .select("id, provider, user_id")
    .limit(1);

  if (accountsError) {
    results.accounts = `Error: ${accountsError.message} (code: ${accountsError.code})`;
  } else {
    results.accounts = `OK (${accountsData?.length ?? 0} row(s))`;
  }

  const ok = !usersError && !accountsError;
  return NextResponse.json({
    ok,
    message: ok
      ? "Supabase service role can read public.users and public.accounts. Adapter should work."
      : "Fix the errors above (e.g. use service_role key, run migration for public schema).",
    ...results,
  });
}

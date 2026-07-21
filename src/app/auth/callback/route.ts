import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges the Supabase email confirmation / invite code for a session,
// then sends the user into the app. Lives outside [locale] on purpose —
// the link embedded in emails must be a fixed path.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/en-US/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/en-US/login`);
}

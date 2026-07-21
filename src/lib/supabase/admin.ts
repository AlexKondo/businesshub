import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role client — server-only, bypasses RLS. Never import from a
// client component or expose this key to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

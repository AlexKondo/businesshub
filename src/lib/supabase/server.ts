import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getCookieDomain } from "./cookie-domain";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: getCookieDomain() },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component without a mutable cookie store — safe to ignore
            // when middleware is refreshing the session on every request.
          }
        },
      },
    }
  );
}

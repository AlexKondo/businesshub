import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import { getCookieDomain } from "./cookie-domain";
import { toSessionScopedCookie } from "./session-cookie";

// Supabase's default browser cookie handling (document.cookie under the
// hood) always persists 400 days regardless of any maxAge passed via
// cookieOptions — see toSessionScopedCookie's comment. Overriding getAll/
// setAll here is the only way to intercept each cookie write and make it
// session-scoped (gone when the browser closes) instead.
function getAll(): { name: string; value: string }[] {
  if (typeof document === "undefined") return [];
  return document.cookie
    .split("; ")
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf("=");
      return {
        name: decodeURIComponent(eq === -1 ? pair : pair.slice(0, eq)),
        value: decodeURIComponent(eq === -1 ? "" : pair.slice(eq + 1)),
      };
    });
}

function setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
  if (typeof document === "undefined") return;
  for (const { name, value, options } of cookiesToSet) {
    const scoped = toSessionScopedCookie(options);
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    if (scoped.path) cookie += `; Path=${scoped.path}`;
    if (scoped.domain) cookie += `; Domain=${scoped.domain}`;
    if (scoped.sameSite) cookie += `; SameSite=${scoped.sameSite}`;
    if (scoped.secure) cookie += `; Secure`;
    if (typeof scoped.maxAge === "number") cookie += `; Max-Age=${scoped.maxAge}`;
    document.cookie = cookie;
  }
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: getCookieDomain() },
      cookies: { getAll, setAll },
    }
  );
}

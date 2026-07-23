import type { CookieOptions } from "@supabase/ssr";

// @supabase/ssr hardcodes every auth cookie it writes to persist 400 days
// (its internal cookie-writing code ignores any maxAge passed via
// cookieOptions at client-construction time — the only place that actually
// takes effect is here, at the point each cookie is written via setAll).
// Stripping maxAge/expires turns them into session cookies (gone once the
// browser closes) so a user isn't kept signed in indefinitely — EXCEPT when
// maxAge is explicitly 0, which is the library's own signal to delete a
// cookie (e.g. on sign-out) and must be preserved untouched.
export function toSessionScopedCookie(options: CookieOptions): CookieOptions {
  if (options.maxAge === 0) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest;
}

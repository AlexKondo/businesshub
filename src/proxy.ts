import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { getCookieDomain } from "./lib/supabase/cookie-domain";
import { toSessionScopedCookie } from "./lib/supabase/session-cookie";
import { getGeo, localeFromCountry } from "./lib/geo";
import { ROOT_DOMAIN, resolveTenantSlug } from "./lib/tenant";
import { ensureSupplierMembership } from "./lib/supplier-membership";

const intlMiddleware = createMiddleware(routing);

// Records one access-log row per root-domain page view (visitor IP + geo).
// Fire-and-forget via event.waitUntil so it never adds latency, and fully
// self-contained in try/catch so a logging failure can never break routing.
async function logAccess(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return;

    const { ip, country, city, region } = getGeo(request.headers);
    await fetch(`${supabaseUrl}/rest/v1/access_logs`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        ip,
        country,
        city,
        region,
        path: request.nextUrl.pathname,
        locale: request.nextUrl.pathname.split("/")[1] || null,
        user_agent: request.headers.get("user-agent"),
      }),
    });
  } catch {
    // logging must never affect the request
  }
}

// Resolves the locale for a bare "/" visit (no locale in the URL yet): an
// explicit saved choice (NEXT_LOCALE cookie) always wins, otherwise fall
// back to the visitor's region (Cloudflare geo headers).
function initialLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && (routing.locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale;
  }
  try {
    return localeFromCountry(getGeo(request.headers).country);
  } catch {
    return routing.defaultLocale;
  }
}

// Detects "/", "/en-US", "/en-US/" etc. — the tenant subdomain's own root,
// where the public tenant landing page lives. Any other path is app
// territory and stays behind the membership gate.
function matchBareRootPath(pathname: string): { locale: string } | null {
  if (pathname === "/") return { locale: routing.defaultLocale };
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname === `/${locale}/`) {
      return { locale };
    }
  }
  return null;
}

// Detects "/login", "/en-US/login" etc. — an anonymous visitor on a tenant
// subdomain must be able to log in without ever being bounced to the root
// domain (confusing for a supplier who arrived at a specific company's
// page). LoginForm itself redirects to the visitor's actual tenant
// subdomain after a successful sign-in.
function matchLoginPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  return routing.locales.some(
    (locale) => pathname === `/${locale}/login` || pathname === `/${locale}/login/`
  );
}

// /platform-admin is platform-wide (not tenant data), so it must always be
// reached from the root domain — never from whichever tenant subdomain the
// super admin happened to be browsing. See matchLoginPath above for the
// analogous "this path is special, resolve it before the generic app gate"
// pattern.
function matchPlatformAdminPath(pathname: string): boolean {
  if (pathname === "/platform-admin") return true;
  return routing.locales.some(
    (locale) =>
      pathname === `/${locale}/platform-admin` || pathname.startsWith(`/${locale}/platform-admin/`)
  );
}

// Pulls the locale prefix out of a path that already has one (e.g.
// "/pt-BR/profile" -> "pt-BR"), so redirecting an anonymous visitor to
// /login preserves whatever language they were already browsing in.
function extractLocale(pathname: string): string | null {
  return (
    routing.locales.find(
      (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
    ) ?? null
  );
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const tenantSlug = resolveTenantSlug(request.headers.get("host") ?? "");

  // root domain: locale routing + geo-based first-language + access logging.
  if (!tenantSlug) {
    try {
      // log real page views only (the bare "/" just redirects, so its target
      // "/{locale}" is the one that gets logged — avoids double counting).
      if (request.nextUrl.pathname !== "/") {
        event.waitUntil(logAccess(request));
      }

      // first-time visitor (no saved language) on the bare root: start in the
      // language of their region (Cloudflare CF-IPCountry). An explicit choice
      // (NEXT_LOCALE cookie) always wins and skips this.
      if (request.nextUrl.pathname === "/" && !request.cookies.get("NEXT_LOCALE")) {
        const locale = localeFromCountry(getGeo(request.headers).country);
        return NextResponse.redirect(new URL(`/${locale}`, request.url));
      }
    } catch {
      // any geo/logging failure falls through to normal locale routing
    }
    return intlMiddleware(request);
  }

  // tenant subdomain: gate access before running locale routing on top.
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: getCookieDomain() },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, toSessionScopedCookie(options))
          );
        },
      },
    }
  );

  function withAuthCookies(target: NextResponse) {
    response.cookies.getAll().forEach((c) => target.cookies.set(c.name, c.value));
    return target;
  }

  function serveTenantLanding(locale: string) {
    return withAuthCookies(
      NextResponse.rewrite(new URL(`/${locale}/tenant-landing/${tenantSlug}`, request.url))
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const bareRoot = matchBareRootPath(request.nextUrl.pathname);

  if (!user) {
    if (bareRoot) {
      // anonymous visitor at the tenant's own root — this is the public
      // landing page (shared with customers/suppliers), not an app path.
      if (request.nextUrl.pathname === "/") {
        return NextResponse.redirect(new URL(`/${initialLocale(request)}`, request.url));
      }
      return serveTenantLanding(bareRoot.locale);
    }
    if (matchLoginPath(request.nextUrl.pathname)) {
      return withAuthCookies(intlMiddleware(request));
    }
    // Never bounce an anonymous visitor off this subdomain — send them to
    // THIS SAME host's own /login instead of the root domain's.
    const locale = extractLocale(request.nextUrl.pathname) ?? initialLocale(request);
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const [{ data: memberships }, { data: platformAdmin }] = await Promise.all([
    supabase.from("memberships").select("companies(slug)"),
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const ownsSlug = (memberships ?? []).some(
    (m) => (m as unknown as { companies: { slug: string } | null }).companies?.slug === tenantSlug
  );

  if (platformAdmin && matchPlatformAdminPath(request.nextUrl.pathname)) {
    const locale = extractLocale(request.nextUrl.pathname) ?? initialLocale(request);
    return NextResponse.redirect(`https://${ROOT_DOMAIN}/${locale}/platform-admin`);
  }

  if (!ownsSlug && !platformAdmin) {
    if (bareRoot) {
      // authenticated, but not a member of THIS tenant — the public landing
      // is still visible to them, same as any other outside visitor.
      if (request.nextUrl.pathname === "/") {
        return NextResponse.redirect(new URL(`/${initialLocale(request)}`, request.url));
      }
      return serveTenantLanding(bareRoot.locale);
    }
    // Any other path (dashboard, admin, etc.) for someone who doesn't
    // belong to THIS tenant. If they belong somewhere else, send them
    // straight there instead of bouncing them back to this tenant's own
    // landing page (which would just loop — they have no way to reach
    // their real workspace from there).
    const locale = extractLocale(request.nextUrl.pathname) ?? initialLocale(request);
    const ownSlug = (memberships ?? [])
      .map((m) => (m as unknown as { companies: { slug: string } | null }).companies?.slug)
      .find((s): s is string => !!s);
    if (ownSlug) {
      return NextResponse.redirect(`https://${ownSlug}.${ROOT_DOMAIN}/${locale}/dashboard`);
    }

    // No membership anywhere yet — but if they signed up as a supplier here
    // and their membership just never got finalized (e.g. the email
    // confirmation reached Supabase but never our own /auth/callback, which
    // is the only place that used to create it), self-heal it right here
    // instead of dead-ending at "create a company," which is not what they
    // were trying to do.
    const pendingSupplierTenantId = user.user_metadata?.pending_supplier_tenant_id as
      | string
      | undefined;
    if (pendingSupplierTenantId) {
      const supplierSlug = await ensureSupplierMembership(user.id, pendingSupplierTenantId);
      if (supplierSlug) {
        return NextResponse.redirect(
          `https://${supplierSlug}.${ROOT_DOMAIN}/${locale}/supplier-onboarding`
        );
      }
    }

    // /onboarding (create or join a company) is the one page that
    // genuinely only exists on the root domain — there is no tenant
    // subdomain to send them to instead.
    return NextResponse.redirect(`https://${ROOT_DOMAIN}/${locale}/onboarding`);
  }

  if (bareRoot) {
    // a member landing on their own tenant's root skips the public
    // marketing page entirely and goes straight into the app.
    const locale = request.nextUrl.pathname === "/" ? initialLocale(request) : bareRoot.locale;
    return withAuthCookies(NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url)));
  }

  const intlResponse = intlMiddleware(request);
  return withAuthCookies(intlResponse);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|auth|.*\\..*).*)"],
};

import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { getCookieDomain } from "./lib/supabase/cookie-domain";
import { getGeo, localeFromCountry } from "./lib/geo";

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

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_APP_URL ?? "https://businesshub.app.br").replace(
  /^https?:\/\//,
  ""
);

function resolveTenantSlug(host: string): string | null {
  const hostname = host.split(":")[0];
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}`
  ) {
    return null; // root / marketing / local dev
  }
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return hostname.slice(0, -(`.${ROOT_DOMAIN}`.length));
  }
  return null; // unrecognized host (e.g. a preview URL) — treat as root
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
            response.cookies.set(name, value, options)
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
        return NextResponse.redirect(new URL(`/${bareRoot.locale}`, request.url));
      }
      return serveTenantLanding(bareRoot.locale);
    }
    return NextResponse.redirect(`https://${ROOT_DOMAIN}/en-US/login`);
  }

  const [{ data: memberships }, { data: platformAdmin }] = await Promise.all([
    supabase.from("memberships").select("companies(slug)"),
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const ownsSlug = (memberships ?? []).some(
    (m) => (m as unknown as { companies: { slug: string } | null }).companies?.slug === tenantSlug
  );

  if (!ownsSlug && !platformAdmin) {
    if (bareRoot) {
      // authenticated, but not a member of THIS tenant — the public landing
      // is still visible to them, same as any other outside visitor.
      if (request.nextUrl.pathname === "/") {
        return NextResponse.redirect(new URL(`/${bareRoot.locale}`, request.url));
      }
      return serveTenantLanding(bareRoot.locale);
    }
    // any other path (dashboard, admin, etc.) — bounce to their own space
    return NextResponse.redirect(`https://${ROOT_DOMAIN}/en-US/dashboard`);
  }

  if (bareRoot) {
    // a member landing on their own tenant's root skips the public
    // marketing page entirely and goes straight into the app.
    return withAuthCookies(
      NextResponse.redirect(new URL(`/${bareRoot.locale}/dashboard`, request.url))
    );
  }

  const intlResponse = intlMiddleware(request);
  return withAuthCookies(intlResponse);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|auth|.*\\..*).*)"],
};

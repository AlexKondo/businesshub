import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

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

export default async function proxy(request: NextRequest) {
  const tenantSlug = resolveTenantSlug(request.headers.get("host") ?? "");

  // root domain: pure next-intl locale routing, nothing tenant-specific here.
  if (!tenantSlug) {
    return intlMiddleware(request);
  }

  // tenant subdomain: gate access before running locale routing on top.
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
    // authenticated, but not a member of THIS tenant — bounce to their own space
    return NextResponse.redirect(`https://${ROOT_DOMAIN}/en-US/dashboard`);
  }

  const intlResponse = intlMiddleware(request);
  response.cookies.getAll().forEach((c) => intlResponse.cookies.set(c.name, c.value));
  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|auth|.*\\..*).*)"],
};

// Shared tenant-subdomain resolution — used by both the edge proxy
// (src/proxy.ts) and Server Components that need to know which tenant
// subdomain they're being served from (e.g. /supplier-onboarding). Pure
// string parsing over process.env/host — no edge- or node-only APIs, safe
// to import from either runtime.

export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_APP_URL ?? "https://businesshub.app.br").replace(
  /^https?:\/\//,
  ""
);

export function resolveTenantSlug(host: string): string | null {
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

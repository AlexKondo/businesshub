// Session cookies must be visible on both the root domain and every tenant
// subdomain (e.g. ailabs.businesshub.app.br) — without an explicit Domain
// attribute, browsers scope cookies to the exact host that set them, so a
// session created on businesshub.app.br is invisible on any *.businesshub.app.br.
export function getCookieDomain(): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return undefined;

  const host = appUrl.replace(/^https?:\/\//, "");
  if (host === "localhost" || host.endsWith(".local")) return undefined;

  return `.${host}`;
}

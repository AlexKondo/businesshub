import { defineRouting } from "next-intl/routing";

// Scope the NEXT_LOCALE cookie to the parent domain (.businesshub.app.br) so a
// language choice made on the root domain (or any tenant subdomain) carries to
// every other subdomain — same reason the auth/theme cookies are parent-scoped.
// Host-only on localhost/dev.
const appHost = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "");
const localeCookieDomain =
  appHost && appHost !== "localhost" && !appHost.endsWith(".local") ? `.${appHost}` : undefined;

export const routing = defineRouting({
  locales: ["en-US", "zh-CN", "es", "ja", "pt-BR"],
  defaultLocale: "en-US",
  localePrefix: "always",
  localeCookie: {
    // remembers the user's choice across visits without asking again
    maxAge: 60 * 60 * 24 * 365,
    ...(localeCookieDomain ? { domain: localeCookieDomain } : {}),
  },
});

export type Locale = (typeof routing.locales)[number];

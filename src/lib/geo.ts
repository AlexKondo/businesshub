import { routing } from "@/i18n/routing";

// Maps a visitor's country (from Cloudflare's CF-IPCountry header) to the
// closest locale we ship. Countries not listed fall back to the default
// locale. We only have 5 locales, so e.g. all Spanish-speaking countries map
// to "es" and traditional-Chinese regions map to our simplified "zh-CN".
const COUNTRY_TO_LOCALE: Record<string, string> = {
  // Portuguese
  BR: "pt-BR",
  PT: "pt-BR",
  AO: "pt-BR",
  MZ: "pt-BR",
  // Chinese
  CN: "zh-CN",
  HK: "zh-CN",
  TW: "zh-CN",
  MO: "zh-CN",
  SG: "zh-CN",
  // Japanese
  JP: "ja",
  // Spanish
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  VE: "es",
  EC: "es",
  GT: "es",
  CU: "es",
  BO: "es",
  DO: "es",
  HN: "es",
  PY: "es",
  SV: "es",
  NI: "es",
  CR: "es",
  PA: "es",
  UY: "es",
  PR: "es",
};

export function localeFromCountry(country: string | null | undefined): string {
  if (!country) return routing.defaultLocale;
  const locale = COUNTRY_TO_LOCALE[country.toUpperCase()];
  return locale && routing.locales.includes(locale as (typeof routing.locales)[number])
    ? locale
    : routing.defaultLocale;
}

// Pulls IP + geo from request headers. Cloudflare (our proxy) injects
// CF-Connecting-IP and CF-IPCountry on every request; city/region are only
// present on some Cloudflare plans, so they're best-effort.
export function getGeo(headers: Headers) {
  const ip =
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null;
  const country = headers.get("cf-ipcountry") || null;
  const city = headers.get("cf-ipcity") || null;
  const region = headers.get("cf-region") || null;
  return { ip, country, city, region };
}

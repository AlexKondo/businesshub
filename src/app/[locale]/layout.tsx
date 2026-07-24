import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeCookieSync } from "@/components/theme-cookie-sync";
import "../globals.css";

// Runs synchronously before next-themes reads localStorage. The parent-domain
// `bh_theme` cookie is the SOURCE OF TRUTH for the theme across subdomains, so
// whenever it's present we overwrite this origin's stored theme with it — not
// just when localStorage is empty. (Seeding only-when-empty meant a subdomain
// you'd previously toggled would forever ignore a newer choice made elsewhere.)
// The cookie is written authoritatively only on explicit changes (theme toggle,
// login); ThemeCookieSync merely bootstraps it the first time it's absent.
const THEME_SEED = `(function(){try{var m=document.cookie.match(/(?:^|; )bh_theme=([^;]+)/);if(m){localStorage.setItem('theme',decodeURIComponent(m[1]));}}catch(e){}})();`;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BusinessHub",
  description:
    "SRM, CRM, CLM, Procurement and Risk Management on one platform — one data model, one permission system, one visual identity.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Bind next-intl to the URL's locale segment explicitly. Pages reached via a
  // middleware rewrite (e.g. the tenant public landing) never pass through
  // intlMiddleware, so without this next-intl can't infer the locale and falls
  // back to the default — showing English on a /es URL.
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased min-h-screen`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_SEED }} />
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <ThemeCookieSync />
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

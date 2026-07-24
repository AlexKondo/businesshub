import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeCookieSync } from "@/components/theme-cookie-sync";
import "../globals.css";

// Runs synchronously before next-themes reads localStorage: on a subdomain that
// has no theme stored yet, seed it from the cross-subdomain `bh_theme` cookie so
// the first paint matches the user's saved preference instead of resetting to
// the system default. See ThemeCookieSync for the write side.
const THEME_SEED = `(function(){try{if(!localStorage.getItem('theme')){var m=document.cookie.match(/(?:^|; )bh_theme=([^;]+)/);if(m){localStorage.setItem('theme',decodeURIComponent(m[1]));}}}catch(e){}})();`;

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

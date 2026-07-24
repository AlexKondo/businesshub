"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

// next-themes persists the choice in localStorage, which is scoped per-origin —
// so the root domain and every tenant subdomain each keep their OWN theme, and
// crossing between them silently resets it. To make the theme follow the user
// everywhere, we mirror it into a cookie scoped to the parent domain
// (.businesshub.app.br), exactly like the language cookie. A tiny inline script
// in the root layout seeds localStorage from this cookie before next-themes
// reads it, so a fresh subdomain paints with the right theme and no flash.
function cookieDomain(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;
  const host = appUrl.replace(/^https?:\/\//, "");
  if (host === "localhost" || host.endsWith(".local")) return null;
  return `.${host}`;
}

export function ThemeCookieSync() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!theme) return;
    const domain = cookieDomain();
    const parts = [
      `bh_theme=${encodeURIComponent(theme)}`,
      "path=/",
      "max-age=31536000",
      "samesite=lax",
    ];
    if (domain) parts.push(`domain=${domain}`);
    document.cookie = parts.join("; ");
  }, [theme]);

  return null;
}

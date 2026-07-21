import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en-US", "zh-CN", "es", "ja", "pt-BR"],
  defaultLocale: "en-US",
  localePrefix: "always",
  localeCookie: {
    // remembers the user's choice across visits without asking again
    maxAge: 60 * 60 * 24 * 365,
  },
});

export type Locale = (typeof routing.locales)[number];

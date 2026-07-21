import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en-US", "zh-CN", "es", "ja"],
  defaultLocale: "en-US",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

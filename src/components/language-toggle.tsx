"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  "en-US": "English",
  "zh-CN": "简体中文",
  es: "Español",
  ja: "日本語",
  "pt-BR": "Português (BR)",
};

export function LanguageToggle() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Computes the target path from the browser's own address bar
  // (window.location), not next-intl's usePathname/router: on pages reached
  // via a middleware rewrite (e.g. a tenant's public landing, rewritten from
  // "/" to "/{locale}/tenant-landing/{slug}"), next-intl's pathname reflects
  // the rewritten internal route rather than the externally visible URL.
  // Navigation itself goes through Next's client router (not
  // window.location.href) so it's a soft transition — a hard reload
  // remounts the whole page and silently wipes any in-progress client
  // state (e.g. mid-flow screens like the onboarding form's "provisioning"
  // stage), which is exactly the bug this used to cause.
  function switchLocale(nextLocale: string) {
    const segments = window.location.pathname.split("/");
    segments[1] = nextLocale;
    const newPath = segments.join("/") || "/";
    router.push(`${newPath}${window.location.search}${window.location.hash}`);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t("toggleLabel")}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-(--border-default) px-2.5 text-xs font-medium text-(--ink-soft) transition-colors hover:text-(--ink) hover:bg-(--accent-soft)"
      >
        <Globe size={15} strokeWidth={1.5} />
        {locale}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-md border border-(--border-default) bg-(--bg-surface-raised) py-1 shadow-lg">
          {routing.locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setOpen(false);
                switchLocale(l);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-(--accent-soft) ${
                l === locale ? "text-(--brand-500) font-medium" : "text-(--ink)"
              }`}
            >
              {LOCALE_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

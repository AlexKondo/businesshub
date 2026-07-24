"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");
  // avoid a hydration mismatch: resolvedTheme is only known client-side after mount
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount flag to gate client-only rendering (hydration guard)
  useEffect(() => setMounted(true), []);

  function toggle() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
    // Persist on the account too (like sidebar_width), so the choice follows
    // the user across devices/browsers — not just this browser's storage.
    // No-ops for anonymous visitors (updateUser errors, caught).
    createClient()
      .auth.updateUser({ data: { theme: next } })
      .catch(() => null);
  }

  return (
    <button
      type="button"
      aria-label={t("toggleLabel")}
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-(--border-default) text-(--ink-soft) transition-colors hover:text-(--ink) hover:bg-(--accent-soft)"
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun size={16} strokeWidth={1.5} />
      ) : (
        <Moon size={16} strokeWidth={1.5} />
      )}
    </button>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, LogOut, LayoutDashboard } from "lucide-react";

export function UserMenu({
  firstName,
  showDashboardLink = false,
}: {
  firstName: string;
  showDashboardLink?: boolean;
}) {
  const t = useTranslations("user");
  const tApp = useTranslations("app");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full navigation on purpose (fresh trip through proxy.ts), but always
    // relative — never bounce a tenant subdomain visitor over to the root
    // domain. On a subdomain this lands back on that tenant's own public
    // landing page; on the root domain it lands on the marketing homepage.
    window.location.href = "/";
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
      >
        {firstName}
        <ChevronDown size={14} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-md border border-(--border-default) bg-(--bg-surface-raised) py-1 shadow-lg">
          {showDashboardLink && (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-(--ink) transition-colors hover:bg-(--accent-soft)"
            >
              <LayoutDashboard size={14} strokeWidth={1.5} />
              {tApp("dashboard")}
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-(--ink) transition-colors hover:bg-(--accent-soft)"
          >
            <LogOut size={14} strokeWidth={1.5} />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}

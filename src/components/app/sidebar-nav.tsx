"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  UserRound,
  ShieldCheck,
  Truck,
  FileText,
  FolderOpen,
  ShoppingCart,
  ClipboardList,
  Users,
  Lock,
} from "lucide-react";

const MAIN_ITEMS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/profile", key: "profile", icon: UserRound },
  { href: "/admin", key: "admin", icon: ShieldCheck },
] as const;

const SUPPLIERS_ONBOARDING_FORMS_HREF = "/suppliers/onboarding-form";

const FUTURE_MODULES = [
  { key: "contracts", icon: FileText },
  { key: "documents", icon: FolderOpen },
  { key: "purchaseOrders", icon: ShoppingCart },
] as const;

export function SidebarNav({ tenantId }: { tenantId: string | null }) {
  const t = useTranslations("app");
  const pathname = usePathname();
  const [forms, setForms] = useState<{ id: string; name: string }[]>([]);

  // Every onboarding form created in the admin builder gets its own entry
  // here, named after the form — lets an admin jump straight into whichever
  // one they're editing instead of always landing on the list page first.
  useEffect(() => {
    if (!tenantId) return;
    async function loadForms() {
      const supabase = createClient();
      const { data } = await supabase
        .from("onboarding_forms")
        .select("id, name")
        .eq("tenant_id", tenantId as string)
        .order("position", { ascending: true });
      setForms(data ?? []);
    }
    loadForms();
  }, [tenantId]);

  return (
    <nav className="flex flex-1 flex-col gap-6 px-3 py-4">
      <ul className="flex flex-col gap-0.5">
        {MAIN_ITEMS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  active
                    ? "bg-(--accent-soft) text-(--brand-500)"
                    : "text-(--ink-soft) hover:bg-(--accent-soft) hover:text-(--ink)"
                }`}
              >
                <Icon size={16} strokeWidth={1.5} />
                {t(key)}
              </Link>
            </li>
          );
        })}

        <li>
          <Link
            href={SUPPLIERS_ONBOARDING_FORMS_HREF}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors ${
              pathname.startsWith("/suppliers/")
                ? "bg-(--accent-soft) text-(--brand-500)"
                : "text-(--ink-soft) hover:bg-(--accent-soft) hover:text-(--ink)"
            }`}
          >
            <Truck size={16} strokeWidth={1.5} />
            {t("modules.suppliers")}
          </Link>
          <ul className="ml-[19px] mt-0.5 flex flex-col gap-0.5 border-l border-(--border-default) pl-3.5">
            {forms.map((form) => {
              const href = `${SUPPLIERS_ONBOARDING_FORMS_HREF}/${form.id}`;
              const active = pathname.startsWith(href);
              return (
                <li key={form.id}>
                  <Link
                    href={href}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-(--accent-soft) text-(--brand-500)"
                        : "text-(--ink-soft) hover:bg-(--accent-soft) hover:text-(--ink)"
                    }`}
                  >
                    <ClipboardList size={14} strokeWidth={1.5} />
                    <span className="truncate">{form.name}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/suppliers/submissions"
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  pathname === "/suppliers/submissions"
                    ? "bg-(--accent-soft) text-(--brand-500)"
                    : "text-(--ink-soft) hover:bg-(--accent-soft) hover:text-(--ink)"
                }`}
              >
                <Users size={14} strokeWidth={1.5} />
                {t("modules.suppliersSubmissions")}
              </Link>
            </li>
          </ul>
        </li>
      </ul>

      <div>
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
          {t("comingSoon")}
        </p>
        <ul className="flex flex-col gap-0.5">
          {FUTURE_MODULES.map(({ key, icon: Icon }) => (
            <li key={key}>
              <span className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium text-(--ink-soft) opacity-50">
                <Icon size={16} strokeWidth={1.5} />
                {t(`modules.${key}`)}
                <Lock size={12} strokeWidth={1.5} className="ml-auto" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

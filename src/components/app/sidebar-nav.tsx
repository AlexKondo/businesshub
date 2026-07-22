"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
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

const SUPPLIERS_CHILDREN = [
  { href: "/suppliers/onboarding-form", key: "suppliersOnboardingForm", icon: ClipboardList },
  { href: "/suppliers/submissions", key: "suppliersSubmissions", icon: Users },
] as const;

const FUTURE_MODULES = [
  { key: "contracts", icon: FileText },
  { key: "documents", icon: FolderOpen },
  { key: "purchaseOrders", icon: ShoppingCart },
] as const;

export function SidebarNav() {
  const t = useTranslations("app");
  const pathname = usePathname();

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
            href={SUPPLIERS_CHILDREN[0].href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors ${
              pathname === SUPPLIERS_CHILDREN[0].href
                ? "bg-(--accent-soft) text-(--brand-500)"
                : "text-(--ink-soft) hover:bg-(--accent-soft) hover:text-(--ink)"
            }`}
          >
            <Truck size={16} strokeWidth={1.5} />
            {t("modules.suppliers")}
          </Link>
          <ul className="ml-[19px] mt-0.5 flex flex-col gap-0.5 border-l border-(--border-default) pl-3.5">
            {SUPPLIERS_CHILDREN.map(({ href, key, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-(--accent-soft) text-(--brand-500)"
                        : "text-(--ink-soft) hover:bg-(--accent-soft) hover:text-(--ink)"
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.5} />
                    {t(`modules.${key}`)}
                  </Link>
                </li>
              );
            })}
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

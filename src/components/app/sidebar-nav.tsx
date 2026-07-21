"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  UserRound,
  Truck,
  FileText,
  FolderOpen,
  ShoppingCart,
  Lock,
} from "lucide-react";

const MAIN_ITEMS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/profile", key: "profile", icon: UserRound },
] as const;

const FUTURE_MODULES = [
  { key: "suppliers", icon: Truck },
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

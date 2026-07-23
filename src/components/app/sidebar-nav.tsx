"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROOT_DOMAIN, resolveTenantSlug } from "@/lib/tenant";
import {
  LayoutDashboard,
  ShieldCheck,
  Truck,
  FileText,
  FolderOpen,
  ShoppingCart,
  ClipboardList,
  Users,
  Lock,
  AlertTriangle,
  Building2,
} from "lucide-react";

const MAIN_ITEMS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin", key: "admin", icon: ShieldCheck },
] as const;

const SUPPLIERS_CHILDREN = [
  { href: "/suppliers/onboarding-form", key: "suppliersOnboardingForm", icon: ClipboardList },
  { href: "/suppliers/users", key: "suppliersUsers", icon: Users, adminOnly: true },
  { href: "/suppliers/submissions", key: "suppliersSubmissions", icon: Users },
] as const;

const FUTURE_MODULES = [
  { key: "contracts", icon: FileText },
  { key: "documents", icon: FolderOpen },
  { key: "purchaseOrders", icon: ShoppingCart },
] as const;

type FornecedorMenuSettings = {
  showDashboard: boolean;
  showOnboardingForm: boolean;
  showUsers: boolean;
};

const DEFAULT_FORNECEDOR_MENU: FornecedorMenuSettings = {
  showDashboard: true,
  showOnboardingForm: true,
  showUsers: false,
};

function NavLink({
  href,
  active,
  icon: Icon,
  label,
  badge,
  small,
}: {
  href: string;
  active: boolean;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  badge?: boolean;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-3 text-[13.5px] font-medium transition-colors ${
        small ? "gap-2 py-1.5 text-[13px]" : "gap-2.5 py-2"
      } ${
        active
          ? "bg-(--accent-soft) text-(--brand-500)"
          : "text-(--ink-soft) hover:bg-(--accent-soft) hover:text-(--ink)"
      }`}
    >
      <Icon size={small ? 14 : 16} strokeWidth={1.5} />
      <span className="truncate">{label}</span>
      {badge && (
        <AlertTriangle
          size={14}
          strokeWidth={2}
          className="ml-auto shrink-0 animate-pulse text-(--warning-500)"
        />
      )}
    </Link>
  );
}

// A Fornecedor's sidebar is deliberately tiny and admin-configured (see
// FornecedorMenuSettingsPanel in Administração) — never the internal staff
// nav (Administração/Contratos/etc). Only Painel + whichever of Formulário
// de Onboarding / Usuários the tenant's admin turned on.
function FornecedorSidebar({ tenantId }: { tenantId: string }) {
  const t = useTranslations("app");
  const pathname = usePathname();
  const [settings, setSettings] = useState<FornecedorMenuSettings>(DEFAULT_FORNECEDOR_MENU);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: settingsRow }, { data: forms }, { data: submissions }] = await Promise.all([
        supabase
          .from("fornecedor_menu_settings")
          .select("show_dashboard, show_onboarding_form, show_users")
          .eq("tenant_id", tenantId)
          .maybeSingle(),
        supabase
          .from("onboarding_forms")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("active", true),
        supabase.from("supplier_onboarding_submissions").select("form_id").eq("tenant_id", tenantId),
      ]);

      if (settingsRow) {
        setSettings({
          showDashboard: settingsRow.show_dashboard,
          showOnboardingForm: settingsRow.show_onboarding_form,
          showUsers: settingsRow.show_users,
        });
      }

      const submittedIds = new Set((submissions ?? []).map((s) => s.form_id));
      const pending = (forms ?? []).some((f) => !submittedIds.has(f.id));
      setNeedsOnboarding((forms ?? []).length > 0 && pending);
    }
    load();
  }, [tenantId]);

  const hasSuppliersSection = settings.showOnboardingForm || settings.showUsers;

  return (
    <nav className="flex flex-1 flex-col gap-6 px-3 py-4">
      <ul className="flex flex-col gap-0.5">
        {settings.showDashboard && (
          <li>
            <NavLink
              href="/dashboard"
              active={pathname === "/dashboard"}
              icon={LayoutDashboard}
              label={t("dashboard")}
            />
          </li>
        )}

        {hasSuppliersSection && (
          <li>
            <div className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium text-(--ink-soft)">
              <Truck size={16} strokeWidth={1.5} />
              {t("modules.suppliers")}
            </div>
            <ul className="ml-[19px] mt-0.5 flex flex-col gap-0.5 border-l border-(--border-default) pl-3.5">
              {settings.showOnboardingForm && (
                <li>
                  <NavLink
                    href="/supplier-onboarding"
                    active={pathname.startsWith("/supplier-onboarding")}
                    icon={ClipboardList}
                    label={t("modules.suppliersOnboardingForm")}
                    badge={needsOnboarding}
                    small
                  />
                </li>
              )}
              {settings.showUsers && (
                <li>
                  <NavLink
                    href="/suppliers/users"
                    active={pathname === "/suppliers/users"}
                    icon={Users}
                    label={t("modules.suppliersUsers")}
                    small
                  />
                </li>
              )}
            </ul>
          </li>
        )}
      </ul>
    </nav>
  );
}

function StaffSidebar({
  roleName,
  isPlatformAdmin,
}: {
  roleName: string | null;
  isPlatformAdmin: boolean;
}) {
  const t = useTranslations("app");
  const pathname = usePathname();
  const locale = useLocale();
  const onRootDomain =
    typeof window !== "undefined" && resolveTenantSlug(window.location.host) === null;
  const canManageUsers = isPlatformAdmin || roleName === "Administrador da Empresa";
  const suppliersChildren = SUPPLIERS_CHILDREN.filter(
    (item) => !("adminOnly" in item) || canManageUsers
  );

  return (
    <nav className="flex flex-1 flex-col gap-6 px-3 py-4">
      <ul className="flex flex-col gap-0.5">
        {MAIN_ITEMS.map(({ href, key, icon: Icon }) => (
          <li key={href}>
            <NavLink href={href} active={pathname === href} icon={Icon} label={t(key)} />
          </li>
        ))}

        {isPlatformAdmin && (
          <li>
            <a
              href={`https://${ROOT_DOMAIN}/${locale}/platform-admin`}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors ${
                onRootDomain && pathname === "/platform-admin"
                  ? "bg-(--accent-soft) text-(--brand-500)"
                  : "text-(--ink-soft) hover:bg-(--accent-soft) hover:text-(--ink)"
              }`}
            >
              <Building2 size={16} strokeWidth={1.5} />
              <span className="truncate">{t("platformAdmin")}</span>
            </a>
          </li>
        )}

        <li>
          <div
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium ${
              pathname.startsWith("/suppliers/") ? "text-(--brand-500)" : "text-(--ink-soft)"
            }`}
          >
            <Truck size={16} strokeWidth={1.5} />
            {t("modules.suppliers")}
          </div>
          <ul className="ml-[19px] mt-0.5 flex flex-col gap-0.5 border-l border-(--border-default) pl-3.5">
            {suppliersChildren.map(({ href, key, icon: Icon }) => (
              <li key={href}>
                <NavLink
                  href={href}
                  active={pathname.startsWith(href)}
                  icon={Icon}
                  label={t(`modules.${key}`)}
                  small
                />
              </li>
            ))}
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

export function SidebarNav({
  roleName,
  tenantId,
  isPlatformAdmin,
}: {
  roleName: string | null;
  tenantId: string | null;
  isPlatformAdmin: boolean;
}) {
  if (roleName === "Fornecedor" && tenantId) {
    return <FornecedorSidebar tenantId={tenantId} />;
  }
  return <StaffSidebar roleName={roleName} isPlatformAdmin={isPlatformAdmin} />;
}

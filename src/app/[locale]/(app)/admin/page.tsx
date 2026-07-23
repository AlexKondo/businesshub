import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PendingApprovals } from "@/components/app/pending-approvals";
import { CompanyLogoCard } from "@/components/app/company-logo-card";
import { FornecedorMenuSettingsPanel } from "@/components/app/fornecedor-menu-settings-panel";

export default async function AdminPage() {
  const t = await getTranslations("adminPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id, roles(name), companies(logo_url)")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .maybeSingle<{
      tenant_id: string;
      roles: { name: string } | null;
      companies: { logo_url: string | null } | null;
    }>();

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const canManage =
    !!platformAdmin || membership?.roles?.name === "Administrador da Empresa";

  if (!canManage) {
    return (
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">{t("title")}</h1>
        <p className="mt-2 text-[14px] text-(--ink-soft)">{t("noAccess")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">{t("title")}</h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">{t("subtitle")}</p>
      {membership?.tenant_id && (
        <CompanyLogoCard
          tenantId={membership.tenant_id}
          currentLogoUrl={membership.companies?.logo_url ?? null}
        />
      )}
      <PendingApprovals />
      {membership?.tenant_id && (
        <div className="mt-8">
          <h2 className="text-[16px] font-semibold text-(--ink)">
            {t("fornecedorMenuSectionTitle")}
          </h2>
          <p className="mt-1 text-[13px] text-(--ink-soft)">
            {t("fornecedorMenuSectionSubtitle")}
          </p>
          <FornecedorMenuSettingsPanel tenantId={membership.tenant_id} />
        </div>
      )}
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SupplierSubmissionsPanel } from "@/components/app/supplier-submissions-panel";
import { PendingCompaniesPanel } from "@/components/app/pending-companies-panel";
import { AllCompaniesPanel } from "@/components/app/all-companies-panel";

export default async function SuppliersSubmissionsPage() {
  const t = await getTranslations("adminPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id, roles(name)")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .maybeSingle<{ tenant_id: string; roles: { name: string } | null }>();

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const canManage = !!platformAdmin || membership?.roles?.name === "Administrador da Empresa";

  if (!canManage || (!membership?.tenant_id && !platformAdmin)) {
    return (
      <div>
        <p className="text-[14px] text-(--ink-soft)">{t("noAccess")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
          {t("submissionsTitle")}
        </h1>
        {membership?.tenant_id && (
          <p className="mt-1 text-[14px] text-(--ink-soft)">{t("submissionsSubtitle")}</p>
        )}
      </div>
      {membership?.tenant_id && <SupplierSubmissionsPanel tenantId={membership.tenant_id} />}
      {!!platformAdmin && (
        <div>
          <h2 className="text-[16px] font-semibold text-(--ink)">
            {t("pendingCompaniesSectionTitle")}
          </h2>
          <p className="mt-1 text-[13px] text-(--ink-soft)">
            {t("pendingCompaniesSectionSubtitle")}
          </p>
          <PendingCompaniesPanel />
        </div>
      )}
      {!!platformAdmin && (
        <div>
          <h2 className="text-[16px] font-semibold text-(--ink)">
            {t("allCompaniesSectionTitle")}
          </h2>
          <p className="mt-1 text-[13px] text-(--ink-soft)">
            {t("allCompaniesSectionSubtitle")}
          </p>
          <AllCompaniesPanel />
        </div>
      )}
    </div>
  );
}

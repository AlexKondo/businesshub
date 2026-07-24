import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSubdomainTenantId } from "@/lib/tenant-context";
import { SupplierSubmissionsPanel } from "@/components/app/supplier-submissions-panel";

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

  // A platform admin has no membership at this tenant, so fall back to the
  // tenant of the subdomain they're browsing.
  const tenantId = membership?.tenant_id ?? (platformAdmin ? await resolveSubdomainTenantId() : null);

  if (!canManage || !tenantId) {
    return (
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
          {t("submissionsTitle")}
        </h1>
        <p className="mt-2 text-[14px] text-(--ink-soft)">{t("noAccess")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
        {t("submissionsTitle")}
      </h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">{t("submissionsSubtitle")}</p>
      <SupplierSubmissionsPanel tenantId={tenantId} />
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSubdomainTenantId } from "@/lib/tenant-context";
import { OperationsLogPanel } from "@/components/app/operations-log-panel";

// Standalone "Log de Operações" — the audit trail that used to live embedded
// inside each company row in "Todas as Empresas". Platform admin on a tenant
// subdomain sees that tenant's log; on the root domain (no subdomain) they get
// the global feed. A tenant admin sees only their own tenant's log.
export default async function OperationsLogPage() {
  const t = await getTranslations("operationsLogPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: membership }, { data: platformAdmin }] = await Promise.all([
    supabase
      .from("memberships")
      .select("tenant_id, roles(name)")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .maybeSingle<{ tenant_id: string; roles: { name: string } | null }>(),
    supabase.from("platform_admins").select("user_id").eq("user_id", user!.id).maybeSingle(),
  ]);

  const canView = !!platformAdmin || membership?.roles?.name === "Administrador da Empresa";
  if (!canView) {
    return (
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">{t("title")}</h1>
        <p className="mt-2 text-[14px] text-(--ink-soft)">{t("noAccess")}</p>
      </div>
    );
  }

  // Tenant admin → their own tenant. Platform admin → subdomain tenant if
  // browsing one, otherwise null = the global cross-tenant feed.
  const tenantId =
    membership?.tenant_id ?? (platformAdmin ? await resolveSubdomainTenantId() : null);

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">{t("title")}</h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">
        {tenantId ? t("subtitleTenant") : t("subtitleGlobal")}
      </p>
      <OperationsLogPanel tenantId={tenantId} />
    </div>
  );
}

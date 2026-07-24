import { getTranslations } from "next-intl/server";
import { AlertTriangle, Users, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSubdomainTenantId } from "@/lib/tenant-context";
import { VpsStatsWidget } from "@/components/app/vps-stats-widget";

// Counts of the current tenant's suppliers, computed with the service-role
// client scoped to a single tenant_id (a platform admin has no membership to
// read them under RLS, and even a tenant admin can't read peers' auth rows).
// - usuários  = supplier (Fornecedor) accounts at this tenant
// - fornecedores = those that completed at least one onboarding submission
async function loadSupplierCounts(tenantId: string) {
  const admin = createAdminClient();
  const { data: fornecedorRole } = await admin
    .from("roles")
    .select("id")
    .eq("name", "Fornecedor")
    .is("tenant_id", null)
    .maybeSingle();

  const [{ count: userCount }, { data: submissions }] = await Promise.all([
    fornecedorRole
      ? admin
          .from("memberships")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("role_id", fornecedorRole.id)
          .in("status", ["active", "disabled"])
      : Promise.resolve({ count: 0 }),
    admin
      .from("supplier_onboarding_submissions")
      .select("membership_id")
      .eq("tenant_id", tenantId),
  ]);

  const supplierCount = new Set((submissions ?? []).map((s) => s.membership_id)).size;
  return { userCount: userCount ?? 0, supplierCount };
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboardPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: membership }, { data: platformAdmin }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, tenant_id, roles(name)")
      .eq("user_id", user!.id)
      .maybeSingle<{
        id: string;
        tenant_id: string;
        roles: { name: string } | null;
      }>(),
    supabase.from("platform_admins").select("user_id").eq("user_id", user!.id).maybeSingle(),
  ]);

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "";

  const isPlatformAdmin = !!platformAdmin;
  const roleName = membership?.roles?.name ?? null;
  const canManageSuppliers = isPlatformAdmin || roleName === "Administrador da Empresa";

  // Fornecedor's own onboarding reminder (unchanged behaviour).
  let needsOnboarding = false;
  if (roleName === "Fornecedor" && membership) {
    const [{ data: forms }, { data: submissions }] = await Promise.all([
      supabase
        .from("onboarding_forms")
        .select("id")
        .eq("tenant_id", membership.tenant_id)
        .eq("active", true),
      supabase
        .from("supplier_onboarding_submissions")
        .select("form_id")
        .eq("membership_id", membership.id),
    ]);
    const submittedIds = new Set((submissions ?? []).map((s) => s.form_id));
    needsOnboarding = (forms ?? []).some((f) => !submittedIds.has(f.id));
  }

  // Suppliers/users counts for the tenant currently in context.
  const tenantId =
    membership?.tenant_id ?? (isPlatformAdmin ? await resolveSubdomainTenantId() : null);
  const counts = canManageSuppliers && tenantId ? await loadSupplierCounts(tenantId) : null;

  return (
    <div>
      {needsOnboarding && (
        <Link
          href="/supplier-onboarding"
          className="mb-6 flex items-center gap-3 rounded-[10px] border border-(--warning-500)/30 bg-(--warning-500)/10 px-4 py-3.5 transition-colors hover:border-(--warning-500)/50"
        >
          <AlertTriangle
            size={20}
            strokeWidth={2}
            className="shrink-0 animate-pulse text-(--warning-500)"
          />
          <div>
            <p className="text-[13.5px] font-semibold text-(--ink)">{t("onboardingAlertTitle")}</p>
            <p className="text-[12.5px] text-(--ink-soft)">{t("onboardingAlertBody")}</p>
          </div>
        </Link>
      )}

      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
        {t("greeting", { name: firstName })}
      </h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">{t("subtitle")}</p>

      {counts && (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-[540px]">
          <div className="rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              <Truck size={14} strokeWidth={1.75} />
              {t("suppliersCountLabel")}
            </div>
            <p className="mt-2 text-[26px] font-bold tracking-tight text-(--ink)">
              {counts.supplierCount}
            </p>
            <p className="mt-0.5 text-[12px] text-(--ink-soft)">{t("suppliersCountHint")}</p>
          </div>
          <div className="rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              <Users size={14} strokeWidth={1.75} />
              {t("usersCountLabel")}
            </div>
            <p className="mt-2 text-[26px] font-bold tracking-tight text-(--ink)">
              {counts.userCount}
            </p>
            <p className="mt-0.5 text-[12px] text-(--ink-soft)">{t("usersCountHint")}</p>
          </div>
        </div>
      )}

      {isPlatformAdmin && <VpsStatsWidget />}
    </div>
  );
}

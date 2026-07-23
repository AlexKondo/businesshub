import { getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const t = await getTranslations("dashboardPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, tenant_id, companies(name), roles(name)")
    .eq("user_id", user!.id)
    .maybeSingle<{
      id: string;
      tenant_id: string;
      companies: { name: string } | null;
      roles: { name: string } | null;
    }>();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "";

  let needsOnboarding = false;
  if (membership?.roles?.name === "Fornecedor") {
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
            <p className="text-[13.5px] font-semibold text-(--ink)">
              {t("onboardingAlertTitle")}
            </p>
            <p className="text-[12.5px] text-(--ink-soft)">{t("onboardingAlertBody")}</p>
          </div>
        </Link>
      )}

      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
        {t("greeting", { name: firstName })}
      </h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">{t("subtitle")}</p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-[520px]">
        <div className="rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
            {t("tenantLabel")}
          </p>
          <p className="text-[16px] font-semibold text-(--ink)">
            {membership?.companies?.name ?? "—"}
          </p>
        </div>
        <div className="rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
            {t("roleLabel")}
          </p>
          <p className="text-[16px] font-semibold text-(--ink)">
            {membership?.roles?.name ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

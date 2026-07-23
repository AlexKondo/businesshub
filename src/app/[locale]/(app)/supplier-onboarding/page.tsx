import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SupplierOnboardingIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("supplierOnboarding");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, tenant_id, companies(name)")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .maybeSingle<{ id: string; tenant_id: string; companies: { name: string } | null }>();

  if (!membership) {
    return (
      <div className="mx-auto max-w-[1140px] rounded-2xl border border-(--border-default) bg-(--bg-surface) p-8 text-center">
        <h1 className="text-[19px] font-bold tracking-tight text-(--ink)">
          {t("notMemberTitle")}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-(--ink-soft)">
          {t("notMemberBody")}
        </p>
      </div>
    );
  }

  const { data: forms } = await supabase
    .from("onboarding_forms")
    .select("id, name")
    .eq("tenant_id", membership.tenant_id)
    .eq("active", true)
    .order("position", { ascending: true });

  if (!forms || forms.length === 0) {
    return (
      <div className="mx-auto max-w-[1140px] rounded-2xl border border-(--border-default) bg-(--bg-surface) p-8 text-center">
        <h1 className="text-[19px] font-bold tracking-tight text-(--ink)">{t("emptyTitle")}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-(--ink-soft)">
          {t("emptyBody", { name: membership.companies?.name ?? "" })}
        </p>
      </div>
    );
  }

  // The common case (one form) skips straight to it — the picker below only
  // earns its keep once a tenant actually has more than one form.
  if (forms.length === 1) {
    redirect({ href: `/supplier-onboarding/${forms[0].id}`, locale });
  }

  const { data: submissions } = await supabase
    .from("supplier_onboarding_submissions")
    .select("form_id")
    .eq("membership_id", membership.id);
  const completedFormIds = new Set((submissions ?? []).map((s) => s.form_id));

  return (
    <div className="mx-auto max-w-[1140px]">
      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">{t("formsMenuTitle")}</h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">
        {t("formsMenuSubtitle", { name: membership.companies?.name ?? "" })}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {forms.map((form) => {
          const completed = completedFormIds.has(form.id);
          return (
            <Link
              key={form.id}
              href={`/supplier-onboarding/${form.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-(--border-default) bg-(--bg-surface) p-5 transition-colors hover:border-(--brand-500)/40"
            >
              <span className="text-[15px] font-semibold text-(--ink)">{form.name}</span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  completed
                    ? "bg-(--success-500)/10 text-(--success-500)"
                    : "bg-(--warning-500)/10 text-(--warning-500)"
                }`}
              >
                {completed ? t("formStatusCompleted") : t("formStatusPending")}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

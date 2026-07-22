import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireSupplierMembership } from "@/lib/supplier-onboarding-gate";
import { SupplierOnboardingShell } from "@/components/supplier/supplier-onboarding-shell";
import { DynamicOnboardingForm } from "@/components/supplier/dynamic-onboarding-form";
import type { OnboardingField, OnboardingAnswers } from "@/lib/onboarding-fields";

export default async function SupplierOnboardingFormPage({
  params,
}: {
  params: Promise<{ locale: string; formId: string }>;
}) {
  const { locale, formId } = await params;
  const t = await getTranslations("supplierOnboarding");
  const { user, membership, supabase } = await requireSupplierMembership(locale);

  if (!membership) {
    return (
      <SupplierOnboardingShell user={user}>
        <div className="rounded-2xl border border-(--border-default) bg-(--bg-surface) p-8 text-center">
          <h1 className="text-[19px] font-bold tracking-tight text-(--ink)">
            {t("notMemberTitle")}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-(--ink-soft)">
            {t("notMemberBody")}
          </p>
        </div>
      </SupplierOnboardingShell>
    );
  }

  const [{ data: form }, { data: fields }, { data: submission }] = await Promise.all([
    supabase
      .from("onboarding_forms")
      .select("id, name")
      .eq("id", formId)
      .eq("tenant_id", membership.tenant_id)
      .eq("active", true)
      .maybeSingle<{ id: string; name: string }>(),
    supabase
      .from("onboarding_form_fields")
      .select("id, key, label, field_type, options, allow_other, required, position, mask, width")
      .eq("form_id", formId)
      .order("position", { ascending: true }),
    supabase
      .from("supplier_onboarding_submissions")
      .select("answers")
      .eq("membership_id", membership.id)
      .eq("form_id", formId)
      .maybeSingle<{ answers: OnboardingAnswers }>(),
  ]);

  if (!form) {
    // Stale/foreign form id (e.g. deleted after being bookmarked) — back to
    // the picker, which re-resolves to whatever forms actually still exist.
    redirect({ href: "/supplier-onboarding", locale });
  }

  return (
    <SupplierOnboardingShell user={user}>
      <DynamicOnboardingForm
        tenantId={membership.tenant_id}
        membershipId={membership.id}
        formId={form!.id}
        formName={form!.name}
        companyName={membership.companies?.name ?? ""}
        fields={(fields as OnboardingField[] | null) ?? []}
        initialAnswers={submission?.answers ?? {}}
      />
    </SupplierOnboardingShell>
  );
}

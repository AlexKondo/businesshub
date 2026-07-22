import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantSlug } from "@/lib/tenant";
import { SupplierOnboardingShell } from "@/components/supplier/supplier-onboarding-shell";
import { DynamicOnboardingForm } from "@/components/supplier/dynamic-onboarding-form";
import type { OnboardingField, OnboardingAnswers } from "@/lib/onboarding-fields";

// Outside (app) on purpose, same precedent as /onboarding: a Fornecedor
// member has no use for the internal staff shell (Suppliers/Contracts/
// Documents/Purchase Orders), so this page manages its own gate + shell
// instead of going through (app)/layout.tsx.
export default async function SupplierOnboardingPage({
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

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const tenantSlug = resolveTenantSlug((await headers()).get("host") ?? "");
  if (!tenantSlug) {
    redirect({ href: "/dashboard", locale });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, tenant_id, roles(name), companies!inner(slug, name)")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .eq("companies.slug", tenantSlug)
    .maybeSingle<{
      id: string;
      tenant_id: string;
      roles: { name: string } | null;
      companies: { slug: string; name: string } | null;
    }>();

  if (!membership) {
    // Defensive fallback only — src/proxy.ts's tenant gate should already
    // have blocked a non-member from reaching this page.
    return (
      <SupplierOnboardingShell user={user!}>
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

  if (membership.roles?.name !== "Fornecedor") {
    redirect({ href: "/dashboard", locale });
  }

  const [{ data: fields }, { data: submission }] = await Promise.all([
    supabase
      .from("onboarding_form_fields")
      .select("id, key, label, field_type, options, allow_other, required, position, mask, width")
      .eq("tenant_id", membership.tenant_id)
      .order("position", { ascending: true }),
    supabase
      .from("supplier_onboarding_submissions")
      .select("answers")
      .eq("membership_id", membership.id)
      .maybeSingle<{ answers: OnboardingAnswers }>(),
  ]);

  return (
    <SupplierOnboardingShell user={user!}>
      <DynamicOnboardingForm
        tenantId={membership.tenant_id}
        membershipId={membership.id}
        companyName={membership.companies?.name ?? ""}
        fields={(fields as OnboardingField[] | null) ?? []}
        initialAnswers={submission?.answers ?? {}}
      />
    </SupplierOnboardingShell>
  );
}

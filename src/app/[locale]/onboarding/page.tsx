import { getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureSupplierMembership } from "@/lib/supplier-membership";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingForm } from "@/components/app/onboarding-form";

// Requires a session but deliberately NOT a tenant — this is where a
// signed-up user without a membership yet ends up.
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const appRootDomain =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "businesshub.app.br";
  const userFirstName =
    (user!.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user!.email?.split("@")[0] ??
    "";

  // Self-heal for a supplier whose Fornecedor membership never got created
  // by the email-confirmation callback — this happens when Supabase's own
  // verify endpoint confirms the email and redirects here without a `code`
  // our /auth/callback could exchange, so its membership-creation step never
  // runs and the supplier ends up dumped on this create-a-company form.
  // Detect the leftover pending_supplier_tenant_id, finish creating the
  // membership, and send them to their tenant's supplier onboarding instead.
  const pendingSupplierTenantId = user!.user_metadata?.pending_supplier_tenant_id as
    | string
    | undefined;
  if (pendingSupplierTenantId) {
    const slug = await ensureSupplierMembership(user!.id, pendingSupplierTenantId);
    if (slug) {
      nextRedirect(`https://${slug}.${appRootDomain}/${locale}/supplier-onboarding`);
    }
  }

  // A previous "create a new company" request from this same account is
  // still awaiting platform-admin approval — show that status instead of
  // re-rendering the empty create-org form (which would make them retype
  // everything, and could even create a second pending company). Uses the
  // admin client because companies_select's RLS requires an ACTIVE
  // membership to read a company row — exactly what this user doesn't have
  // yet (their membership is still 'pending'), so the caller's own client
  // would silently return companies: null on the join and defeat this
  // check. Scoped safely by the explicit user_id filter below.
  const admin = createAdminClient();
  const { data: pendingMembership } = await admin
    .from("memberships")
    .select("tenant_id, companies(name, slug, status)")
    .eq("user_id", user!.id)
    .eq("status", "pending")
    .maybeSingle<{
      tenant_id: string;
      companies: { name: string; slug: string; status: string } | null;
    }>();

  if (pendingMembership?.companies) {
    const t = await getTranslations("onboarding");
    const isNewCompany = pendingMembership.companies.status === "pending_approval";
    return (
      <AuthShell maxWidthClassName="max-w-[640px]" userFirstName={userFirstName}>
        <div className="w-full max-w-[420px] rounded-xl border border-(--border-default) bg-(--bg-surface) p-7 text-center">
          <h1 className="text-[20px] font-bold tracking-tight text-(--ink)">
            {t("pendingTitle")}
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-(--ink-soft)">
            {isNewCompany
              ? t("pendingNewCompanyBody", {
                  name: pendingMembership.companies.name,
                  domain: `${pendingMembership.companies.slug}.${appRootDomain}`,
                })
              : t("pendingBody")}
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell maxWidthClassName="max-w-[640px]" userFirstName={userFirstName}>
      <OnboardingForm appRootDomain={appRootDomain} />
    </AuthShell>
  );
}

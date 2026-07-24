import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSubdomainTenantId } from "@/lib/tenant-context";
import { Link } from "@/i18n/navigation";
import { OnboardingFormBuilder } from "@/components/app/onboarding-form-builder";
import { OnboardingFormHeaderFooterEditor } from "@/components/app/onboarding-form-header-footer-editor";

export default async function SuppliersOnboardingFormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
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

  const tenantId = membership?.tenant_id ?? (platformAdmin ? await resolveSubdomainTenantId() : null);

  if (!canManage || !tenantId) {
    return (
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
          {t("onboardingFormsTitle")}
        </h1>
        <p className="mt-2 text-[14px] text-(--ink-soft)">{t("noAccess")}</p>
      </div>
    );
  }

  const { data: form } = await supabase
    .from("onboarding_forms")
    .select("id, name, header_text, footer_text")
    .eq("id", formId)
    .eq("tenant_id", tenantId)
    .maybeSingle<{
      id: string;
      name: string;
      header_text: string | null;
      footer_text: string | null;
    }>();

  if (!form) {
    return (
      <div>
        <Link
          href="/suppliers/onboarding-form"
          className="text-[13px] font-medium text-(--brand-500) hover:underline"
        >
          {t("onboardingFormsBackToList")}
        </Link>
        <p className="mt-2 text-[14px] text-(--ink-soft)">{t("noAccess")}</p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/suppliers/onboarding-form"
        className="text-[13px] font-medium text-(--brand-500) hover:underline"
      >
        {t("onboardingFormsBackToList")}
      </Link>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">{form.name}</h1>
          <p className="mt-1 text-[14px] text-(--ink-soft)">{t("onboardingFieldsSubtitle")}</p>
        </div>
        <Link
          href={`/suppliers/onboarding-form/${form.id}/preview`}
          className="inline-flex h-9 shrink-0 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t("onboardingFieldsViewFormButton")}
        </Link>
      </div>
      <OnboardingFormHeaderFooterEditor
        formId={form.id}
        initialHeader={form.header_text ?? ""}
        initialFooter={form.footer_text ?? ""}
      />
      <OnboardingFormBuilder tenantId={tenantId} formId={form.id} />
    </div>
  );
}

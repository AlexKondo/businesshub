import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { OnboardingFormBuilder } from "@/components/app/onboarding-form-builder";

export default async function SuppliersOnboardingFormPage() {
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

  if (!canManage || !membership?.tenant_id) {
    return (
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
          {t("onboardingFieldsTitle")}
        </h1>
        <p className="mt-2 text-[14px] text-(--ink-soft)">{t("noAccess")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
            {t("onboardingFieldsTitle")}
          </h1>
          <p className="mt-1 text-[14px] text-(--ink-soft)">{t("onboardingFieldsSubtitle")}</p>
        </div>
        <Link
          href="/suppliers/onboarding-form/preview"
          className="inline-flex h-9 shrink-0 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t("onboardingFieldsViewFormButton")}
        </Link>
      </div>
      <OnboardingFormBuilder tenantId={membership.tenant_id} />
    </div>
  );
}

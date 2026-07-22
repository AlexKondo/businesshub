import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
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
      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
        {t("onboardingFieldsTitle")}
      </h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">{t("onboardingFieldsSubtitle")}</p>
      <OnboardingFormBuilder tenantId={membership.tenant_id} />
    </div>
  );
}

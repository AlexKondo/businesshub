import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFormLayoutEditor } from "@/components/app/onboarding-form-layout-editor";
import type { OnboardingField } from "@/lib/onboarding-fields";

export default async function SuppliersOnboardingFormPreviewPage() {
  const t = await getTranslations("adminPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id, roles(name), companies(name)")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .maybeSingle<{
      tenant_id: string;
      roles: { name: string } | null;
      companies: { name: string } | null;
    }>();

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
          {t("onboardingFormPreviewTitle")}
        </h1>
        <p className="mt-2 text-[14px] text-(--ink-soft)">{t("noAccess")}</p>
      </div>
    );
  }

  const { data: fields } = await supabase
    .from("onboarding_form_fields")
    .select("id, key, label, field_type, options, allow_other, required, position, mask, width")
    .eq("tenant_id", membership.tenant_id)
    .order("position", { ascending: true });

  return (
    <OnboardingFormLayoutEditor
      companyName={membership.companies?.name ?? ""}
      initialFields={(fields as OnboardingField[] | null) ?? []}
    />
  );
}

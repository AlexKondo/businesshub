import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PendingCompaniesPanel } from "@/components/app/pending-companies-panel";
import { AllCompaniesPanel } from "@/components/app/all-companies-panel";

export default async function PlatformAdminPage() {
  const t = await getTranslations("adminPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!platformAdmin) {
    return (
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
          {t("platformAdminTitle")}
        </h1>
        <p className="mt-2 text-[14px] text-(--ink-soft)">{t("noAccess")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
        {t("platformAdminTitle")}
      </h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">{t("platformAdminSubtitle")}</p>

      <div className="mt-8">
        <h2 className="text-[16px] font-semibold text-(--ink)">
          {t("pendingCompaniesSectionTitle")}
        </h2>
        <p className="mt-1 text-[13px] text-(--ink-soft)">
          {t("pendingCompaniesSectionSubtitle")}
        </p>
        <PendingCompaniesPanel />
      </div>

      <div className="mt-8">
        <h2 className="text-[16px] font-semibold text-(--ink)">
          {t("allCompaniesSectionTitle")}
        </h2>
        <p className="mt-1 text-[13px] text-(--ink-soft)">{t("allCompaniesSectionSubtitle")}</p>
        <AllCompaniesPanel />
      </div>
    </div>
  );
}

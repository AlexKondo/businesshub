import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PendingApprovals } from "@/components/app/pending-approvals";

export default async function AdminPage() {
  const t = await getTranslations("adminPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("memberships")
    .select("roles(name)")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .maybeSingle<{ roles: { name: string } | null }>();

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const canManage =
    !!platformAdmin || membership?.roles?.name === "Administrador da Empresa";

  if (!canManage) {
    return (
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">{t("title")}</h1>
        <p className="mt-2 text-[14px] text-(--ink-soft)">{t("noAccess")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">{t("title")}</h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">{t("subtitle")}</p>
      <PendingApprovals />
    </div>
  );
}

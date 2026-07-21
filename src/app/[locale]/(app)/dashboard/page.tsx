import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const t = await getTranslations("dashboardPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("memberships")
    .select("companies(name), roles(name)")
    .eq("user_id", user!.id)
    .maybeSingle<{
      companies: { name: string } | null;
      roles: { name: string } | null;
    }>();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "";

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
        {t("greeting", { name: firstName })}
      </h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">{t("subtitle")}</p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-[520px]">
        <div className="rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
            {t("tenantLabel")}
          </p>
          <p className="text-[16px] font-semibold text-(--ink)">
            {membership?.companies?.name ?? "—"}
          </p>
        </div>
        <div className="rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
            {t("roleLabel")}
          </p>
          <p className="text-[16px] font-semibold text-(--ink)">
            {membership?.roles?.name ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

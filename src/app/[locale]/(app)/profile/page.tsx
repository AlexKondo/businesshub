import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/app/profile-form";

export default async function ProfilePage() {
  const t = await getTranslations("profilePage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">{t("title")}</h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">{t("subtitle")}</p>

      <ProfileForm
        userId={user!.id}
        email={user!.email ?? ""}
        fullName={
          profile?.full_name ?? (user!.user_metadata?.full_name as string | undefined) ?? ""
        }
        avatarUrl={
          profile?.avatar_url ?? (user!.user_metadata?.avatar_url as string | undefined) ?? null
        }
      />
    </div>
  );
}

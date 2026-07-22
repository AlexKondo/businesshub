import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0];

  return (
    <header className="flex items-center justify-between border-b border-(--border-default) px-6 py-4 sm:px-10">
      <Wordmark />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
        {user && firstName ? (
          <UserMenu firstName={firstName} showDashboardLink />
        ) : (
          <Link
            href="/login"
            className="inline-flex h-9 items-center whitespace-nowrap rounded-md px-3 text-[13.5px] font-medium text-(--ink-soft) transition-colors hover:text-(--ink)"
          >
            {t("login")}
          </Link>
        )}
      </div>
    </header>
  );
}

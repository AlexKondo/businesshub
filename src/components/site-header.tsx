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
      <nav className="hidden items-center gap-7 text-[13.5px] text-(--ink-soft) md:flex">
        <span>{t("product")}</span>
        <span>{t("modules")}</span>
        <span>{t("pricing")}</span>
        <span>{t("docs")}</span>
      </nav>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
        {user && firstName ? (
          <UserMenu firstName={firstName} showDashboardLink />
        ) : (
          <>
            <Link
              href="/login"
              className="hidden h-9 items-center rounded-md px-3 text-[13.5px] font-medium text-(--ink-soft) transition-colors hover:text-(--ink) sm:inline-flex"
            >
              {t("login")}
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center rounded-md bg-(--ink) px-4 text-[13px] font-semibold text-(--bg-canvas) transition-opacity hover:opacity-90"
            >
              {t("contactSales")}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

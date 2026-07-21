import type { User } from "@supabase/supabase-js";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { SidebarNav } from "@/components/app/sidebar-nav";

export function AppShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "";

  return (
    <div className="flex min-h-screen bg-(--bg-canvas)">
      <aside className="hidden w-60 shrink-0 border-r border-(--border-default) bg-(--bg-surface) md:flex md:flex-col">
        <div className="border-b border-(--border-default) px-5 py-4">
          <Wordmark />
        </div>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-2 border-b border-(--border-default) px-6 py-3">
          <ThemeToggle />
          <LanguageToggle />
          <UserMenu firstName={firstName} />
        </header>
        <main className="flex-1 px-6 py-8 sm:px-10">{children}</main>
      </div>
    </div>
  );
}

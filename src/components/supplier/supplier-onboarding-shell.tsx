import type { User } from "@supabase/supabase-js";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { UserMenu } from "@/components/auth/user-menu";

// Minimal shell for external suppliers (role "Fornecedor") — deliberately
// NOT the full AppShell+SidebarNav, which lists internal staff modules
// (Suppliers/Contracts/Documents/Purchase Orders) a supplier has no access
// to and shouldn't see.
export function SupplierOnboardingShell({
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
    <div className="flex min-h-screen flex-col bg-(--bg-canvas)">
      <header className="flex items-center justify-between border-b border-(--border-default) px-6 py-4 sm:px-10">
        <Wordmark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
          <UserMenu firstName={firstName} />
        </div>
      </header>
      <main className="flex-1 px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-[720px]">{children}</div>
      </main>
    </div>
  );
}

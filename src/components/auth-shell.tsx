import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { UserMenu } from "@/components/auth/user-menu";

export function AuthShell({
  children,
  maxWidthClassName = "max-w-[380px]",
  userFirstName,
}: {
  children: React.ReactNode;
  maxWidthClassName?: string;
  // Only pages that require a session (e.g. /onboarding) pass this — an
  // anonymous visitor on /login or /signup has no one to log out.
  userFirstName?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-(--bg-canvas)">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Wordmark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
          {userFirstName && <UserMenu firstName={userFirstName} />}
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-10">
        <div className={`w-full ${maxWidthClassName}`}>{children}</div>
      </main>
    </div>
  );
}

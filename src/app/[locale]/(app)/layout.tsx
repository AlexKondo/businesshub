import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";

// Route group (app): every page under here requires an authenticated session
// AND at least one tenant membership (platform admins are exempt from the
// tenant requirement — they can operate without belonging to any company).
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const [{ data: membership }, { data: platformAdmin }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, roles(name)")
      .eq("user_id", user!.id)
      .maybeSingle<{ id: string; roles: { name: string } | null }>(),
    supabase.from("platform_admins").select("user_id").eq("user_id", user!.id).maybeSingle(),
  ]);

  if (!membership && !platformAdmin) {
    redirect({ href: "/onboarding", locale });
  }

  // A Fornecedor has no use for the internal staff shell (Suppliers/
  // Contracts/Documents/Purchase Orders) — send them to their own onboarding
  // page instead, even if they reached /dashboard directly on the root domain.
  if (membership?.roles?.name === "Fornecedor") {
    redirect({ href: "/supplier-onboarding", locale });
  }

  return <AppShell user={user!}>{children}</AppShell>;
}

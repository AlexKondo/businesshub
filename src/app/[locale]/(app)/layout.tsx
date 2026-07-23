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
      .select("id, tenant_id, roles(name), companies(name)")
      .eq("user_id", user!.id)
      .maybeSingle<{
        id: string;
        tenant_id: string;
        roles: { name: string } | null;
        companies: { name: string } | null;
      }>(),
    supabase.from("platform_admins").select("user_id").eq("user_id", user!.id).maybeSingle(),
  ]);

  if (!membership && !platformAdmin) {
    redirect({ href: "/onboarding", locale });
  }

  return (
    <AppShell
      user={user!}
      companyName={membership?.companies?.name ?? null}
      roleName={membership?.roles?.name ?? null}
      tenantId={membership?.tenant_id ?? null}
    >
      {children}
    </AppShell>
  );
}

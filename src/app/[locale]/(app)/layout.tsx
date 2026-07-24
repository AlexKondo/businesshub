import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";
import { resolveSubdomainCompany } from "@/lib/tenant-context";

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
      .eq("status", "active")
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

  // A platform admin has no membership, so on a tenant subdomain fall back to
  // the subdomain's own company for the header/sidebar/dashboard context —
  // that's the workspace they're actively managing.
  const subdomainCompany =
    !membership && platformAdmin ? await resolveSubdomainCompany() : null;

  return (
    <AppShell
      user={user!}
      companyName={membership?.companies?.name ?? subdomainCompany?.name ?? null}
      roleName={membership?.roles?.name ?? null}
      tenantId={membership?.tenant_id ?? subdomainCompany?.id ?? null}
      isPlatformAdmin={!!platformAdmin}
    >
      {children}
    </AppShell>
  );
}

import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth-shell";
import { SetPasswordForm } from "@/components/auth/set-password-form";

// Requires a session but deliberately outside (app) — reached right after an
// invite-link code exchange (see /auth/callback), before the invitee has
// ever chosen a password. Lives on whichever subdomain the invite already
// resolved to (tenant-scoped), same precedent as /onboarding.
//
// Currently only reached from the supplier-invite flow (see
// /api/tenants/invite-supplier), so the post-save destination is hardcoded
// to /supplier-onboarding rather than threaded through as a second nested
// "next" query param — generalize this if a second caller shows up.
export default async function SetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const userFirstName =
    (user!.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user!.email?.split("@")[0] ??
    "";

  return (
    <AuthShell userFirstName={userFirstName}>
      <SetPasswordForm next="/supplier-onboarding" />
    </AuthShell>
  );
}

import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingForm } from "@/components/app/onboarding-form";

// Requires a session but deliberately NOT a tenant — this is where a
// signed-up user without a membership yet ends up.
export default async function OnboardingPage({
  params,
}: {
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

  const appRootDomain =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "businesshub.app.br";

  return (
    <AuthShell>
      <OnboardingForm appRootDomain={appRootDomain} />
    </AuthShell>
  );
}

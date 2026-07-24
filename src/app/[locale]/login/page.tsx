import { headers } from "next/headers";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { resolveTenantSlug } from "@/lib/tenant";

export default async function LoginPage() {
  const tenantSlug = resolveTenantSlug((await headers()).get("host") ?? "");

  return (
    <AuthShell>
      <LoginForm tenantSlug={tenantSlug} />
    </AuthShell>
  );
}

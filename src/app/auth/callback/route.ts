import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Exchanges the Supabase email confirmation / invite code for a session,
// then sends the user into the app. Lives outside [locale] on purpose —
// the link embedded in emails must be a fixed path.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/en-US/dashboard";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://businesshub.app.br";
  const root = appUrl.replace(/^https?:\/\//, "");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const pendingSupplierTenantId = user.user_metadata?.pending_supplier_tenant_id as
          | string
          | undefined;

        if (pendingSupplierTenantId) {
          const slug = await ensureSupplierMembership(user.id, pendingSupplierTenantId);
          if (slug) {
            return NextResponse.redirect(`https://${slug}.${root}${next}`);
          }
          return NextResponse.redirect(`${appUrl}/en-US/login`);
        }

        const { data: membership } = await supabase
          .from("memberships")
          .select("companies(slug)")
          .limit(1)
          .maybeSingle<{ companies: { slug: string } | null }>();

        const slug = membership?.companies?.slug;
        if (slug) {
          return NextResponse.redirect(`https://${slug}.${root}${next}`);
        }
      }

      return NextResponse.redirect(`${appUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${appUrl}/en-US/login`);
}

// Creates (or confirms) the caller's Fornecedor membership at the tenant
// they signed up as a supplier for. Always via service-role: this is a
// server-driven side effect of email confirmation, not a user-initiated RLS
// write. Idempotent — safe if the confirmation link is opened twice.
async function ensureSupplierMembership(userId: string, tenantId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id, slug")
    .eq("id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!company) return null;

  const { data: existing } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", company.id)
    .maybeSingle();
  if (existing) return company.slug;

  const { data: fornecedorRole } = await admin
    .from("roles")
    .select("id")
    .eq("name", "Fornecedor")
    .is("tenant_id", null)
    .single();
  if (!fornecedorRole) {
    console.error("[auth/callback] Fornecedor system role not found");
    return null;
  }

  const { error } = await admin.from("memberships").insert({
    user_id: userId,
    tenant_id: company.id,
    role_id: fornecedorRole.id,
    status: "active",
  });
  // 23505 = unique_violation on (user_id, tenant_id) — the link was opened
  // twice concurrently; the row already exists, treat as success.
  if (error && error.code !== "23505") {
    console.error("[auth/callback] supplier membership insert failed:", error);
    return null;
  }

  return company.slug;
}

import { createAdminClient } from "@/lib/supabase/admin";

// Creates (or confirms) a user's Fornecedor membership at the tenant they
// signed up as a supplier for (pending_supplier_tenant_id in user_metadata,
// set by SupplierSignupForm at signup time). Always via service-role: a
// server-driven side effect, not a user-initiated RLS write. Idempotent --
// safe to call more than once for the same user/tenant, which matters
// because this now runs from two places: the email-confirmation callback
// (the normal path) and proxy.ts as a self-heal (in case a session ever
// gets established without that callback running -- e.g. Supabase's
// implicit/hash token flow, which never reaches our server route at all).
export async function ensureSupplierMembership(
  userId: string,
  tenantId: string
): Promise<string | null> {
  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id, slug")
    .eq("id", tenantId)
    .eq("status", "active")
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
    console.error("[ensureSupplierMembership] Fornecedor system role not found");
    return null;
  }

  const { error } = await admin.from("memberships").insert({
    user_id: userId,
    tenant_id: company.id,
    role_id: fornecedorRole.id,
    status: "active",
  });
  // 23505 = unique_violation on (user_id, tenant_id) — created concurrently
  // (e.g. the confirmation link opened twice), the row already exists.
  if (error && error.code !== "23505") {
    console.error("[ensureSupplierMembership] insert failed:", error);
    return null;
  }

  return company.slug;
}

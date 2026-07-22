import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantSlug } from "@/lib/tenant";

export type SupplierMembership = {
  id: string;
  tenant_id: string;
  roles: { name: string } | null;
  companies: { slug: string; name: string } | null;
};

// Shared by every page under /supplier-onboarding — resolves the caller's
// active membership at this subdomain's tenant and enforces the Fornecedor
// role. redirect() throws (Next.js behavior), so it's safe to call from
// inside this helper regardless of which page invoked it.
export async function requireSupplierMembership(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const tenantSlug = resolveTenantSlug((await headers()).get("host") ?? "");
  if (!tenantSlug) {
    redirect({ href: "/dashboard", locale });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, tenant_id, roles(name), companies!inner(slug, name)")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .eq("companies.slug", tenantSlug)
    .maybeSingle<SupplierMembership>();

  if (membership && membership.roles?.name !== "Fornecedor") {
    redirect({ href: "/dashboard", locale });
  }

  return { supabase, user: user!, membership };
}

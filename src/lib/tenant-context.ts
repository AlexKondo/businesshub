import { headers } from "next/headers";
import { resolveTenantSlug } from "@/lib/tenant";
import { createAdminClient } from "@/lib/supabase/admin";

// Resolves the tenant id for the subdomain the current request is served
// from. Used so a platform admin — who has NO membership row at any tenant —
// can still operate the tenant-scoped admin pages (Usuários, Cadastros,
// Formulário de Onboarding) while browsing a tenant's subdomain, where those
// pages would otherwise read the tenant id off a membership they don't have.
export async function resolveSubdomainTenantId(): Promise<string | null> {
  return (await resolveSubdomainCompany())?.id ?? null;
}

// Same idea as resolveSubdomainTenantId, but also returns the company name so
// a platform admin browsing a tenant subdomain can see WHICH workspace they're
// managing (header, dashboard) without a membership row to read it from.
export async function resolveSubdomainCompany(): Promise<{ id: string; name: string } | null> {
  const host = (await headers()).get("host") ?? "";
  const slug = resolveTenantSlug(host);
  if (!slug) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("companies")
    .select("id, name")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  return data ? { id: data.id as string, name: data.name as string } : null;
}

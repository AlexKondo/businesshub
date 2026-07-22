import { createAdminClient } from "@/lib/supabase/admin";

// Coolify has no wildcard-domain support at the API level, so each tenant
// subdomain must be registered explicitly and Traefik reloaded via a redeploy.
//
// Rather than incrementally add/remove a single slug (which races badly when
// several tenants are created/deleted at once — concurrent reads of the same
// domain list clobber each other), we RECONCILE: the authoritative target set
// is always "root + www + one domain per surviving company", computed fresh
// from the database. Every call converges to the same correct state
// regardless of ordering or concurrency, and it self-heals any prior drift.
async function reconcileTenantDomains(
  ensureSlug?: string
): Promise<{ deploymentUuid: string | null; changed: boolean }> {
  const base = process.env.COOLIFY_BASE_URL;
  const token = process.env.COOLIFY_API_TOKEN;
  const appUuid = process.env.COOLIFY_APP_UUID;
  const rootDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "");

  const admin = createAdminClient();
  const { data: companies } = await admin
    .from("companies")
    .select("slug")
    .is("deleted_at", null);

  const slugs = new Set((companies ?? []).map((c) => c.slug as string));
  // Belt-and-suspenders for the create path: include the just-inserted slug
  // even if the DB read lags behind the write.
  if (ensureSlug) slugs.add(ensureSlug);

  const target = [
    `https://${rootDomain}`,
    `https://www.${rootDomain}`,
    ...[...slugs].map((slug) => `https://${slug}.${rootDomain}`),
  ];

  const appRes = await fetch(`${base}/api/v1/applications/${appUuid}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const app = await appRes.json();
  const current: string[] = (app.fqdn ?? "")
    .split(",")
    .map((d: string) => d.trim())
    .filter(Boolean);

  const currentSet = new Set(current);
  const targetSet = new Set(target);
  const unchanged =
    currentSet.size === targetSet.size && [...targetSet].every((d) => currentSet.has(d));
  if (unchanged) return { deploymentUuid: null, changed: false };

  await fetch(`${base}/api/v1/applications/${appUuid}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ domains: target.join(",") }),
  });

  const deployRes = await fetch(`${base}/api/v1/deploy?uuid=${appUuid}&force=true`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const deploy = await deployRes.json();
  return { deploymentUuid: deploy?.deployments?.[0]?.deployment_uuid ?? null, changed: true };
}

// Called at onboarding, right after the company row is inserted.
export async function registerTenantDomain(slug: string): Promise<{ deploymentUuid: string | null }> {
  const { deploymentUuid } = await reconcileTenantDomains(slug);
  return { deploymentUuid };
}

// Called by the Supabase DELETE webhook after a company row is removed.
export async function deregisterTenantDomain(): Promise<{ deploymentUuid: string | null }> {
  const { deploymentUuid } = await reconcileTenantDomains();
  return { deploymentUuid };
}

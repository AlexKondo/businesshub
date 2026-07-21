// Registers a new tenant subdomain with Coolify and triggers a redeploy so
// Traefik picks up the new Host rule. Coolify has no wildcard-domain support
// at the API level, so each tenant subdomain must be added explicitly.
export async function registerTenantDomain(slug: string): Promise<{ deploymentUuid: string | null }> {
  const base = process.env.COOLIFY_BASE_URL;
  const token = process.env.COOLIFY_API_TOKEN;
  const appUuid = process.env.COOLIFY_APP_UUID;
  const rootDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "");

  const appRes = await fetch(`${base}/api/v1/applications/${appUuid}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const app = await appRes.json();
  const existing: string = app.fqdn ?? "";
  const newDomain = `https://${slug}.${rootDomain}`;

  if (!existing.includes(newDomain)) {
    const domains = [existing, newDomain].filter(Boolean).join(",");
    await fetch(`${base}/api/v1/applications/${appUuid}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ domains }),
    });
  }

  const deployRes = await fetch(`${base}/api/v1/deploy?uuid=${appUuid}&force=true`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const deploy = await deployRes.json();
  return { deploymentUuid: deploy?.deployments?.[0]?.deployment_uuid ?? null };
}

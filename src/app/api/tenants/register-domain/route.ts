import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Server-only: registers a new tenant's subdomain with Coolify and triggers
// a redeploy so Traefik picks up the new Host rule. Coolify has no wildcard
// domain support at the API level, so each tenant subdomain must be added
// explicitly — this is the one-time cost paid at onboarding, not per request.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await request.json();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  // confirm the caller actually owns a membership in this tenant before
  // touching infra on their behalf
  const { data: membership } = await supabase
    .from("memberships")
    .select("companies!inner(slug)")
    .eq("companies.slug", slug)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

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
  const deploymentUuid = deploy?.deployments?.[0]?.deployment_uuid ?? null;

  return NextResponse.json({ deploymentUuid });
}

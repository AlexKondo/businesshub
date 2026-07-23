import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Polled by the "Aprovar" checklist popup so it can wait for the ACTUAL
// Coolify redeploy to finish (registerTenantDomain only queues it — the
// subdomain isn't reachable until Traefik picks up the new domain, which is
// exactly what this deployment represents) instead of closing as soon as
// the review-company-request request itself resolves.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deploymentUuid = searchParams.get("deploymentUuid");
  if (!deploymentUuid) {
    return NextResponse.json({ error: "missing_deployment_uuid" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!platformAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const base = process.env.COOLIFY_BASE_URL;
  const token = process.env.COOLIFY_API_TOKEN;
  const res = await fetch(`${base}/api/v1/deployments/${deploymentUuid}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "coolify_error" }, { status: 502 });
  }
  const data = await res.json();
  return NextResponse.json({ status: data.status ?? null });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerTenantDomain } from "@/lib/coolify";
import { logAudit } from "@/lib/audit-log";

// Platform-admin-only pause/resume for an already-approved company.
// Deactivating does NOT deregister its Coolify subdomain — the domain stays
// routed, and proxy.ts is what actually blocks access (every path renders
// the tenant-landing "workspace deactivated" message, see proxy.ts for
// details), so a paused tenant shows a real message instead of Traefik's
// raw "no available server". Activating re-registers the domain in case it
// was somehow missing (idempotent no-op otherwise). Only applies to
// companies already past approval — pending_approval has its own lifecycle
// via /api/tenants/review-company-request.
export async function POST(request: Request) {
  try {
    return await handleToggle(request);
  } catch (err) {
    console.error("[tenants/toggle-company-active] unhandled error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function handleToggle(request: Request) {
  const { companyId, active } = await request.json();
  if (!companyId || typeof active !== "boolean") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
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

  const admin = createAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("id, name, slug, status")
    .eq("id", companyId)
    .maybeSingle();
  if (!company || company.status === "pending_approval") {
    return NextResponse.json({ error: "not_active_or_inactive" }, { status: 400 });
  }

  const nextStatus = active ? "active" : "inactive";
  if (company.status === nextStatus) {
    return NextResponse.json({ ok: true });
  }

  await admin.from("companies").update({ status: nextStatus }).eq("id", companyId);

  if (active) {
    await registerTenantDomain(company.slug);
  }

  await logAudit({
    tenantId: companyId,
    actorId: user.id,
    action: active ? "company.activated" : "company.deactivated",
    entityType: "company",
    entityId: companyId,
    metadata: { name: company.name, slug: company.slug },
  });

  return NextResponse.json({ ok: true });
}

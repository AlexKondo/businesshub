import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit-log";

// Tenant-admin control to disable a supplier's access without deleting their
// data. "disabled" is one of the values memberships.status already accepts
// (see the check constraint) — the actual access gates (proxy.ts's ownsSlug
// check, (app)/layout.tsx's membership lookup) both filter on
// status = 'active', so this genuinely blocks login, not just a UI flag.
export async function POST(request: Request) {
  try {
    return await handleToggle(request);
  } catch (err) {
    console.error("[tenants/toggle-supplier-status] unhandled error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function handleToggle(request: Request) {
  const { tenantId, membershipId, active } = await request.json();
  if (!tenantId || !membershipId || typeof active !== "boolean") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: allowed } = await supabase.rpc("user_has_permission", {
    target_tenant_id: tenantId,
    permission_key: "suppliers.write",
  });
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("memberships")
    .select("id, tenant_id, user_id")
    .eq("id", membershipId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const nextStatus = active ? "active" : "disabled";
  await admin.from("memberships").update({ status: nextStatus }).eq("id", membershipId);

  await logAudit({
    tenantId,
    actorId: user.id,
    action: active ? "supplier.activated" : "supplier.disabled",
    entityType: "membership",
    entityId: membershipId,
  });

  return NextResponse.json({ ok: true });
}

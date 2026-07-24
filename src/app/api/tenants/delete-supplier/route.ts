import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit-log";

// Removes a supplier's membership at this tenant (and, via
// supplier_onboarding_submissions' "on delete cascade" to membership_id,
// their submitted answers). Does NOT delete the underlying auth user — they
// may have accounts/memberships at other tenants.
export async function POST(request: Request) {
  try {
    return await handleDelete(request);
  } catch (err) {
    console.error("[tenants/delete-supplier] unhandled error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function handleDelete(request: Request) {
  const { tenantId, membershipId } = await request.json();
  if (!tenantId || !membershipId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [{ data: allowed }, { data: platformAdmin }] = await Promise.all([
    supabase.rpc("user_has_permission", {
      target_tenant_id: tenantId,
      permission_key: "suppliers.write",
    }),
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!allowed && !platformAdmin) {
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

  const { data: authUser } = await admin.auth.admin.getUserById(membership.user_id);

  await admin.from("memberships").delete().eq("id", membershipId);

  await logAudit({
    tenantId,
    actorId: user.id,
    action: "supplier.deleted",
    entityType: "membership",
    entityId: membershipId,
    metadata: { email: authUser?.user?.email ?? null },
  });

  return NextResponse.json({ ok: true });
}

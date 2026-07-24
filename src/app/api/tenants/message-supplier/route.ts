import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail";
import { logAudit } from "@/lib/audit-log";

// Sends a free-text message from a tenant admin to one of their suppliers.
// Email only for now — WhatsApp is not implemented (needs a WhatsApp
// Business API integration, tracked separately).
export async function POST(request: Request) {
  try {
    return await handleMessage(request);
  } catch (err) {
    console.error("[tenants/message-supplier] unhandled error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function handleMessage(request: Request) {
  const { tenantId, membershipId, message } = await request.json();
  if (!tenantId || !membershipId || typeof message !== "string" || !message.trim()) {
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
  const [{ data: membership }, { data: company }] = await Promise.all([
    admin
      .from("memberships")
      .select("id, tenant_id, user_id")
      .eq("id", membershipId)
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    admin.from("companies").select("name").eq("id", tenantId).maybeSingle(),
  ]);
  if (!membership) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: authUser } = await admin.auth.admin.getUserById(membership.user_id);
  const email = authUser?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await sendMail({
    to: email,
    subject: `${company?.name ?? "BusinessHub"} — Nova mensagem`,
    html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
  });

  await logAudit({
    tenantId,
    actorId: user.id,
    action: "supplier.messaged",
    entityType: "membership",
    entityId: membershipId,
    metadata: { channel: "email" },
  });

  return NextResponse.json({ ok: true });
}

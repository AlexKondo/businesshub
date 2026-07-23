import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit-log";

// Admin-initiated supplier signup: the tenant admin only provides an email,
// Supabase's inviteUserByEmail creates the (unconfirmed) auth user and sends
// its own "invite" email — same confirmation-code redirect mechanism as the
// public signup form, so /auth/callback's existing pending_supplier_tenant_id
// handling (see ensureSupplierMembership) creates the Fornecedor membership
// the moment the invitee clicks the link, no separate code path needed here.
export async function POST(request: Request) {
  try {
    return await handleInvite(request);
  } catch (err) {
    console.error("[tenants/invite-supplier] unhandled error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function handleInvite(request: Request) {
  const { tenantId, email, locale } = await request.json();
  if (!tenantId || typeof email !== "string" || !email.includes("@")) {
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
  const { data: company } = await admin
    .from("companies")
    .select("id, slug")
    .eq("id", tenantId)
    .maybeSingle();
  if (!company) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://businesshub.app.br";
  const safeLocale = typeof locale === "string" && locale ? locale : "pt-BR";

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/${safeLocale}/supplier-onboarding`,
    data: {
      locale: safeLocale,
      pending_supplier_tenant_id: tenantId,
    },
  });

  if (error) {
    const alreadyExists = /already registered|already been registered/i.test(error.message);
    return NextResponse.json(
      { error: alreadyExists ? "already_registered" : "invite_failed", message: error.message },
      { status: 400 }
    );
  }

  await logAudit({
    tenantId,
    actorId: user.id,
    action: "supplier.invited",
    entityType: "membership",
    metadata: { email },
  });

  return NextResponse.json({ ok: true });
}

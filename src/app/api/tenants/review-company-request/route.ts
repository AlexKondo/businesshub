import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerTenantDomain } from "@/lib/coolify";
import { sendMail } from "@/lib/mail";

// Platform-admin-only approve/reject for a pending "create a new company"
// request (see /api/tenants/onboard). Approving is the ONLY place a
// subdomain gets provisioned for a self-service company now — rejecting
// deletes the company row outright (cascades the requester's pending
// membership) so its slug/tax_id are free for a future attempt, rather than
// leaving a dead reservation behind.
export async function POST(request: Request) {
  try {
    return await handleReview(request);
  } catch (err) {
    console.error("[tenants/review-company-request] unhandled error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function handleReview(request: Request) {
  const { companyId, action } = await request.json();
  if (!companyId || (action !== "approve" && action !== "reject")) {
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
  if (!company || company.status !== "pending_approval") {
    return NextResponse.json({ error: "not_pending" }, { status: 400 });
  }

  const { data: membership } = await admin
    .from("memberships")
    .select("id, user_id")
    .eq("tenant_id", companyId)
    .eq("status", "pending")
    .maybeSingle();

  const requesterEmail = membership?.user_id
    ? ((await admin.auth.admin.getUserById(membership.user_id)).data?.user?.email ?? null)
    : null;

  if (action === "reject") {
    await admin.from("companies").delete().eq("id", companyId);
    if (requesterEmail) {
      await sendMail({
        to: requesterEmail,
        subject: `Pedido não aprovado — ${company.name}`,
        html: `<p>Seu pedido para criar <strong>${company.name}</strong> no BusinessHub não foi aprovado.</p>`,
      }).catch(() => null); // best-effort — a mail failure shouldn't fail the request
    }
    return NextResponse.json({ ok: true });
  }

  await admin.from("companies").update({ status: "active" }).eq("id", companyId);
  if (membership) {
    await admin.from("memberships").update({ status: "active" }).eq("id", membership.id);
  }
  await registerTenantDomain(company.slug);

  if (requesterEmail) {
    const root = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "");
    await sendMail({
      to: requesterEmail,
      subject: `Empresa aprovada — ${company.name}`,
      html: `<p><strong>${company.name}</strong> foi aprovada no BusinessHub.</p>
             <p>Acesse: <a href="https://${company.slug}.${root}">https://${company.slug}.${root}</a></p>`,
    }).catch(() => null); // best-effort — a mail failure shouldn't fail the request
  }

  return NextResponse.json({ ok: true });
}

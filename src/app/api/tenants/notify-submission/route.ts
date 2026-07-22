import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail";

// Fired (best-effort, fire-and-forget from the client) right after a
// supplier's onboarding-form upsert succeeds, so every active admin of the
// tenant gets an email pointing them at "Cadastros" — mirrors the
// pending-membership notification in /api/tenants/onboard.
export async function POST(request: Request) {
  try {
    return await handleNotify(request);
  } catch (err) {
    console.error("[tenants/notify-submission] unhandled error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function handleNotify(request: Request) {
  const { tenantId, formId } = await request.json();
  if (!tenantId || !formId) {
    return NextResponse.json({ error: "missing_tenant_or_form" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Caller must be an active member of this tenant — same ownership bar as
  // the supplier_onboarding_submissions RLS insert/update policies.
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Only notify on a submission's very first save, and only when a real
  // submission row for THIS caller/form actually exists — via the caller's
  // own RLS-scoped client, so a foreign tenant's formId can never match and
  // this can't be called directly to spam admins or probe other forms.
  // created_at === updated_at is only true right after insert (the
  // set_updated_at trigger only touches updated_at), so a re-save doesn't
  // re-notify.
  const { data: submission } = await supabase
    .from("supplier_onboarding_submissions")
    .select("created_at, updated_at")
    .eq("membership_id", membership.id)
    .eq("form_id", formId)
    .maybeSingle();
  if (!submission || submission.created_at !== submission.updated_at) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const [{ data: form }, { data: company }, { data: profile }] = await Promise.all([
    supabase.from("onboarding_forms").select("name").eq("id", formId).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("companies").select("name").eq("id", tenantId).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const admin = createAdminClient();
  const { data: adminRole } = await admin
    .from("roles")
    .select("id")
    .eq("name", "Administrador da Empresa")
    .is("tenant_id", null)
    .single();

  const { data: admins } = await admin
    .from("memberships")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .eq("role_id", adminRole!.id);

  const supplierName = profile?.full_name ?? user.email ?? "";
  const formName = form?.name ?? "";
  const companyName = company?.name ?? "";

  for (const m of admins ?? []) {
    const { data: adminUser } = await admin.auth.admin.getUserById(m.user_id);
    const email = adminUser?.user?.email;
    if (!email) continue;
    await sendMail({
      to: email,
      subject: `Formulário preenchido — ${supplierName}`,
      html: `<p><strong>${supplierName}</strong> (${user.email}) preencheu o formulário <strong>${formName}</strong> em ${companyName}.</p>
             <p>Entre em "Cadastros" para ver as respostas.</p>`,
    }).catch(() => null); // best-effort — a mail failure shouldn't fail the request
  }

  return NextResponse.json({ ok: true });
}

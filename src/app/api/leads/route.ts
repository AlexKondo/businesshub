import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail";

// Public endpoint — no auth. Called from a tenant's public landing page by
// an anonymous visitor submitting the "become a supplier" lead form.
export async function POST(request: Request) {
  const { tenantId, contactName, companyName, email, phone } = await request.json();

  if (!tenantId || typeof tenantId !== "string") {
    return NextResponse.json({ error: "invalid_tenant" }, { status: 400 });
  }
  if (!contactName || typeof contactName !== "string" || contactName.trim().length < 2) {
    return NextResponse.json({ error: "invalid_contact_name" }, { status: 400 });
  }
  if (!companyName || typeof companyName !== "string" || companyName.trim().length < 2) {
    return NextResponse.json({ error: "invalid_company_name" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!phone || typeof phone !== "string" || phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id, name")
    .eq("id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!company) {
    return NextResponse.json({ error: "invalid_tenant" }, { status: 400 });
  }

  const { error: insertError } = await admin.from("supplier_leads").insert({
    tenant_id: company.id,
    contact_name: contactName.trim(),
    company_name: companyName.trim(),
    email: email.trim(),
    phone: phone.trim(),
  });
  if (insertError) {
    console.error("[leads] insert failed:", insertError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { data: adminRole } = await admin
    .from("roles")
    .select("id")
    .eq("name", "Administrador da Empresa")
    .is("tenant_id", null)
    .single();

  const { data: admins } = await admin
    .from("memberships")
    .select("user_id")
    .eq("tenant_id", company.id)
    .eq("status", "active")
    .eq("role_id", adminRole!.id);

  for (const m of admins ?? []) {
    const { data: adminUser } = await admin.auth.admin.getUserById(m.user_id);
    const adminEmail = adminUser?.user?.email;
    if (!adminEmail) continue;
    await sendMail({
      to: adminEmail,
      subject: `Novo interesse de fornecedor — ${company.name}`,
      html: `<p><strong>${contactName.trim()}</strong> (${companyName.trim()}) demonstrou interesse em ser fornecedor da <strong>${company.name}</strong>.</p>
             <p>E-mail: ${email.trim()}<br/>Telefone: ${phone.trim()}</p>
             <p>Entre no painel de Administração para ver os detalhes.</p>`,
    }).catch(() => null); // best-effort — a mail failure shouldn't fail the submission
  }

  return NextResponse.json({ ok: true });
}

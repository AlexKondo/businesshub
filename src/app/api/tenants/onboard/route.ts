import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerTenantDomain } from "@/lib/coolify";
import { isValidCnpj } from "@/lib/cnpj";
import { sendMail } from "@/lib/mail";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { name, slug, taxId } = await request.json();
  const normalizedTaxId = String(taxId ?? "").replace(/\D/g, "");

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  if (!isValidCnpj(normalizedTaxId)) {
    return NextResponse.json({ error: "invalid_tax_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  // must not already belong to a tenant
  const { data: existingMembership } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingMembership) {
    return NextResponse.json({ error: "already_onboarded" }, { status: 400 });
  }

  const { data: existingCompany } = await admin
    .from("companies")
    .select("id, slug")
    .eq("tax_id", normalizedTaxId)
    .maybeSingle();

  if (existingCompany) {
    // company already exists — join as pending, admin(s) approve + assign role
    const { error: membershipError } = await admin.from("memberships").insert({
      user_id: user.id,
      tenant_id: existingCompany.id,
      role_id: null,
      status: "pending",
    });
    if (membershipError) {
      return NextResponse.json({ error: "membership_failed" }, { status: 500 });
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
      .eq("tenant_id", existingCompany.id)
      .eq("status", "active")
      .eq("role_id", adminRole!.id);

    const requesterName =
      (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";

    for (const m of admins ?? []) {
      const { data: adminUser } = await admin.auth.admin.getUserById(m.user_id);
      const email = adminUser?.user?.email;
      if (!email) continue;
      await sendMail({
        to: email,
        subject: `Novo pedido de acesso — ${requesterName}`,
        html: `<p><strong>${requesterName}</strong> (${user.email}) pediu acesso ao seu workspace no BusinessHub.</p>
               <p>Entre no painel de Administração para aprovar e definir o papel dessa pessoa.</p>`,
      }).catch(() => null); // best-effort — a mail failure shouldn't fail the request
    }

    return NextResponse.json({ status: "pending" });
  }

  // no company with this tax_id yet — the requester becomes its first admin
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  const { data: newCompany, error: companyError } = await admin
    .from("companies")
    .insert({ name: name.trim(), slug, tax_id: normalizedTaxId })
    .select("id")
    .single();

  if (companyError) {
    const code = companyError.code === "23505" ? "slug_or_tax_id_taken" : "company_failed";
    return NextResponse.json({ error: code }, { status: 400 });
  }

  const { data: adminRole } = await admin
    .from("roles")
    .select("id")
    .eq("name", "Administrador da Empresa")
    .is("tenant_id", null)
    .single();

  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: user.id,
    tenant_id: newCompany.id,
    role_id: adminRole!.id,
    status: "active",
  });
  if (membershipError) {
    return NextResponse.json({ error: "membership_failed" }, { status: 500 });
  }

  const { deploymentUuid } = await registerTenantDomain(slug);

  return NextResponse.json({ status: "active", slug, deploymentUuid });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidCnpj } from "@/lib/cnpj";
import { sendMail } from "@/lib/mail";

export async function POST(request: Request) {
  try {
    return await handleOnboard(request);
  } catch (err) {
    console.error("[tenants/onboard] unhandled error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function handleOnboard(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://businesshub.app.br";
  const rootDomain = appUrl.replace(/^https?:\/\//, "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const {
    name,
    legalName,
    slug,
    taxId,
    addressZip,
    addressStreet,
    addressNumber,
    addressComplement,
    addressCity,
    addressState,
    addressCountry,
    phone,
  } = await request.json();
  const normalizedTaxId = String(taxId ?? "").replace(/\D/g, "");

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  if (!legalName || typeof legalName !== "string" || legalName.trim().length < 2) {
    return NextResponse.json({ error: "invalid_legal_name" }, { status: 400 });
  }
  if (!isValidCnpj(normalizedTaxId)) {
    return NextResponse.json({ error: "invalid_tax_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (phone) {
    await admin.from("profiles").update({ phone }).eq("id", user.id);
  }

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

  const { data: adminRole } = await admin
    .from("roles")
    .select("id")
    .eq("name", "Administrador da Empresa")
    .is("tenant_id", null)
    .single();

  const requesterName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";

  if (existingCompany) {
    // company already exists — join as pending, its own admin(s) approve + assign role
    const { error: membershipError } = await admin.from("memberships").insert({
      user_id: user.id,
      tenant_id: existingCompany.id,
      role_id: null,
      status: "pending",
    });
    if (membershipError) {
      console.error("[tenants/onboard] membership_failed (pending):", membershipError);
      return NextResponse.json({ error: "membership_failed" }, { status: 500 });
    }

    const { data: tenantAdmins } = await admin
      .from("memberships")
      .select("user_id")
      .eq("tenant_id", existingCompany.id)
      .eq("status", "active")
      .eq("role_id", adminRole!.id);

    for (const m of tenantAdmins ?? []) {
      const { data: adminUser } = await admin.auth.admin.getUserById(m.user_id);
      const email = adminUser?.user?.email;
      if (!email) continue;
      await sendMail({
        to: email,
        subject: `Novo pedido de acesso — ${requesterName}`,
        html: `<p><strong>${requesterName}</strong> (${user.email}) pediu acesso ao seu workspace no BusinessHub.</p>
               <p><a href="https://${existingCompany.slug}.${rootDomain}/pt-BR/admin">Entre no painel de Administração</a> para aprovar e definir o papel dessa pessoa.</p>`,
      }).catch(() => null); // best-effort — a mail failure shouldn't fail the request
    }

    return NextResponse.json({ status: "pending", reason: "existing_company" });
  }

  // no company with this tax_id yet — reserve it, pending platform-admin
  // approval. Nothing is provisioned (no subdomain, no active access) until
  // an admin reviews the request in Administração — deliberately: a
  // Coolify redeploy/container isn't free, and shouldn't happen for a
  // request that might get rejected.
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  const { data: newCompany, error: companyError } = await admin
    .from("companies")
    .insert({
      name: name.trim(),
      legal_name: legalName.trim(),
      slug,
      tax_id: normalizedTaxId,
      status: "pending_approval",
      address_zip: addressZip || null,
      address_street: addressStreet || null,
      address_number: addressNumber || null,
      address_complement: addressComplement || null,
      address_city: addressCity || null,
      address_state: addressState || null,
      address_country: addressCountry || "BR",
    })
    .select("id")
    .single();

  if (companyError) {
    console.error("[tenants/onboard] company insert failed:", companyError);
    const code = companyError.code === "23505" ? "slug_or_tax_id_taken" : "company_failed";
    return NextResponse.json({ error: code }, { status: 400 });
  }

  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: user.id,
    tenant_id: newCompany.id,
    role_id: adminRole!.id,
    status: "pending",
  });
  if (membershipError) {
    console.error("[tenants/onboard] membership_failed (pending, new company):", membershipError);
    return NextResponse.json({ error: "membership_failed" }, { status: 500 });
  }

  const { data: platformAdmins } = await admin.from("platform_admins").select("user_id");
  for (const pa of platformAdmins ?? []) {
    const { data: adminUser } = await admin.auth.admin.getUserById(pa.user_id);
    const email = adminUser?.user?.email;
    if (!email) continue;
    await sendMail({
      to: email,
      subject: `Nova empresa aguardando aprovação — ${name.trim()}`,
      html: `<p><strong>${requesterName}</strong> (${user.email}) pediu para criar <strong>${name.trim()}</strong> (${legalName.trim()}) no BusinessHub.</p>
             <p><a href="https://${rootDomain}/pt-BR/platform-admin">Entre no Super Admin</a> para aprovar ou rejeitar o pedido.</p>`,
    }).catch(() => null); // best-effort — a mail failure shouldn't fail the request
  }

  return NextResponse.json({ status: "pending", reason: "new_company" });
}

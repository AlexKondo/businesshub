import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCnpjWithVaas } from "@/lib/vaas";
import { logAudit } from "@/lib/audit-log";

// Platform-admin-only: runs a VaaS due-diligence check on a TENANT's own
// CNPJ (not a supplier's — see the future supplier-facing check for that).
// Returns the raw VaaS response/error as-is so the admin can see exactly
// what came back on the first real call, while the endpoint details are
// still being confirmed against VaaS's own docs.
export async function POST(request: Request) {
  try {
    return await handleCheck(request);
  } catch (err) {
    console.error("[tenants/vaas-check-company] unhandled error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function handleCheck(request: Request) {
  const { companyId } = await request.json();
  if (!companyId) {
    return NextResponse.json({ error: "missing_company" }, { status: 400 });
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
    .select("id, name, tax_id")
    .eq("id", companyId)
    .maybeSingle();
  if (!company || !company.tax_id) {
    return NextResponse.json({ error: "missing_tax_id" }, { status: 400 });
  }

  const result = await checkCnpjWithVaas(company.tax_id);

  await logAudit({
    tenantId: companyId,
    actorId: user.id,
    action: "company.vaas_checked",
    entityType: "company",
    entityId: companyId,
    metadata: { name: company.name, taxId: company.tax_id, ok: result.ok },
  });

  return NextResponse.json(result);
}

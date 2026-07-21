import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidCnpj } from "@/lib/cnpj";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const taxId = new URL(request.url).searchParams.get("taxId") ?? "";
  const normalizedTaxId = taxId.replace(/\D/g, "");
  if (!isValidCnpj(normalizedTaxId)) {
    return NextResponse.json({ error: "invalid_tax_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existingCompany } = await admin
    .from("companies")
    .select("id")
    .eq("tax_id", normalizedTaxId)
    .maybeSingle();

  return NextResponse.json({ exists: Boolean(existingCompany) });
}

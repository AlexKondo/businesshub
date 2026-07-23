import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeLabel } from "@/lib/text";

function digitsOnly(v: unknown): string {
  return typeof v === "string" ? v.replace(/\D/g, "") : "";
}

// Lists "Fornecedor" accounts for a tenant. Two very different audiences
// hit this route:
// - Staff with suppliers.read: see every supplier at the tenant, full
//   management controls (the admin's "Cadastros de Fornecedores" screen).
// - A supplier themselves: see ONLY the peers who submitted the same CNPJ
//   as they did (i.e. people from their own supplier company) — never
//   suppliers from a different company at the same tenant. No management
//   controls. Peer grouping happens here in application code, not RLS,
//   because "which field is the CNPJ" is admin-configurable per tenant
//   (matched by label, same normalizeLabel approach as the CEP-autofill
//   logic in dynamic-onboarding-form.tsx) rather than a fixed column.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "missing_tenant" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [{ data: allowed }, { data: ownMembership }] = await Promise.all([
    supabase.rpc("user_has_permission", {
      target_tenant_id: tenantId,
      permission_key: "suppliers.read",
    }),
    supabase
      .from("memberships")
      .select("id, roles(name)")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .maybeSingle<{ id: string; roles: { name: string } | null }>(),
  ]);
  const isFornecedorHere = ownMembership?.roles?.name === "Fornecedor";
  if (!allowed && !isFornecedorHere) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const canManage = !!allowed;

  const admin = createAdminClient();

  const { data: fornecedorRole } = await admin
    .from("roles")
    .select("id")
    .eq("name", "Fornecedor")
    .is("tenant_id", null)
    .single();

  const { data: memberships, error: membershipsError } = await admin
    .from("memberships")
    .select("id, user_id, created_at, status")
    .eq("tenant_id", tenantId)
    .eq("role_id", fornecedorRole!.id)
    .in("status", ["active", "disabled"])
    .order("created_at", { ascending: true });

  if (membershipsError) {
    console.error("[tenants/supplier-users] memberships query failed:", membershipsError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const membershipIds = (memberships ?? []).map((m) => m.id);

  const [{ data: submissions }, { data: forms }, { data: fields }] = await Promise.all([
    membershipIds.length
      ? admin
          .from("supplier_onboarding_submissions")
          .select("membership_id, form_id, answers")
          .in("membership_id", membershipIds)
      : Promise.resolve({ data: [] as { membership_id: string; form_id: string; answers: Record<string, unknown> }[] }),
    admin
      .from("onboarding_forms")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true }),
    admin.from("onboarding_form_fields").select("form_id, key, label").eq("tenant_id", tenantId),
  ]);

  const submittedFormsByMembership = new Map<string, Set<string>>();
  for (const s of submissions ?? []) {
    if (!submittedFormsByMembership.has(s.membership_id)) {
      submittedFormsByMembership.set(s.membership_id, new Set());
    }
    submittedFormsByMembership.get(s.membership_id)!.add(s.form_id);
  }

  let visibleMembershipIds: Set<string> | null = null; // null = everyone (staff)

  if (!canManage) {
    const cnpjKeysByForm = new Map<string, Set<string>>();
    for (const f of fields ?? []) {
      if (!normalizeLabel(f.label).includes("cnpj")) continue;
      if (!cnpjKeysByForm.has(f.form_id)) cnpjKeysByForm.set(f.form_id, new Set());
      cnpjKeysByForm.get(f.form_id)!.add(f.key);
    }

    const cnpjByMembership = new Map<string, string>();
    for (const s of submissions ?? []) {
      const keys = cnpjKeysByForm.get(s.form_id);
      if (!keys) continue;
      for (const key of keys) {
        const digits = digitsOnly((s.answers as Record<string, unknown>)?.[key]);
        if (digits) {
          cnpjByMembership.set(s.membership_id, digits);
          break;
        }
      }
    }

    const ownCnpj = ownMembership ? cnpjByMembership.get(ownMembership.id) : undefined;
    visibleMembershipIds = new Set(ownMembership ? [ownMembership.id] : []);
    if (ownCnpj) {
      for (const [membershipId, cnpj] of cnpjByMembership) {
        if (cnpj === ownCnpj) visibleMembershipIds.add(membershipId);
      }
    }
  }

  const visibleMemberships = (memberships ?? []).filter(
    (m) => visibleMembershipIds === null || visibleMembershipIds.has(m.id)
  );

  const users = await Promise.all(
    visibleMemberships.map(async (m) => {
      const [{ data: authUser }, { data: profile }] = await Promise.all([
        admin.auth.admin.getUserById(m.user_id),
        admin.from("profiles").select("full_name").eq("id", m.user_id).maybeSingle(),
      ]);
      return {
        membershipId: m.id,
        createdAt: m.created_at,
        status: m.status as "active" | "disabled",
        email: authUser?.user?.email ?? "",
        fullName: profile?.full_name ?? authUser?.user?.email ?? "",
        submittedFormIds: Array.from(submittedFormsByMembership.get(m.id) ?? []),
      };
    })
  );

  return NextResponse.json({ users, forms: forms ?? [], canManage });
}

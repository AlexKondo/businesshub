import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Lists every active "Fornecedor" account for a tenant — i.e. everyone who
// signed up via the public landing page, whether or not they've submitted
// any onboarding form yet. supplier_onboarding_submissions alone can't
// answer "who signed up" (a person with zero submissions is invisible
// there), which is exactly the admin-visibility gap this route closes.
// Same authorization/enrichment shape as /api/tenants/supplier-submissions:
// re-checks suppliers.read here (RLS alone can't gate cross-user
// profiles/auth.users reads), then uses the admin client only for that
// enrichment.
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

  // Either a real admin permission, or the caller is themselves an active
  // Fornecedor of this tenant — suppliers are allowed to see their peers
  // (name/email/signup date/form status only, never other suppliers'
  // submitted answers) via this same list.
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

  const admin = createAdminClient();

  const { data: fornecedorRole } = await admin
    .from("roles")
    .select("id")
    .eq("name", "Fornecedor")
    .is("tenant_id", null)
    .single();

  const { data: memberships, error: membershipsError } = await admin
    .from("memberships")
    .select("id, user_id, created_at")
    .eq("tenant_id", tenantId)
    .eq("role_id", fornecedorRole!.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipsError) {
    console.error("[tenants/supplier-users] memberships query failed:", membershipsError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const membershipIds = (memberships ?? []).map((m) => m.id);

  const [{ data: submissions }, { data: forms }] = await Promise.all([
    membershipIds.length
      ? admin
          .from("supplier_onboarding_submissions")
          .select("membership_id, form_id")
          .in("membership_id", membershipIds)
      : Promise.resolve({ data: [] as { membership_id: string; form_id: string }[] }),
    admin
      .from("onboarding_forms")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true }),
  ]);

  const submittedFormsByMembership = new Map<string, Set<string>>();
  for (const s of submissions ?? []) {
    if (!submittedFormsByMembership.has(s.membership_id)) {
      submittedFormsByMembership.set(s.membership_id, new Set());
    }
    submittedFormsByMembership.get(s.membership_id)!.add(s.form_id);
  }

  const users = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const [{ data: authUser }, { data: profile }] = await Promise.all([
        admin.auth.admin.getUserById(m.user_id),
        admin.from("profiles").select("full_name").eq("id", m.user_id).maybeSingle(),
      ]);
      return {
        membershipId: m.id,
        createdAt: m.created_at,
        email: authUser?.user?.email ?? "",
        fullName: profile?.full_name ?? authUser?.user?.email ?? "",
        submittedFormIds: Array.from(submittedFormsByMembership.get(m.id) ?? []),
      };
    })
  );

  return NextResponse.json({ users, forms: forms ?? [] });
}

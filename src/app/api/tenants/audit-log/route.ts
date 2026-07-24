import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Operations / audit log feed for the standalone "Log de Operações" screen.
// - Platform admin: a specific tenant (?tenantId=) or, with no tenantId, a
//   global feed across every tenant (company name is included so entries stay
//   attributable).
// - Administrador da Empresa: only their own tenant's log (tenantId must match
//   the tenant where they hold that role).
// audit_logs has no tenant-admin RLS read policy, so authorization is enforced
// here and rows are read with the service-role admin client.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

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
    // A tenant admin may only read their OWN tenant's log.
    if (!tenantId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { data: membership } = await supabase
      .from("memberships")
      .select("roles(name)")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .maybeSingle<{ roles: { name: string } | null }>();
    if (membership?.roles?.name !== "Administrador da Empresa") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const admin = createAdminClient();

  let query = admin
    .from("audit_logs")
    .select("id, tenant_id, action, entity_type, actor_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }
  const { data: rows } = await query;

  // Enrich actor names (auth email / profile full name) and, for the global
  // feed, company names — both cross-user/cross-tenant reads that need the
  // admin client. Batch the distinct ids so a long feed doesn't fan out to
  // one query per row.
  const actorIds = Array.from(
    new Set((rows ?? []).map((r) => r.actor_id).filter((id): id is string => !!id))
  );
  const actorNames = new Map<string, string>();
  await Promise.all(
    actorIds.map(async (id) => {
      const [{ data: authUser }, { data: profile }] = await Promise.all([
        admin.auth.admin.getUserById(id),
        admin.from("profiles").select("full_name").eq("id", id).maybeSingle(),
      ]);
      actorNames.set(id, profile?.full_name ?? authUser?.user?.email ?? id);
    })
  );

  const companyNames = new Map<string, string>();
  if (!tenantId) {
    const companyIds = Array.from(
      new Set((rows ?? []).map((r) => r.tenant_id).filter((id): id is string => !!id))
    );
    if (companyIds.length) {
      const { data: companies } = await admin
        .from("companies")
        .select("id, name")
        .in("id", companyIds);
      for (const c of companies ?? []) companyNames.set(c.id as string, c.name as string);
    }
  }

  const entries = (rows ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entity_type,
    actorName: r.actor_id ? (actorNames.get(r.actor_id) ?? r.actor_id) : null,
    companyName: r.tenant_id ? (companyNames.get(r.tenant_id) ?? null) : null,
    metadata: r.metadata,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ entries, global: !tenantId });
}

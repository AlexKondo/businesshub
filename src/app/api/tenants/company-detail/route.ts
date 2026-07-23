import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Platform-admin-only: a company's member list + recent audit log entries,
// for the expandable row detail in "Todas as Empresas".
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
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

  const [{ data: memberships }, { data: auditRows }] = await Promise.all([
    admin
      .from("memberships")
      .select("id, user_id, status, created_at, roles(name)")
      .eq("tenant_id", companyId)
      .order("created_at", { ascending: true }),
    admin
      .from("audit_logs")
      .select("id, action, entity_type, actor_id, metadata, created_at")
      .eq("tenant_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const members = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const [{ data: authUser }, { data: profile }] = await Promise.all([
        admin.auth.admin.getUserById(m.user_id),
        admin.from("profiles").select("full_name").eq("id", m.user_id).maybeSingle(),
      ]);
      return {
        membershipId: m.id,
        status: m.status,
        createdAt: m.created_at,
        roleName: (m.roles as unknown as { name: string } | null)?.name ?? null,
        email: authUser?.user?.email ?? "",
        fullName: profile?.full_name ?? authUser?.user?.email ?? "",
      };
    })
  );

  const actorIds = Array.from(
    new Set((auditRows ?? []).map((r) => r.actor_id).filter((id): id is string => !!id))
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

  const auditLog = (auditRows ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entity_type,
    actorName: r.actor_id ? (actorNames.get(r.actor_id) ?? r.actor_id) : null,
    metadata: r.metadata,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ members, auditLog });
}

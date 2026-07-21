import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Lists pending membership requests for the caller's own tenant(s). Uses the
// caller's own RLS-respecting client to discover which tenant they administer
// (so this route can't be used to snoop on a tenant the caller has no
// permission over), then the admin client only to enrich with emails, since
// those live in auth.users which RLS never exposes.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: myMemberships } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  const tenantIds = (myMemberships ?? []).map((m) => m.tenant_id);
  if (tenantIds.length === 0) {
    return NextResponse.json({ pending: [] });
  }

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("memberships")
    .select("id, tenant_id, created_at, user_id")
    .in("tenant_id", tenantIds)
    .eq("status", "pending");

  const enriched = await Promise.all(
    (pending ?? []).map(async (m) => {
      const { data: authUser } = await admin.auth.admin.getUserById(m.user_id);
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", m.user_id)
        .maybeSingle();
      return {
        id: m.id,
        createdAt: m.created_at,
        email: authUser?.user?.email ?? "",
        fullName: profile?.full_name ?? authUser?.user?.email ?? "",
      };
    })
  );

  return NextResponse.json({ pending: enriched });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Lists submitted supplier-onboarding answers for a tenant. Authorization is
// re-checked here (via the same user_has_permission RPC RLS policies use)
// because rendering requires the supplier's name/email from
// profiles/auth.users, which aren't visible cross-user under RLS, so this
// route has to go through the admin client — unlike a plain RLS-covered read.
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

  const { data: allowed } = await supabase.rpc("user_has_permission", {
    target_tenant_id: tenantId,
    permission_key: "suppliers.read",
  });
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: submissions } = await admin
    .from("supplier_onboarding_submissions")
    .select("id, answers, updated_at, memberships(user_id)")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  const enriched = await Promise.all(
    (submissions ?? []).map(async (s) => {
      const membership = s.memberships as unknown as { user_id: string } | null;
      const userId = membership?.user_id;
      const [{ data: authUser }, { data: profile }] = userId
        ? await Promise.all([
            admin.auth.admin.getUserById(userId),
            admin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
          ])
        : [{ data: null }, { data: null }];
      return {
        id: s.id,
        updatedAt: s.updated_at,
        answers: s.answers,
        email: authUser?.user?.email ?? "",
        fullName: profile?.full_name ?? authUser?.user?.email ?? "",
      };
    })
  );

  return NextResponse.json({ submissions: enriched });
}

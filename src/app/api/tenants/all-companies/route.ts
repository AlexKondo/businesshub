import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Lists every company on the platform (any status), for the platform-admin
// "Todas as Empresas" panel. Platform-admin-only — there's no tenant the
// caller already belongs to that this could otherwise be anchored on.
export async function GET() {
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
  const { data: companies } = await admin
    .from("companies")
    .select("id, name, legal_name, slug, tax_id, status, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const enriched = await Promise.all(
    (companies ?? []).map(async (c) => {
      const { count } = await admin
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", c.id)
        .eq("status", "active");
      return {
        id: c.id,
        name: c.name,
        legalName: c.legal_name,
        slug: c.slug,
        taxId: c.tax_id,
        status: c.status,
        createdAt: c.created_at,
        memberCount: count ?? 0,
      };
    })
  );

  return NextResponse.json({ companies: enriched });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Lists every company self-service signup still awaiting a platform admin's
// approval, with the requester's name/email enriched from auth.users
// (never visible to the caller through RLS). Platform-admin-only — unlike
// tenant-scoped admin lists, there's no "tenant the caller already belongs
// to" to anchor this on, so the check is is_platform_admin() directly.
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
    .select("id, name, legal_name, tax_id, slug, created_at")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  const enriched = await Promise.all(
    (companies ?? []).map(async (c) => {
      const { data: membership } = await admin
        .from("memberships")
        .select("user_id")
        .eq("tenant_id", c.id)
        .eq("status", "pending")
        .maybeSingle();

      let requesterName = "";
      let requesterEmail = "";
      if (membership?.user_id) {
        const [{ data: authUser }, { data: profile }] = await Promise.all([
          admin.auth.admin.getUserById(membership.user_id),
          admin.from("profiles").select("full_name").eq("id", membership.user_id).maybeSingle(),
        ]);
        requesterEmail = authUser?.user?.email ?? "";
        requesterName = profile?.full_name ?? requesterEmail;
      }

      return {
        id: c.id,
        name: c.name,
        legalName: c.legal_name,
        taxId: c.tax_id,
        slug: c.slug,
        createdAt: c.created_at,
        requesterName,
        requesterEmail,
      };
    })
  );

  return NextResponse.json({ companies: enriched });
}

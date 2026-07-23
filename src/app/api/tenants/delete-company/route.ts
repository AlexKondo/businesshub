import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Permanently deletes a company (any status) — platform-admin only. Cascades
// every tenant-scoped row (memberships, onboarding forms/submissions, etc.
// all reference companies(id) on delete cascade) and, via the existing
// Supabase DELETE webhook, tears down its Coolify subdomain. Irreversible —
// the client is expected to confirm before calling this.
export async function POST(request: Request) {
  try {
    return await handleDelete(request);
  } catch (err) {
    console.error("[tenants/delete-company] unhandled error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function handleDelete(request: Request) {
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
  const { error } = await admin.from("companies").delete().eq("id", companyId);
  if (error) {
    console.error("[tenants/delete-company] delete failed:", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

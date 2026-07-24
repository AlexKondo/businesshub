import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPPLIER_FILES_BUCKET, FORM_ATTACHMENTS_BUCKET } from "@/lib/onboarding-files";

export const runtime = "nodejs";

const SIGNED_URL_TTL_SECONDS = 60;

// Hands back a short-lived signed DOWNLOAD url after checking the caller is
// entitled to the object. The tenant id is always the FIRST path segment, so
// authorization is derived from the path itself — a caller can't fetch another
// tenant's file by guessing a path.
//   supplier-files:   owner (their membership id in the path) OR staff
//                     (suppliers.read) OR platform admin
//   form-attachments: any active member of the tenant (suppliers download
//                     these) OR staff OR platform admin
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const bucket = body?.bucket as string | undefined;
  const path = body?.path as string | undefined;

  if (!path || (bucket !== SUPPLIER_FILES_BUCKET && bucket !== FORM_ATTACHMENTS_BUCKET)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const segments = path.split("/");
  const tenantId = segments[0];
  if (!tenantId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [{ data: platformAdmin }, { data: membership }, { data: canRead }] = await Promise.all([
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .maybeSingle<{ id: string }>(),
    supabase.rpc("user_has_permission", {
      target_tenant_id: tenantId,
      permission_key: "suppliers.read",
    }),
  ]);

  let allowed = !!platformAdmin || !!canRead;
  if (!allowed && membership) {
    if (bucket === FORM_ATTACHMENTS_BUCKET) {
      // Any active member of the tenant may download an admin attachment.
      allowed = true;
    } else {
      // supplier-files: only the owner (membership id is the 3rd path segment).
      allowed = segments[2] === membership.id;
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error("[onboarding-file/download-url] createSignedUrl failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}

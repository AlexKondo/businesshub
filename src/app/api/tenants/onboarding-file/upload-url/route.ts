import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SUPPLIER_FILES_BUCKET,
  FORM_ATTACHMENTS_BUCKET,
  extensionAllowed,
  sanitizeFilename,
} from "@/lib/onboarding-files";

export const runtime = "nodejs";

// Hands back a short-lived signed UPLOAD url so the browser can put a file
// straight into a private bucket without the file ever transiting our server.
// Authorization is enforced here per kind; the object path is server-chosen
// (never client-supplied) so a caller can't write outside their own scope.
//   kind 'supplier'   -> the caller uploads their OWN submission file
//   kind 'attachment' -> staff (suppliers.write) attach a downloadable to a form
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tenantId = body?.tenantId as string | undefined;
  const formId = body?.formId as string | undefined;
  const fieldKey = body?.fieldKey as string | undefined;
  const filename = body?.filename as string | undefined;
  const kind = body?.kind as string | undefined;

  if (!tenantId || !formId || !fieldKey || !filename || (kind !== "supplier" && kind !== "attachment")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!extensionAllowed(filename)) {
    return NextResponse.json({ error: "type_not_allowed" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const safeName = `${randomUUID()}-${sanitizeFilename(filename)}`;
  let bucket: string;
  let path: string;

  if (kind === "supplier") {
    // The uploader must be an active member of this tenant; the file is filed
    // under THEIR membership id so it stays attributable and isolated.
    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .maybeSingle<{ id: string }>();
    if (!membership) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    bucket = SUPPLIER_FILES_BUCKET;
    path = `${tenantId}/${formId}/${membership.id}/${fieldKey}/${safeName}`;
  } else {
    // Attaching a downloadable is a form-management action.
    const [{ data: allowed }, { data: platformAdmin }] = await Promise.all([
      supabase.rpc("user_has_permission", {
        target_tenant_id: tenantId,
        permission_key: "suppliers.write",
      }),
      supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);
    if (!allowed && !platformAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    bucket = FORM_ATTACHMENTS_BUCKET;
    path = `${tenantId}/${formId}/${fieldKey}/${safeName}`;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[onboarding-file/upload-url] createSignedUploadUrl failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ bucket, path: data.path, token: data.token, signedUrl: data.signedUrl });
}

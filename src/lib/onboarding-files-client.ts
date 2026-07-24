import { createClient } from "@/lib/supabase/client";
import { MAX_FILE_SIZE, extensionAllowed, type UploadedFile } from "@/lib/onboarding-files";

export type UploadResult = { ok: true; file: UploadedFile } | { ok: false; error: string };

// Client-side upload: asks the server for a scoped signed upload URL (which
// enforces authorization + chooses the object path), then PUTs the file
// straight into the private bucket. The file never transits our own server.
export async function uploadOnboardingFile(opts: {
  tenantId: string;
  formId: string;
  fieldKey: string;
  kind: "supplier" | "attachment";
  file: File;
}): Promise<UploadResult> {
  const { file } = opts;
  if (file.size > MAX_FILE_SIZE) return { ok: false, error: "too_large" };
  if (!extensionAllowed(file.name)) return { ok: false, error: "type_not_allowed" };

  const res = await fetch("/api/tenants/onboarding-file/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId: opts.tenantId,
      formId: opts.formId,
      fieldKey: opts.fieldKey,
      filename: file.name,
      kind: opts.kind,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error ?? "upload_failed" };
  }
  const { bucket, path, token } = await res.json();

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
  if (error) return { ok: false, error: "upload_failed" };

  return { ok: true, file: { path, name: file.name } };
}

// Resolves a short-lived signed download URL for an object the caller is
// entitled to (server-checked). Returns null on any failure.
export async function getOnboardingDownloadUrl(bucket: string, path: string): Promise<string | null> {
  const res = await fetch("/api/tenants/onboarding-file/download-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, path }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.url ?? null;
}

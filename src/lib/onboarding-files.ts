// Shared constants/helpers for onboarding file fields. Two private buckets:
//  - supplier-files:   supplier-uploaded submission files ('file' fields)
//  - form-attachments: admin-attached downloadables ('download' fields)
// All access is brokered by API routes (service-role client + short-lived
// signed URLs); see /api/tenants/onboarding-file/*.
export const SUPPLIER_FILES_BUCKET = "supplier-files";
export const FORM_ATTACHMENTS_BUCKET = "form-attachments";
export const ONBOARDING_BUCKETS = [SUPPLIER_FILES_BUCKET, FORM_ATTACHMENTS_BUCKET] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB — matches the bucket cap

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
];

// For the file picker's `accept` attribute + a friendly client-side check.
export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".csv",
  ".txt",
  ".zip",
];

export const FILE_ACCEPT_ATTR = ALLOWED_EXTENSIONS.join(",");

// Value stored in a submission's answers for a 'file' field.
export type UploadedFile = { path: string; name: string };

// Keeps a storage object key readable but safe. The unique prefix is added by
// the route, so collisions across suppliers are impossible even with identical
// original names.
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
  return cleaned.replace(/^[._-]+/, "") || "arquivo";
}

export function extensionAllowed(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

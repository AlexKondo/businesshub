-- Two new onboarding field types:
--   'file'     — the supplier uploads a file (stored per submission).
--   'download' — the admin attaches a file in the form editor; the supplier
--                can only download it (read-only from their side).
alter table public.onboarding_form_fields
    drop constraint onboarding_form_fields_field_type_check;
alter table public.onboarding_form_fields
    add constraint onboarding_form_fields_field_type_check
    check (
        field_type in (
            'text', 'textarea', 'number', 'boolean', 'date',
            'select', 'multiselect', 'file', 'download'
        )
    );

-- For a 'download' field: the admin-attached object's path in the private
-- form-attachments bucket + its original filename (for display).
alter table public.onboarding_form_fields
    add column download_path text,
    add column download_filename text;

-- Private buckets. There are NO storage RLS policies and public = false on
-- purpose: every read/write is brokered by the app's service-role client inside
-- API routes that enforce tenant authorization, handing back only short-lived
-- signed URLs. 10 MB cap + a common document/image/archive allowlist, enforced
-- by storage itself in addition to the route-level checks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'supplier-files', 'supplier-files', false, 10485760,
    ARRAY[
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv', 'text/plain',
      'application/zip', 'application/x-zip-compressed'
    ]
  ),
  (
    'form-attachments', 'form-attachments', false, 10485760,
    ARRAY[
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv', 'text/plain',
      'application/zip', 'application/x-zip-compressed'
    ]
  )
on conflict (id) do nothing;

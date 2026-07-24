-- Optional free-text header and footer for an onboarding form, editable by
-- the tenant admin. Rendered above the first field / below the submit button
-- on the supplier-facing form when present; hidden entirely when blank.
alter table public.onboarding_forms
    add column header_text text,
    add column footer_text text;

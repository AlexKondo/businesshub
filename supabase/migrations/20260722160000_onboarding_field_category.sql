-- Category the whole field (list) belongs to -- e.g. "Materiais Eletricos"
-- for a multiselect field, not per-option. Primarily meaningful for
-- select/multiselect fields, but left generic (no type constraint) since
-- an admin may still want to tag other field types later.
alter table public.onboarding_form_fields add column category text;

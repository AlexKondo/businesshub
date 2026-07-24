-- Optional custom label for the "Other" (free-text) choice on select/boolean
-- fields. When null, the form falls back to the generic "Outro"/"Other" i18n
-- string; when set (e.g. "Quando?"), that text labels the free-text option.
alter table public.onboarding_form_fields
    add column other_label text;

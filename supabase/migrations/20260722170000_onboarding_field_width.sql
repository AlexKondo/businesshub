-- Layout width of the field in the rendered form, expressed as a 1-12 grid
-- span (matches a 12-column CSS grid). Default 12 = full row, preserving
-- today's one-field-per-row layout for every existing field. Narrower
-- fields let the next field flow up onto the same row automatically —
-- that's native CSS Grid auto-placement behavior, not something the app
-- has to compute.
alter table public.onboarding_form_fields
    add column width integer not null default 12 check (width between 1 and 12);

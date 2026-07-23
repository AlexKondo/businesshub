-- Configurable height (in textarea rows) for long-text onboarding fields,
-- adjustable via drag in the admin's layout preview
-- (OnboardingFormLayoutEditor) and respected by the real supplier-facing
-- form. Meaningless for non-textarea field types; left at the default there.
alter table public.onboarding_form_fields
    add column rows integer not null default 3;

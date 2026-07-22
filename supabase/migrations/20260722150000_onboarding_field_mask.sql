-- Optional admin-configured input mask for text-type onboarding fields.
-- Notation: "9" = digit-only position, "Z" = alphanumeric (letter or
-- digit) position, any other character is a literal inserted automatically
-- (e.g. "ZZ.ZZZ.ZZZ/ZZZZ-99" for a CNPJ that accepts both the legacy
-- all-numeric format and the alphanumeric format Receita Federal is
-- introducing in 2026 — the last 2 check digits stay numeric either way).
alter table public.onboarding_form_fields add column mask text;

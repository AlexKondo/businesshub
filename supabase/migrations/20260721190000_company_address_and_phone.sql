-- Full company registration fields + personal phone.
-- `name` stays as the trade name (Nome Fantasia, already used everywhere in
-- the UI); `legal_name` (Razão Social) is new and required for a real CNPJ
-- registration.

alter table public.companies
    add column legal_name text,
    add column address_street text,
    add column address_number text,
    add column address_complement text,
    add column address_city text,
    add column address_state text,
    add column address_country text not null default 'BR';

alter table public.profiles add column phone text;

comment on column public.companies.name is 'Nome Fantasia (trade name) — used for display everywhere in the UI.';
comment on column public.companies.legal_name is 'Razão Social (legal registered name).';

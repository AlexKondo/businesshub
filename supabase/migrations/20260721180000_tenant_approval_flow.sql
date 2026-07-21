-- Support for the "join an existing tenant, pending admin approval" flow.
-- `tax_id` is generic (not named `cnpj`) since the platform is multi-country;
-- Brazilian CNPJ format is validated in the application layer for now.

alter table public.companies add column tax_id text unique;

alter table public.memberships alter column role_id drop not null;
alter table public.memberships add constraint memberships_status_check
    check (status in ('active', 'pending', 'disabled'));

-- A pending row has no role yet (assigned by the admin at approval time),
-- so it must never satisfy any permission check — enforced structurally by
-- role_id being null (the permission join simply returns nothing), not by
-- extra logic here. Nothing else changes in the RLS helpers.

comment on column public.companies.tax_id is
    'Company tax/registration id (e.g. Brazilian CNPJ). Used to deduplicate onboarding: a user joining a tax_id that already has a tenant is added as pending, not as a new company.';

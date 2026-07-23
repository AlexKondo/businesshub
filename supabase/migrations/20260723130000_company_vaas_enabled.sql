-- Per-tenant switch, set only by a platform admin in "Todas as Empresas":
-- when on, that tenant's own admin gets an "Avaliar com VaaS" action for
-- checking a supplier's CNPJ. Independent of companies.status (active/
-- inactive/pending_approval) -- this is a feature flag, not a lifecycle
-- state.
alter table public.companies add column vaas_enabled boolean not null default false;

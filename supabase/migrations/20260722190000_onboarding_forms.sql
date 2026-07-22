-- Multiple named onboarding forms per tenant (e.g. "Fornecedores de
-- Material" vs "Fornecedores de Servico") instead of one implicit form per
-- tenant. Existing fields/submissions are grouped under one auto-created
-- default form per tenant so nothing already live breaks.

create table public.onboarding_forms (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.companies (id) on delete cascade,
    name text not null,
    position integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index onboarding_forms_tenant_position_idx on public.onboarding_forms (tenant_id, position);

create trigger onboarding_forms_set_updated_at
    before update on public.onboarding_forms
    for each row execute function public.set_updated_at();

alter table public.onboarding_forms enable row level security;

create policy onboarding_forms_select on public.onboarding_forms
    for select using (public.user_has_tenant_access(tenant_id));

create policy onboarding_forms_write on public.onboarding_forms
    for all
    using (public.user_has_permission(tenant_id, 'suppliers.write'))
    with check (public.user_has_permission(tenant_id, 'suppliers.write'));

create policy onboarding_forms_select_platform_admin on public.onboarding_forms
    for select using (public.is_platform_admin());

grant select, insert, update, delete on public.onboarding_forms to authenticated;

-- Backfill: one default form per tenant that already has fields and/or
-- submissions (covers both independently in case a submission ever
-- outlives its fields being deleted).
insert into public.onboarding_forms (tenant_id, name, position)
select distinct tenant_id, 'Formulario de Onboarding', 0
from (
    select tenant_id from public.onboarding_form_fields
    union
    select tenant_id from public.supplier_onboarding_submissions
) t;

-- ===================================================================
-- onboarding_form_fields: scope by form_id instead of tenant_id alone.
-- tenant_id stays (denormalized, set consistently by the app) so the
-- existing RLS policies keep working unchanged.
-- ===================================================================
alter table public.onboarding_form_fields
    add column form_id uuid references public.onboarding_forms (id) on delete cascade;

update public.onboarding_form_fields f
set form_id = of.id
from public.onboarding_forms of
where of.tenant_id = f.tenant_id;

alter table public.onboarding_form_fields alter column form_id set not null;

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.onboarding_form_fields'::regclass
    and contype = 'u';
  execute format('alter table public.onboarding_form_fields drop constraint %I', constraint_name);
end $$;

alter table public.onboarding_form_fields
    add constraint onboarding_form_fields_form_id_key_key unique (form_id, key);

create index onboarding_form_fields_form_position_idx on public.onboarding_form_fields (form_id, position);

-- ===================================================================
-- supplier_onboarding_submissions: one submission per (membership, form)
-- instead of one per membership across the whole tenant.
-- ===================================================================
alter table public.supplier_onboarding_submissions
    add column form_id uuid references public.onboarding_forms (id) on delete cascade;

update public.supplier_onboarding_submissions s
set form_id = of.id
from public.onboarding_forms of
where of.tenant_id = s.tenant_id;

alter table public.supplier_onboarding_submissions alter column form_id set not null;

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.supplier_onboarding_submissions'::regclass
    and contype = 'u';
  execute format('alter table public.supplier_onboarding_submissions drop constraint %I', constraint_name);
end $$;

alter table public.supplier_onboarding_submissions
    add constraint onboarding_submissions_membership_form_key unique (membership_id, form_id);

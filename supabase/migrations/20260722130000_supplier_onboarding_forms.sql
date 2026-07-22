-- Generic, admin-configurable supplier onboarding form. Every tenant starts
-- with zero fields; only GWM gets a one-off seed (scripts/, not a migration).
--
-- The "Fornecedor" system role (supabase/seed.sql) is deliberately left with
-- zero role_permissions rows: every RLS path a Fornecedor needs below is
-- gated by user_has_tenant_access (mere active membership) or row ownership,
-- never user_has_permission — the one policy that does check a permission
-- (suppliers.write, the field builder) is exactly what a Fornecedor must be
-- blocked from.

create table public.onboarding_form_fields (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.companies (id) on delete cascade,
    key text not null, -- slug, immutable after creation (answers.jsonb references it)
    label text not null,
    field_type text not null check (field_type in ('text', 'textarea', 'number', 'boolean', 'select', 'multiselect')),
    options jsonb not null default '[]'::jsonb, -- [{ "value": "...", "label": "..." }]
    allow_other boolean not null default false,
    required boolean not null default false,
    position integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (tenant_id, key),
    constraint onboarding_form_fields_allow_other_scope check (
        not allow_other or field_type in ('select', 'multiselect')
    )
);

create index onboarding_form_fields_tenant_position_idx on public.onboarding_form_fields (tenant_id, position);

create trigger onboarding_form_fields_set_updated_at
    before update on public.onboarding_form_fields
    for each row execute function public.set_updated_at();

alter table public.onboarding_form_fields enable row level security;

create policy onboarding_form_fields_select on public.onboarding_form_fields
    for select using (public.user_has_tenant_access(tenant_id));

create policy onboarding_form_fields_write on public.onboarding_form_fields
    for all
    using (public.user_has_permission(tenant_id, 'suppliers.write'))
    with check (public.user_has_permission(tenant_id, 'suppliers.write'));

create policy onboarding_form_fields_select_platform_admin on public.onboarding_form_fields
    for select using (public.is_platform_admin());

grant select, insert, update, delete on public.onboarding_form_fields to authenticated;

-- ===================================================================
-- supplier_onboarding_submissions — one upserted row per (tenant, membership)
-- ===================================================================
create table public.supplier_onboarding_submissions (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.companies (id) on delete cascade,
    membership_id uuid not null references public.memberships (id) on delete cascade,
    answers jsonb not null default '{}'::jsonb, -- { [field_key]: string | string[] | number | boolean }
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (membership_id)
);

create index supplier_onboarding_submissions_tenant_id_idx on public.supplier_onboarding_submissions (tenant_id);

create trigger supplier_onboarding_submissions_set_updated_at
    before update on public.supplier_onboarding_submissions
    for each row execute function public.set_updated_at();

alter table public.supplier_onboarding_submissions enable row level security;

create policy supplier_onboarding_submissions_select on public.supplier_onboarding_submissions
    for select using (
        public.user_has_permission(tenant_id, 'suppliers.read')
        or exists (
            select 1 from public.memberships m
            where m.id = membership_id and m.user_id = auth.uid()
              and m.tenant_id = supplier_onboarding_submissions.tenant_id and m.status = 'active'
        )
    );

create policy supplier_onboarding_submissions_insert on public.supplier_onboarding_submissions
    for insert with check (
        exists (
            select 1 from public.memberships m
            where m.id = membership_id and m.user_id = auth.uid()
              and m.tenant_id = supplier_onboarding_submissions.tenant_id and m.status = 'active'
        )
    );

create policy supplier_onboarding_submissions_update on public.supplier_onboarding_submissions
    for update
    using (
        exists (
            select 1 from public.memberships m
            where m.id = membership_id and m.user_id = auth.uid()
              and m.tenant_id = supplier_onboarding_submissions.tenant_id and m.status = 'active'
        )
    )
    with check (
        exists (
            select 1 from public.memberships m
            where m.id = membership_id and m.user_id = auth.uid()
              and m.tenant_id = supplier_onboarding_submissions.tenant_id and m.status = 'active'
        )
    );

create policy supplier_onboarding_submissions_select_platform_admin on public.supplier_onboarding_submissions
    for select using (public.is_platform_admin());

grant select, insert, update on public.supplier_onboarding_submissions to authenticated;

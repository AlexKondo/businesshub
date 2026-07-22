-- Public lead-capture step of supplier onboarding: an anonymous visitor on a
-- tenant's public landing page ("Seja um fornecedor") submits basic contact
-- info here. A tenant admin later reviews/approves it — full account
-- creation + access to a quotes panel etc. is a future module, tracked
-- separately; this table only covers the initial capture + review status.
create table public.supplier_leads (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.companies (id) on delete cascade,
    contact_name text not null,
    company_name text not null,
    email text not null,
    phone text not null,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index supplier_leads_tenant_id_idx on public.supplier_leads (tenant_id);

create trigger supplier_leads_set_updated_at
    before update on public.supplier_leads
    for each row execute function public.set_updated_at();

alter table public.supplier_leads enable row level security;

-- reuses the existing suppliers.read / suppliers.write permissions, already
-- granted to "Administrador da Empresa" — no new permission needed.
create policy supplier_leads_select on public.supplier_leads
    for select
    using (public.user_has_permission(tenant_id, 'suppliers.read'));

create policy supplier_leads_update on public.supplier_leads
    for update
    using (public.user_has_permission(tenant_id, 'suppliers.write'))
    with check (public.user_has_permission(tenant_id, 'suppliers.write'));

create policy supplier_leads_select_platform_admin on public.supplier_leads
    for select
    using (public.is_platform_admin());

-- anyone (anonymous or logged into a different tenant) can submit a lead —
-- this is a public marketing form, not an app action.
create policy supplier_leads_insert_public on public.supplier_leads
    for insert
    with check (true);

grant select, update on public.supplier_leads to authenticated;
grant insert on public.supplier_leads to anon, authenticated;

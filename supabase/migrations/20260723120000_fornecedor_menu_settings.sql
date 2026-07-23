-- Per-tenant control over which sidebar items a Fornecedor (supplier) sees.
-- One row per tenant (Fornecedor is a single global system role, but each
-- tenant's admin decides independently what their own suppliers can see).
-- Missing row = defaults below apply (every reader treats a missing row the
-- same as one with these values).
create table public.fornecedor_menu_settings (
    tenant_id uuid primary key references public.companies (id) on delete cascade,
    show_dashboard boolean not null default true,
    show_onboarding_form boolean not null default true,
    show_users boolean not null default false,
    updated_at timestamptz not null default now()
);

create trigger fornecedor_menu_settings_set_updated_at
    before update on public.fornecedor_menu_settings
    for each row execute function public.set_updated_at();

alter table public.fornecedor_menu_settings enable row level security;

-- Any active tenant member can read this (including the Fornecedor
-- themselves — the sidebar needs it to know what to render).
create policy fornecedor_menu_settings_select on public.fornecedor_menu_settings
    for select using (public.user_has_tenant_access(tenant_id));

create policy fornecedor_menu_settings_write on public.fornecedor_menu_settings
    for all
    using (public.user_has_permission(tenant_id, 'suppliers.write'))
    with check (public.user_has_permission(tenant_id, 'suppliers.write'));

create policy fornecedor_menu_settings_select_platform_admin on public.fornecedor_menu_settings
    for select using (public.is_platform_admin());

grant select, insert, update, delete on public.fornecedor_menu_settings to authenticated;

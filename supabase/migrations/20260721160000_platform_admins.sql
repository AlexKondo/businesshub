-- Platform-level super users — structurally separate from tenant RBAC.
-- Deliberately its own table + helper function rather than a role/permission
-- inside `memberships`, so a bug in per-tenant authorization can never leak
-- platform-wide power.

create table public.platform_admins (
    user_id uuid primary key references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    created_by uuid references public.profiles (id)
);

alter table public.platform_admins enable row level security;

grant select, insert, update, delete on public.platform_admins to authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1 from public.platform_admins where user_id = auth.uid()
    );
$$;

-- Only an existing platform admin can see who else is one; no self-service.
create policy platform_admins_select on public.platform_admins
    for select
    using (public.is_platform_admin());

-- Platform admins bypass tenant scoping for read access across every tenant
-- (support, auditing, reassigning a tenant's own admin). They still go
-- through these policies — never through service_role from the client.
create policy companies_select_platform_admin on public.companies
    for select
    using (public.is_platform_admin());

create policy companies_write_platform_admin on public.companies
    for all
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

create policy memberships_select_platform_admin on public.memberships
    for select
    using (public.is_platform_admin());

create policy memberships_write_platform_admin on public.memberships
    for all
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

create policy roles_select_platform_admin on public.roles
    for select
    using (public.is_platform_admin());

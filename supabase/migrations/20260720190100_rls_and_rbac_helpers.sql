-- RLS: fail-closed on every table. No policy = no access.
-- Authorization is resolved server-side from auth.uid() via memberships — never from
-- a tenant_id/role value supplied by the client.

-- ===================================================================
-- Helper functions (security definer: read membership/permission graph
-- without depending on RLS visibility of those tables to the caller)
-- ===================================================================
create or replace function public.user_has_tenant_access(target_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.memberships m
        where m.tenant_id = target_tenant_id
          and m.user_id = auth.uid()
          and m.status = 'active'
    );
$$;

create or replace function public.user_has_permission(target_tenant_id uuid, permission_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.memberships m
        join public.role_permissions rp on rp.role_id = m.role_id
        join public.permissions p on p.id = rp.permission_id
        where m.tenant_id = target_tenant_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and p.key = permission_key
    );
$$;

-- ===================================================================
-- companies
-- ===================================================================
alter table public.companies enable row level security;

create policy companies_select on public.companies
    for select
    using (public.user_has_tenant_access(id));

create policy companies_update on public.companies
    for update
    using (public.user_has_permission(id, 'companies.write'))
    with check (public.user_has_permission(id, 'companies.write'));

-- ===================================================================
-- profiles — a user always sees their own profile; tenant peers are
-- visible only through the memberships join (handled at the app layer),
-- never by scanning all profiles.
-- ===================================================================
alter table public.profiles enable row level security;

create policy profiles_select_self on public.profiles
    for select
    using (id = auth.uid());

create policy profiles_update_self on public.profiles
    for update
    using (id = auth.uid())
    with check (id = auth.uid());

-- ===================================================================
-- identities — owner only
-- ===================================================================
alter table public.identities enable row level security;

create policy identities_select_self on public.identities
    for select
    using (user_id = auth.uid());

-- ===================================================================
-- roles
-- ===================================================================
alter table public.roles enable row level security;

create policy roles_select on public.roles
    for select
    using (tenant_id is null or public.user_has_tenant_access(tenant_id));

create policy roles_write on public.roles
    for all
    using (tenant_id is not null and public.user_has_permission(tenant_id, 'roles.write'))
    with check (tenant_id is not null and public.user_has_permission(tenant_id, 'roles.write'));

-- ===================================================================
-- permissions — global catalog, readable by any authenticated user,
-- never writable through the API (managed via migration only).
-- ===================================================================
alter table public.permissions enable row level security;

create policy permissions_select on public.permissions
    for select
    using (auth.role() = 'authenticated');

-- ===================================================================
-- role_permissions
-- ===================================================================
alter table public.role_permissions enable row level security;

create policy role_permissions_select on public.role_permissions
    for select
    using (
        exists (
            select 1 from public.roles r
            where r.id = role_id
              and (r.tenant_id is null or public.user_has_tenant_access(r.tenant_id))
        )
    );

create policy role_permissions_write on public.role_permissions
    for all
    using (
        exists (
            select 1 from public.roles r
            where r.id = role_id
              and r.tenant_id is not null
              and public.user_has_permission(r.tenant_id, 'roles.write')
        )
    )
    with check (
        exists (
            select 1 from public.roles r
            where r.id = role_id
              and r.tenant_id is not null
              and public.user_has_permission(r.tenant_id, 'roles.write')
        )
    );

-- ===================================================================
-- memberships
-- ===================================================================
alter table public.memberships enable row level security;

create policy memberships_select on public.memberships
    for select
    using (user_id = auth.uid() or public.user_has_tenant_access(tenant_id));

create policy memberships_write on public.memberships
    for all
    using (public.user_has_permission(tenant_id, 'members.write'))
    with check (public.user_has_permission(tenant_id, 'members.write'));

-- ===================================================================
-- audit_logs — readable by whoever can audit the tenant; writes happen
-- only through backend service role (no direct client insert policy).
-- ===================================================================
alter table public.audit_logs enable row level security;

create policy audit_logs_select on public.audit_logs
    for select
    using (tenant_id is not null and public.user_has_permission(tenant_id, 'audit_logs.read'));

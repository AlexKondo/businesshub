-- Core schema: tenants (companies), identity, RBAC, audit.
-- Multi-tenant model: every business table carries tenant_id -> companies(id).
-- Auth model: profiles (1:1 with auth.users) separated from identities (N federated logins per user).

create extension if not exists "pgcrypto";

-- ===================================================================
-- Tenants
-- ===================================================================
create table public.companies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

-- ===================================================================
-- Users / identities (federation-ready: one profile, many login identities)
-- ===================================================================
create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text,
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.identities (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    provider text not null, -- 'password' | 'azure_ad' | 'google' | 'okta' | 'saml' | ...
    provider_user_id text not null,
    created_at timestamptz not null default now(),
    unique (provider, provider_user_id)
);

create index identities_user_id_idx on public.identities (user_id);

-- ===================================================================
-- RBAC — roles, permissions and the mapping between them kept separate
-- ===================================================================
create table public.roles (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies (id) on delete cascade, -- null = system role, available to every tenant
    name text not null,
    is_system_role boolean not null default false,
    created_at timestamptz not null default now(),
    unique (tenant_id, name)
);

create table public.permissions (
    id uuid primary key default gen_random_uuid(),
    key text not null unique, -- e.g. 'suppliers.read', 'contracts.write'
    description text
);

create table public.role_permissions (
    role_id uuid not null references public.roles (id) on delete cascade,
    permission_id uuid not null references public.permissions (id) on delete cascade,
    primary key (role_id, permission_id)
);

create table public.memberships (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    tenant_id uuid not null references public.companies (id) on delete cascade,
    role_id uuid not null references public.roles (id),
    status text not null default 'active', -- 'active' | 'disabled'
    created_at timestamptz not null default now(),
    unique (user_id, tenant_id)
);

create index memberships_tenant_id_idx on public.memberships (tenant_id, id);
create index memberships_user_id_idx on public.memberships (user_id);

-- ===================================================================
-- Audit log — every write to a sensitive entity
-- ===================================================================
create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies (id) on delete cascade,
    actor_id uuid references public.profiles (id),
    action text not null, -- 'create' | 'update' | 'delete' | ...
    entity_type text not null,
    entity_id uuid,
    ip inet,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index audit_logs_tenant_id_idx on public.audit_logs (tenant_id, id);

-- ===================================================================
-- updated_at trigger helper
-- ===================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger companies_set_updated_at
    before update on public.companies
    for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

-- Table-level privileges for the API roles. RLS still governs which ROWS are
-- visible/writable; without these GRANTs the roles can't touch the table at all.
-- `auto_expose_new_tables` defaults to off in current Supabase projects, so this
-- must be explicit per table.

grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on
    public.companies,
    public.profiles,
    public.identities,
    public.roles,
    public.permissions,
    public.role_permissions,
    public.memberships,
    public.audit_logs
to authenticated;

-- Sequences/defaults rely on gen_random_uuid(), no serial sequences to grant.

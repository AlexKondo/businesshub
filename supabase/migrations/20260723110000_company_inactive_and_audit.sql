-- Lets a platform admin pause a company (deregisters its Coolify subdomain,
-- blocking all access) without deleting it, alongside the existing
-- pending_approval/active states.
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.companies'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';
  execute format('alter table public.companies drop constraint %I', constraint_name);
end $$;

alter table public.companies add constraint companies_status_check
    check (status in ('pending_approval', 'active', 'inactive'));

-- Platform admins can read any tenant's audit log from the "Todas as
-- Empresas" panel, same bypass pattern already used for companies/
-- memberships/roles.
create policy audit_logs_select_platform_admin on public.audit_logs
    for select using (public.is_platform_admin());

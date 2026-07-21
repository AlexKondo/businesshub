-- Administrador Global had no permissions seeded — grant it everything, same
-- as Administrador da Empresa. (Note: this is still tenant-scoped in the
-- current model — a real cross-tenant "platform owner" concept is a future
-- architectural decision, tracked in CLAUDE.md.)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Administrador Global' and r.tenant_id is null
on conflict do nothing;

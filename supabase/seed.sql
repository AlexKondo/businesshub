-- Base permission catalog and system roles.
-- Roles are just named bundles of permissions; every backend authorization
-- check must go through a permission key here, never a hardcoded role name.

insert into public.permissions (key, description) values
    ('companies.write', 'Editar dados da empresa/tenant'),
    ('members.write', 'Gerenciar membros e papéis do tenant'),
    ('roles.write', 'Gerenciar roles e suas permissions'),
    ('suppliers.read', 'Visualizar fornecedores do tenant'),
    ('suppliers.write', 'Criar/editar fornecedores do tenant'),
    ('contracts.read', 'Visualizar contratos do tenant'),
    ('contracts.write', 'Criar/editar contratos do tenant'),
    ('documents.read', 'Visualizar documentos do tenant'),
    ('documents.write', 'Enviar/editar documentos do tenant'),
    ('purchase_orders.read', 'Visualizar pedidos do tenant'),
    ('purchase_orders.write', 'Criar/editar pedidos do tenant'),
    ('audit_logs.read', 'Visualizar logs de auditoria do tenant')
on conflict (key) do nothing;

-- System roles (tenant_id null = available as a template to every tenant).
insert into public.roles (tenant_id, name, is_system_role) values
    (null, 'Administrador Global', true),
    (null, 'Administrador da Empresa', true),
    (null, 'Comprador', true),
    (null, 'Gestor', true),
    (null, 'Fornecedor', true),
    (null, 'Auditor', true),
    (null, 'Leitor', true)
on conflict (tenant_id, name) do nothing;

-- Administrador da Empresa: tudo dentro do próprio tenant.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Administrador da Empresa' and r.tenant_id is null
on conflict do nothing;

-- Auditor: somente leitura + audit logs.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
    'suppliers.read', 'contracts.read', 'documents.read', 'purchase_orders.read', 'audit_logs.read'
)
where r.name = 'Auditor' and r.tenant_id is null
on conflict do nothing;

-- Leitor: somente leitura dos módulos de negócio.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
    'suppliers.read', 'contracts.read', 'documents.read', 'purchase_orders.read'
)
where r.name = 'Leitor' and r.tenant_id is null
on conflict do nothing;

-- Fix: `role_id not in (subquery)` evaluates to NULL (not TRUE) when
-- role_id IS NULL — which is exactly the case for pending memberships,
-- and NULL fails RLS USING like `false`. That would have silently blocked
-- admins from ever approving a pending request. Explicit null-check added.

drop policy if exists memberships_write on public.memberships;

create policy memberships_write on public.memberships
    for all
    using (
        public.user_has_permission(tenant_id, 'members.write')
        and (
            public.is_platform_admin()
            or role_id is null
            or role_id not in (
                select id from public.roles
                where name = 'Administrador da Empresa' and tenant_id is null
            )
        )
    )
    with check (public.user_has_permission(tenant_id, 'members.write'));

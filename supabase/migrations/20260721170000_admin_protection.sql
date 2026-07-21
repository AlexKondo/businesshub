-- Once a membership holds the "Administrador da Empresa" role, no other
-- tenant admin can alter or revoke it — not even the admin who granted it.
-- Only a platform admin can. Promoting someone TO admin is still allowed
-- (the row isn't admin yet at that point); it's touching an EXISTING admin
-- row that's blocked.

drop policy if exists memberships_write on public.memberships;

create policy memberships_write on public.memberships
    for all
    using (
        public.user_has_permission(tenant_id, 'members.write')
        and (
            public.is_platform_admin()
            or role_id not in (
                select id from public.roles
                where name = 'Administrador da Empresa' and tenant_id is null
            )
        )
    )
    with check (public.user_has_permission(tenant_id, 'members.write'));

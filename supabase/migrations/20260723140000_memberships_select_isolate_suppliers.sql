-- memberships_select previously used user_has_tenant_access(tenant_id),
-- meaning "does this user have ANY active membership at this tenant" — that
-- let a Fornecedor (a supplier account) read every other membership row of
-- the same tenant via a direct client-side query, exposing peer suppliers'
-- identity and staff members. Each supplier who signs up must only ever see
-- their own membership row; only staff with suppliers.read or members.write
-- should see the full roster.
drop policy if exists memberships_select on memberships;

create policy memberships_select on memberships
    for select using (
        (user_id = auth.uid())
        or user_has_permission(tenant_id, 'suppliers.read')
        or user_has_permission(tenant_id, 'members.write')
    );

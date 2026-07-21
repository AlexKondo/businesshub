-- pgTAP test: tenant A must never read/write tenant B's data, and a user
-- without the required permission must be denied even within their own tenant.
-- Run with the Supabase CLI: `supabase test db`

begin;
select plan(6);

-- --- fixtures -------------------------------------------------------
-- uuid v4 literals below are hex-only placeholders, easy to eyeball as
-- "user a / user b / tenant a / tenant b / role a".
insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-0000000000a1', 'user-a@test.local'),
    ('00000000-0000-0000-0000-0000000000b1', 'user-b@test.local');

insert into public.profiles (id) values
    ('00000000-0000-0000-0000-0000000000a1'),
    ('00000000-0000-0000-0000-0000000000b1');

insert into public.companies (id, name, slug) values
    ('00000000-0000-0000-0000-00000000aaaa', 'Tenant A', 'tenant-a'),
    ('00000000-0000-0000-0000-00000000bbbb', 'Tenant B', 'tenant-b');

insert into public.roles (id, tenant_id, name) values
    ('00000000-0000-0000-0000-0000000000ba', '00000000-0000-0000-0000-00000000aaaa', 'Leitor Tenant A');

insert into public.memberships (user_id, tenant_id, role_id) values
    ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000ba');
-- user B intentionally has NO membership anywhere.

-- --- (a) tenant A user cannot see tenant B's company row -------------
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';

select is(
    (select count(*) from public.companies where id = '00000000-0000-0000-0000-00000000bbbb'),
    0::bigint,
    'user A cannot SELECT tenant B company row'
);

select is(
    (select count(*) from public.companies where id = '00000000-0000-0000-0000-00000000aaaa'),
    1::bigint,
    'user A can SELECT their own tenant company row'
);

-- (a2) direct write attempt against tenant B affects zero rows (RLS filters
-- it out of scope before UPDATE ever matches it — Postgres does not raise,
-- it just leaves the row untouched). Verify as superuser since user A can't
-- even SELECT tenant B's row to check it.
update public.companies set name = 'hacked' where id = '00000000-0000-0000-0000-00000000bbbb';
reset role;
select is(
    (select name from public.companies where id = '00000000-0000-0000-0000-00000000bbbb'),
    'Tenant B',
    'user A UPDATE on tenant B company row affects zero rows'
);

-- --- (b) user without membership sees nothing --------------------------
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';

select is(
    (select count(*) from public.companies),
    0::bigint,
    'user without any membership sees zero companies'
);

select is(
    (select count(*) from public.memberships),
    0::bigint,
    'user without any membership sees zero membership rows'
);

-- --- (c) permission-gated write: user A has no roles.write, must be denied --
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';

select is(
    public.user_has_permission('00000000-0000-0000-0000-00000000aaaa', 'roles.write'),
    false,
    'user A lacks roles.write permission on their own tenant'
);

select * from finish();
rollback;

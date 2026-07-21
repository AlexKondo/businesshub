-- Self-service onboarding: a user with zero memberships may create exactly
-- one company and become its own first member. Once they have a membership,
-- these policies stop applying — they can no longer self-assign another
-- tenant (that requires an existing tenant admin or a platform admin).

create policy companies_insert_onboarding on public.companies
    for insert
    with check (
        public.is_platform_admin()
        or not exists (select 1 from public.memberships where user_id = auth.uid())
    );

create policy memberships_insert_onboarding on public.memberships
    for insert
    with check (
        user_id = auth.uid()
        and not exists (
            select 1 from public.memberships existing where existing.user_id = auth.uid()
        )
    );

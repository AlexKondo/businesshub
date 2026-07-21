-- Auto-create a public.profiles row whenever a new auth.users row appears
-- (email signup, invite, or future OAuth/SAML federation) — memberships,
-- audit_logs etc. all reference profiles(id), not auth.users(id) directly.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name)
    values (new.id, new.raw_user_meta_data ->> 'full_name')
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_auth_user();

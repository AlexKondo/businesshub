-- Storage bucket for user profile photos. Public read (avatars are shown in
-- headers/menus across tenants), write restricted to the owning user, path
-- convention: {user_id}/{filename}.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_read
    on storage.objects for select
    using (bucket_id = 'avatars');

create policy avatars_owner_insert
    on storage.objects for insert
    with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy avatars_owner_update
    on storage.objects for update
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy avatars_owner_delete
    on storage.objects for delete
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

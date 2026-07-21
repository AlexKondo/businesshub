-- Company (tenant) logo: separate bucket from user avatars because access
-- control is per-tenant (any admin of the company can manage it), not
-- per-user. Path convention: {tenant_id}/logo.{ext}.
alter table public.companies add column logo_url text;

insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

create policy company_logos_public_read
    on storage.objects for select
    using (bucket_id = 'company-logos');

create policy company_logos_admin_insert
    on storage.objects for insert
    with check (
        bucket_id = 'company-logos'
        and public.user_has_permission((storage.foldername(name))[1]::uuid, 'companies.write')
    );

create policy company_logos_admin_update
    on storage.objects for update
    using (
        bucket_id = 'company-logos'
        and public.user_has_permission((storage.foldername(name))[1]::uuid, 'companies.write')
    );

create policy company_logos_admin_delete
    on storage.objects for delete
    using (
        bucket_id = 'company-logos'
        and public.user_has_permission((storage.foldername(name))[1]::uuid, 'companies.write')
    );

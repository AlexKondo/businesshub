-- Platform admins (super admins) can already SELECT every tenant's supplier
-- config (policies added earlier), but had no WRITE bypass — so while
-- browsing a tenant subdomain they could see the onboarding form builder,
-- Usuários and Cadastros, yet any edit silently failed the tenant-scoped
-- suppliers.write check. Add platform-admin write bypasses so a super admin
-- can genuinely manage a tenant's supplier configuration end to end.
create policy onboarding_forms_write_platform_admin on public.onboarding_forms
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy onboarding_form_fields_write_platform_admin on public.onboarding_form_fields
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy fornecedor_menu_settings_write_platform_admin on public.fornecedor_menu_settings
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());

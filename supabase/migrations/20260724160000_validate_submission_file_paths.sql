-- Defense-in-depth for supplier-uploaded file answers. A submission is written
-- by the supplier's own client (a direct upsert), so a tampered client could
-- store a { path, name } file answer whose object path points outside their own
-- upload scope — misleading staff who later download it. RLS already binds the
-- row's tenant_id/membership_id to the caller, so we enforce here that EVERY
-- file-answer path sits under "{tenant_id}/{form_id}/{membership_id}/", which is
-- exactly the prefix the upload-url route mints. Non-object answers are ignored.
create or replace function public.validate_submission_file_paths()
returns trigger
language plpgsql
as $$
declare
    entry record;
    prefix text := new.tenant_id::text || '/' || new.form_id::text || '/' || new.membership_id::text || '/';
    p text;
begin
    for entry in select value from jsonb_each(new.answers) loop
        if jsonb_typeof(entry.value) = 'object' and (entry.value ? 'path') then
            p := entry.value ->> 'path';
            if p is null or left(p, length(prefix)) <> prefix then
                raise exception 'file answer path % is outside the submission scope', p
                    using errcode = 'check_violation';
            end if;
        end if;
    end loop;
    return new;
end;
$$;

drop trigger if exists supplier_onboarding_submissions_validate_paths
    on public.supplier_onboarding_submissions;
create trigger supplier_onboarding_submissions_validate_paths
    before insert or update on public.supplier_onboarding_submissions
    for each row execute function public.validate_submission_file_paths();

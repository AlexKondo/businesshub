-- Adds "date" as a valid onboarding_form_fields.field_type. The original
-- check constraint had no explicit name, so its auto-generated name is
-- looked up dynamically rather than assumed.
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.onboarding_form_fields'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%field_type%'
    and pg_get_constraintdef(oid) not like '%allow_other%';
  execute format('alter table public.onboarding_form_fields drop constraint %I', constraint_name);
end $$;

alter table public.onboarding_form_fields add constraint onboarding_form_fields_field_type_check
    check (field_type in ('text', 'textarea', 'number', 'boolean', 'select', 'multiselect', 'date'));

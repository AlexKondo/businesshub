-- Widens the field-width grid from 12 to 50 units for finer-grained
-- control. Rescales existing values proportionally first (a field at
-- 6/12 = 50% stays 50%, now expressed as 25/50) so anything already
-- resized keeps its visual proportion instead of suddenly becoming a
-- sliver of the new, finer scale.
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.onboarding_form_fields'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%width%';
  execute format('alter table public.onboarding_form_fields drop constraint %I', constraint_name);
end $$;

update public.onboarding_form_fields set width = greatest(1, round(width * 50.0 / 12)::int);

alter table public.onboarding_form_fields alter column width set default 50;

alter table public.onboarding_form_fields add constraint onboarding_form_fields_width_check
    check (width between 1 and 50);

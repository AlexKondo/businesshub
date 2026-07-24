-- Widen allow_other's scope to boolean (Sim/Não) fields, so a yes/no
-- question can also offer an "Outro" (Other) choice that reveals a
-- free-text input — same escape hatch already available on select/
-- multiselect. A boolean field's answer is normally true/false; with
-- allow_other on and "Outro" chosen, it stores the typed string instead.
alter table public.onboarding_form_fields
    drop constraint if exists onboarding_form_fields_allow_other_scope;

alter table public.onboarding_form_fields
    add constraint onboarding_form_fields_allow_other_scope check (
        not allow_other or field_type in ('select', 'multiselect', 'boolean')
    );

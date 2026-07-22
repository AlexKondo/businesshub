-- Lets an admin pause intake on a form (e.g. while still drafting it, or
-- once a supplier category is no longer being onboarded) without deleting
-- it and losing its fields/submissions. Inactive forms are filtered out of
-- the supplier-facing picker and direct-link access.
alter table public.onboarding_forms add column active boolean not null default true;

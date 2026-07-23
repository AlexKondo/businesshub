-- Self-service creation of a BRAND NEW company (new tax_id) used to
-- activate the requester as admin immediately. Now it only reserves the
-- name/slug/tax_id and waits for a platform admin to approve it -- the
-- requester's own membership already goes in as 'pending' (same status
-- value used by the "join an existing company" flow), so no RLS/helper
-- change is needed there. This column is what's new: a company itself can
-- now also be pending, not yet a real, usable tenant.
alter table public.companies add column status text not null default 'active'
    check (status in ('pending_approval', 'active'));

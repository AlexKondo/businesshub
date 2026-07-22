-- Anonymous access logging for the marketing/root domain: one row per page
-- view, capturing the visitor's IP and Cloudflare-provided geo so we can show
-- access counts now and an access-location map later. Written exclusively by
-- the edge middleware via the service_role key (bypasses RLS) — no anon/
-- authenticated insert path, so visitors can't forge or spam entries.
--
-- LGPD note: IP is personal data. Legal basis, retention window and
-- anonymization are still to be defined (tracked in CLAUDE.md roadmap).
create table public.access_logs (
    id uuid primary key default gen_random_uuid(),
    ip text,
    country text,
    city text,
    region text,
    locale text,
    path text,
    user_agent text,
    created_at timestamptz not null default now()
);

create index access_logs_created_at_idx on public.access_logs (created_at desc);
create index access_logs_country_idx on public.access_logs (country);

alter table public.access_logs enable row level security;

-- only the platform owner can read the logs (future analytics / map)
create policy access_logs_select_platform_admin on public.access_logs
    for select
    using (public.is_platform_admin());

grant select on public.access_logs to authenticated;

-- Track "нет на спавне" / verified checks (expires to unverified after 15 minutes in app logic)

alter table public.raid_bosses
  add column if not exists checked_at timestamptz;

create index if not exists raid_bosses_checked_at_idx
  on public.raid_bosses (checked_at);

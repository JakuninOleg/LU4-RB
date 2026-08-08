-- Sighting: boss is alive on spawn (expires to unverified after 20 minutes in app logic)
alter table public.raid_bosses
  add column if not exists alive_at timestamptz;

create index if not exists raid_bosses_alive_at_idx
  on public.raid_bosses (alive_at);

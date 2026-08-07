-- Raid bosses catalog + kill timers for LU4-RB tracker

create table public.raid_bosses (
  id uuid primary key default gen_random_uuid(),
  level integer not null,
  name text not null,
  location text not null default '',
  respawn_hours numeric(6, 2) not null,
  variance_hours numeric(6, 2) not null default 0,
  has_guards boolean not null default false,
  wiki_url text,
  notes text,
  level_group text not null,
  sort_order integer not null default 0,
  killed_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint raid_bosses_name_level_group_key unique (name, level_group)
);

create index raid_bosses_level_group_sort_idx
  on public.raid_bosses (level_group, sort_order);

create index raid_bosses_killed_at_idx
  on public.raid_bosses (killed_at);

alter table public.raid_bosses enable row level security;

create policy "Authenticated users can read raid bosses"
  on public.raid_bosses
  for select
  to authenticated
  using (true);

create policy "Authenticated users can update raid bosses"
  on public.raid_bosses
  for update
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_raid_boss_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger raid_bosses_set_updated_at
  before update on public.raid_bosses
  for each row
  execute function public.set_raid_boss_updated_at();

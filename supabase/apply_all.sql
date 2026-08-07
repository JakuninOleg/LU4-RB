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


-- Seed generated from Excel CSV (credentials excluded)
truncate table public.raid_bosses restart identity cascade;

insert into public.raid_bosses (
  level, name, location, respawn_hours, variance_hours,
  has_guards, wiki_url, notes, level_group, sort_order
) values
  (20, 'Zombie Lord Ferkel', 'ТП Elven Fortressвниз по карте к дереву', 6, 2, true, null, null, '20-24', 0),
  (20, 'Madness Beast', 'ТП Spider NestНаправо по карте', 6, 2, true, null, null, '20-24', 1),
  (20, 'Discarded Guardian', 'ТП Elven RuinsВ конец данжа', 6, 2, false, null, null, '20-24', 2),
  (21, 'Serpent Demon Bifrons', 'ТП WastelandВниз к берегу', 6, 2, true, null, null, '20-24', 3),
  (21, 'Sukar Wererat Chief', 'GludioНаправо к камням', 6, 2, true, null, null, '20-24', 4),
  (21, 'Malex Herald of Dagoniel', 'ТП Elven FortressВ конец данжа', 6, 2, true, null, null, '20-24', 5),
  (21, 'Kaysha Herald of Icarus', 'ТП Bloody Swampland//Spider NestБежать в школу', 6, 2, true, null, null, '20-24', 6),
  (23, 'Greyclaw Kutus', 'ТП Abandoned CampВнутри где-то', 6, 2, true, null, null, '20-24', 7),
  (23, 'Tracker Leader Sharuk', 'ТП Fogotten TempleНа гору налево', 6, 2, true, null, null, '20-24', 8),
  (23, 'Kuroboros'' Priest', 'ТП Fogotten TempleНа гору налево', 6, 2, true, null, null, '20-24', 9),
  (24, 'Unrequited Kael', 'ТП Forgotten TempleВнутри - вода', 6, 2, true, null, null, '20-24', 10),
  (25, 'Pan Dryad', 'ТП Floran VillageНалево', 6, 2, false, null, null, '25-29', 11),
  (25, 'Princess Molrang', 'Fellmere Lake?', 6, 2, true, null, null, '25-29', 12),
  (25, 'Soul Scavenger', 'ТП Ruins of AgonyВнутри', 6, 2, true, null, null, '25-29', 13),
  (25, 'Betrayer of Urutu Freki', 'ТП от Орков на SouthНа поляне', 6, 2, true, null, null, '25-29', 14),
  (25, 'Mammon Collector Talos', 'ТП Eastern Mining ZoneНа север', 6, 2, true, null, '(перс тайгер)', '25-29', 15),
  (25, 'Zombie Lord Crowl', 'ТП Ruins of Despair?', 6, 2, true, null, null, '25-29', 16),
  (25, 'Ikuntai', 'ТП Ruins of DespairВнутри', 6, 2, true, null, null, '25-29', 17),
  (26, 'Tiger Hornet', 'ТП Floran VillageНад Beehive у реки', 6, 2, true, null, '(перс маммон)', '25-29', 18),
  (26, 'Patriarch Kuroboros', 'ТП Forgotten TempleК воде', 6, 2, false, null, null, '25-29', 19),
  (28, 'Tirak', 'ТП Forgotten TempleВнутри - огонь', 6, 2, true, null, null, '25-29', 20),
  (28, 'Partisan Leader Talakin', 'ТП Partisan''s HideawayВниз', 6, 2, false, null, null, '25-29', 21),
  (29, 'Elf Renoa', 'ТП ForgottenTempleНа гору', 6, 2, true, null, null, '25-29', 22),
  (30, 'Beleth''s Agent, Meana', 'ТП ГиранНа восток', 6, 2, true, null, null, '30-34', 23),
  (30, 'Cat''s Eye Bandit', 'ТП Partisan''s HideawayСверху локи', 6, 2, true, null, null, '30-34', 24),
  (30, 'Giant Wasteland Basilisk', 'ТП Ant NestНа гору', 6, 2, true, null, null, '30-34', 25),
  (30, 'Turek Mercenary Captain', 'ТП Orc BarracksВ руинах', 6, 2, true, null, null, '30-34', 26),
  (30, 'Ragraman', 'ТП Windmill HillНаправо на дорогу', 6, 2, false, null, null, '30-34', 27),
  (30, 'Apepi', 'ТП Field of SilenceВ поле', 6, 2, false, null, null, '30-34', 28),
  (32, 'Captain of Queen''s Royal Guards', 'ТП Cruma TowerПраво верх', 6, 2, true, null, null, '30-34', 29),
  (32, 'Skyla', 'ТП Hardin''s Academy', 6, 2, true, null, null, '30-34', 30),
  (33, 'Vuku Grand Seer Gharmash', 'ТП Floran VillageВниз через реку', 6, 2, true, null, null, '30-34', 31),
  (33, 'Nurka''s Messenger', 'ТП Partisan''s HideawayСлева локи', 6, 2, false, null, null, '30-34', 32),
  (33, 'Corsair Captain Kylon', 'ТП Giran Harbor', 6, 2, true, null, null, '30-34', 33),
  (34, 'Stakato Queen Zyrnna', 'ТП Cruma TowerЛевее прошлого', 6, 2, true, null, null, '30-34', 34),
  (34, 'Cronos''s Servitor Mumu', 'ТП Field of Whispers', 6, 2, true, null, null, '30-34', 35),
  (35, 'Remmel', 'ТП Cruma Marshlands', 6, 2, true, null, 'не ставили', '35-39', 36),
  (35, 'Chertuba of Great Soul', 'ТП Orc BarracksНа платформе', 6, 2, false, null, 'не ставили', '35-39', 37),
  (35, 'Sejarr''s Servitor', 'ТП GiranНаправо', 6, 2, false, null, 'не ставили', '35-39', 38),
  (35, 'Guilotine, Warden of the EG', 'ТП DionПешком в EGЭтот снизу', 6, 2, false, null, 'не ставили', '35-39', 39),
  (35, 'Flame Lord Shadar', 'ТП Partisan''s Hideaway', 6, 2, true, null, 'не ставили', '35-39', 40),
  (35, 'Tasaba Patriarch Hellena', 'ТП GiranВниз к развилке', 6, 2, true, null, 'не ставили', '35-39', 41),
  (35, 'Gargoyle Lord Sirocco', 'ТП Ant NestВ стору кв NPC', 6, 2, true, null, 'не ставили', '35-39', 42),
  (35, 'Red Eye Captain Trakia', 'ТП Partisan''s HideawayЛево верх локи', 6, 2, true, null, 'не ставили', '35-39', 43),
  (35, 'Beleth''s Eye', 'ТП Floran VillageПод Monster Race Track', 6, 2, true, null, 'не ставили', '35-39', 44),
  (35, 'Soul Collector Acheron', 'ТП DionВ EG на горе', 6, 2, true, null, 'не ставили', '35-39', 45),
  (36, 'Sebek', 'ТП Field of SilenceНалево', 6, 2, true, null, 'не ставили', '35-39', 46),
  (36, 'Evil Spirit Tempest', 'ТП DionEG Яма', 6, 2, true, null, 'не ставили', '35-39', 47),
  (37, 'Rayito the Looter', 'ТП Cave of TrialsНа гору', 7, 2, true, null, 'не ставили', '35-39', 48),
  (38, 'Lizardmen Leader Hellion', 'ТП Cruma TowerПод куполом', 7, 2, true, null, 'не ставили', '35-39', 49),
  (38, 'Premo Prime', 'ТП Field of SilenceК воде в камнях', 7, 2, false, null, 'не ставили', '35-39', 50),
  (39, 'Nellis'' Vengeful Spirit', 'ТП Eastern Mining ZoneНаправо верх до конца', 7, 2, true, null, 'не ставили', '35-39', 51),
  (39, 'Leader of Cat Gang', 'ТП GiranНаправо на полянке', 7, 2, true, null, 'не ставили', '35-39', 52);


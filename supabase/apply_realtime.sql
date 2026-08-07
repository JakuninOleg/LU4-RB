-- Run in Supabase SQL Editor if Realtime is not enabled yet.
-- Safe to re-run: skips if already in the publication.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'raid_bosses'
  ) then
    alter publication supabase_realtime add table public.raid_bosses;
  end if;
end $$;

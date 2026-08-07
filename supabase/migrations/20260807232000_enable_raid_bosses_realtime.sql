-- Enable Realtime (postgres_changes) for raid_bosses
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

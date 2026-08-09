-- Allow shared clan account to insert catalog rows (seed sync)
create policy "Authenticated users can insert raid bosses"
  on public.raid_bosses
  for insert
  to authenticated
  with check (true);

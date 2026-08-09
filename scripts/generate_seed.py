#!/usr/bin/env python3
"""Parse Excel CSV export and generate seed + apply SQL (no login/password columns)."""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = Path(r"c:\Users\olegk\OneDrive\Рабочий стол\КП ВХ - РБ.csv")
SEED_PATH = ROOT / "supabase" / "seed.sql"
APPLY_PATH = ROOT / "supabase" / "apply_add_bosses.sql"

GROUP_RE = re.compile(r"^РБ\s+(\d+-\d+)\s+Lvl", re.IGNORECASE)
TIMER_RE = re.compile(r"(\d+)\s*ч\s*\+/-\s*(\d+)\s*ч", re.IGNORECASE)


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def normalize_location(value: str) -> str:
    # Keep a readable separator between Excel line breaks
    return re.sub(r"\s*\n\s*", " · ", value).strip()


def parse_rows(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        level_group = None
        rows: list[dict] = []
        sort_order = 0
        expecting_header = False

        for cols in reader:
            if not cols or all(not (c or "").strip() for c in cols):
                continue

            first = (cols[0] or "").strip()
            group_match = GROUP_RE.match(first)
            if group_match:
                level_group = group_match.group(1)
                expecting_header = True
                continue

            if expecting_header and first.lower() in {"lvl", "level"}:
                expecting_header = False
                continue

            if not level_group or not first.isdigit():
                continue

            level = int(first)
            name = (cols[1] if len(cols) > 1 else "").strip()
            location = normalize_location(cols[2] if len(cols) > 2 else "")
            timer = (cols[3] if len(cols) > 3 else "").strip()
            # CSV: Lvl,Name,Location,Timer,Wiki,Guards,Login,Pass,Notes
            # Never persist Login/Pass.
            guards = (cols[5] if len(cols) > 5 else "").strip().lower()
            notes = (cols[8] if len(cols) > 8 else "").strip()

            if not name:
                continue

            timer_match = TIMER_RE.search(timer)
            if not timer_match:
                print(f"skip (bad timer): {name!r} timer={timer!r}")
                continue

            rows.append(
                {
                    "level": level,
                    "name": name,
                    "location": location,
                    "respawn_hours": int(timer_match.group(1)),
                    "variance_hours": int(timer_match.group(2)),
                    "has_guards": guards.startswith("есть"),
                    "notes": notes,
                    "level_group": level_group,
                    "sort_order": sort_order,
                }
            )
            sort_order += 1

        return rows


def values_tuple(boss: dict, *, typed_nulls: bool = False) -> str:
    if typed_nulls:
        notes_sql = f"'{sql_escape(boss['notes'])}'::text" if boss["notes"] else "null::text"
        wiki_sql = "null::text"
    else:
        notes_sql = f"'{sql_escape(boss['notes'])}'" if boss["notes"] else "null"
        wiki_sql = "null"
    return (
        "("
        f"{boss['level']}, '{sql_escape(boss['name'])}', '{sql_escape(boss['location'])}', "
        f"{boss['respawn_hours']}, {boss['variance_hours']}, "
        f"{'true' if boss['has_guards'] else 'false'}, {wiki_sql}, {notes_sql}, "
        f"'{boss['level_group']}', {boss['sort_order']}"
        ")"
    )


def write_seed(bosses: list[dict]) -> None:
    lines = [
        "-- Seed generated from Excel CSV (credentials excluded)",
        "truncate table public.raid_bosses restart identity cascade;",
        "",
        "insert into public.raid_bosses (",
        "  level, name, location, respawn_hours, variance_hours,",
        "  has_guards, wiki_url, notes, level_group, sort_order",
        ") values",
        ",\n".join(f"  {values_tuple(boss)}" for boss in bosses) + ";",
        "",
    ]
    SEED_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_apply(bosses: list[dict]) -> None:
    """Sync catalog by name; preserves killed_at / checked_at / alive_at / notifications."""
    values = ",\n".join(f"  {values_tuple(boss, typed_nulls=True)}" for boss in bosses)
    sql = f"""-- Sync raid boss catalog from CSV (credentials excluded).
-- Preserves timers: killed_at, checked_at, alive_at, last_notified_status.
-- Safe to re-run.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'raid_bosses'
      and policyname = 'Authenticated users can insert raid bosses'
  ) then
    create policy "Authenticated users can insert raid bosses"
      on public.raid_bosses
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

with catalog (
  level, name, location, respawn_hours, variance_hours,
  has_guards, wiki_url, notes, level_group, sort_order
) as (
  values
{values}
),
updated as (
  update public.raid_bosses r
  set
    level = c.level,
    location = c.location,
    respawn_hours = c.respawn_hours,
    variance_hours = c.variance_hours,
    has_guards = c.has_guards,
    wiki_url = c.wiki_url,
    notes = c.notes,
    level_group = c.level_group,
    sort_order = c.sort_order
  from catalog c
  where r.name = c.name
  returning r.name
)
insert into public.raid_bosses (
  level, name, location, respawn_hours, variance_hours,
  has_guards, wiki_url, notes, level_group, sort_order
)
select
  c.level, c.name, c.location, c.respawn_hours, c.variance_hours,
  c.has_guards, c.wiki_url, c.notes, c.level_group, c.sort_order
from catalog c
where not exists (
  select 1 from public.raid_bosses r where r.name = c.name
);

-- Optional check:
-- select level_group, count(*) from public.raid_bosses group by 1 order by 1;
"""
    APPLY_PATH.write_text(sql, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    args = parser.parse_args()

    bosses = parse_rows(args.csv)
    if not bosses:
        raise SystemExit(f"No bosses parsed from {args.csv}")

    write_seed(bosses)
    write_apply(bosses)

    by_group: dict[str, int] = {}
    for boss in bosses:
        by_group[boss["level_group"]] = by_group.get(boss["level_group"], 0) + 1

    print(f"Parsed {len(bosses)} bosses from {args.csv}")
    for group, count in sorted(by_group.items()):
        print(f"  {group}: {count}")
    print(f"Wrote {SEED_PATH}")
    print(f"Wrote {APPLY_PATH}")


if __name__ == "__main__":
    main()

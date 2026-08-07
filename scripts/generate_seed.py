#!/usr/bin/env python3
"""Parse Excel CSV export and generate supabase/seed.sql (no login/password columns)."""

from __future__ import annotations

import csv
import re
from pathlib import Path

CSV_PATH = Path(r"c:\Users\olegk\Downloads\КП ВХ - РБ.csv")
OUT_PATH = Path(__file__).resolve().parents[1] / "supabase" / "seed.sql"

GROUP_RE = re.compile(r"^РБ\s+(\d+-\d+)\s+Lvl", re.IGNORECASE)
TIMER_RE = re.compile(r"(\d+)\s*ч\s*\+/-\s*(\d+)\s*ч", re.IGNORECASE)


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def parse_rows(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8-sig")
    reader = csv.reader(raw.splitlines())
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
        location = (cols[2] if len(cols) > 2 else "").strip()
        timer = (cols[3] if len(cols) > 3 else "").strip()
        guards = (cols[8] if len(cols) > 8 else "").strip().lower()
        notes = (cols[11] if len(cols) > 11 else "").strip()

        if not name:
            continue

        timer_match = TIMER_RE.search(timer)
        if not timer_match:
            continue

        respawn_hours = int(timer_match.group(1))
        variance_hours = int(timer_match.group(2))
        has_guards = guards.startswith("есть")
        wiki_url = None
        notes_sql = f"'{sql_escape(notes)}'" if notes else "null"

        rows.append(
            {
                "level": level,
                "name": name,
                "location": location,
                "respawn_hours": respawn_hours,
                "variance_hours": variance_hours,
                "has_guards": has_guards,
                "wiki_url": wiki_url,
                "notes": notes_sql,
                "level_group": level_group,
                "sort_order": sort_order,
            }
        )
        sort_order += 1

    return rows


def main() -> None:
    bosses = parse_rows(CSV_PATH)
    if not bosses:
        raise SystemExit(f"No bosses parsed from {CSV_PATH}")

    lines = [
        "-- Seed generated from Excel CSV (credentials excluded)",
        "truncate table public.raid_bosses restart identity cascade;",
        "",
        "insert into public.raid_bosses (",
        "  level, name, location, respawn_hours, variance_hours,",
        "  has_guards, wiki_url, notes, level_group, sort_order",
        ") values",
    ]

    value_lines = []
    for boss in bosses:
        location = sql_escape(boss["location"])
        name = sql_escape(boss["name"])
        value_lines.append(
            "  ("
            f"{boss['level']}, '{name}', '{location}', "
            f"{boss['respawn_hours']}, {boss['variance_hours']}, "
            f"{'true' if boss['has_guards'] else 'false'}, null, {boss['notes']}, "
            f"'{boss['level_group']}', {boss['sort_order']}"
            ")"
        )

    lines.append(",\n".join(value_lines) + ";")
    lines.append("")
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(bosses)} bosses to {OUT_PATH}")


if __name__ == "__main__":
    main()

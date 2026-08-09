#!/usr/bin/env python3
"""Sync raid_bosses catalog to remote Supabase (preserves timers). No credentials from CSV."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

from generate_seed import DEFAULT_CSV, parse_rows

ROOT = Path(__file__).resolve().parents[1]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def request_json(url: str, *, headers: dict[str, str], data: bytes | None = None, method: str = "GET"):
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode()
            return response.status, json.loads(body) if body else None
    except urllib.error.HTTPError as err:
        detail = err.read().decode()
        raise SystemExit(f"{method} {url} -> {err.code}: {detail[:500]}") from err


def main() -> None:
    env = load_env()
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    anon = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    bosses = parse_rows(DEFAULT_CSV)
    if not bosses:
        raise SystemExit("No bosses parsed")

    _, auth = request_json(
        f"{base}/auth/v1/token?grant_type=password",
        headers={"apikey": anon, "Content-Type": "application/json"},
        data=json.dumps({"email": env["AUTH_USER"], "password": env["AUTH_PASSWORD"]}).encode(),
        method="POST",
    )
    token = auth["access_token"]
    headers = {
        "apikey": anon,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    _, existing = request_json(
        f"{base}/rest/v1/raid_bosses?select=id,name",
        headers={"apikey": anon, "Authorization": f"Bearer {token}"},
    )
    by_name = {row["name"]: row["id"] for row in existing or []}

    updated = 0
    inserted = 0
    to_insert: list[dict] = []

    for boss in bosses:
        payload = {
            "level": boss["level"],
            "name": boss["name"],
            "location": boss["location"],
            "respawn_hours": boss["respawn_hours"],
            "variance_hours": boss["variance_hours"],
            "has_guards": boss["has_guards"],
            "wiki_url": None,
            "notes": boss["notes"] or None,
            "level_group": boss["level_group"],
            "sort_order": boss["sort_order"],
        }
        if boss["name"] in by_name:
            boss_id = by_name[boss["name"]]
            request_json(
                f"{base}/rest/v1/raid_bosses?id=eq.{boss_id}",
                headers=headers,
                data=json.dumps(payload).encode(),
                method="PATCH",
            )
            updated += 1
        else:
            to_insert.append(payload)

    insert_errors = 0
    for payload in to_insert:
        try:
            request_json(
                f"{base}/rest/v1/raid_bosses",
                headers=headers,
                data=json.dumps(payload).encode(),
                method="POST",
            )
            inserted += 1
        except SystemExit as err:
            insert_errors += 1
            if insert_errors == 1:
                print(err)
                print(
                    "Insert blocked by RLS. Run supabase/apply_add_bosses.sql "
                    "in Supabase SQL Editor, then re-run this script."
                )
            break

    _, after = request_json(
        f"{base}/rest/v1/raid_bosses?select=level_group",
        headers={"apikey": anon, "Authorization": f"Bearer {token}"},
    )
    groups: dict[str, int] = {}
    for row in after or []:
        groups[row["level_group"]] = groups.get(row["level_group"], 0) + 1

    print(f"updated={updated} inserted={inserted} total={len(after or [])}")
    for group, count in sorted(groups.items()):
        print(f"  {group}: {count}")


if __name__ == "__main__":
    main()

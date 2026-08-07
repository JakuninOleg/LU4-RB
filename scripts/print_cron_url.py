from pathlib import Path

env = {}
for line in Path(".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

secret = env.get("CRON_SECRET")
if not secret:
    raise SystemExit("CRON_SECRET missing in .env")

url = f"https://lu4-rb.vercel.app/api/cron/check-respawns?secret={secret}"
print(url)
print()
print("cron-job.org settings:")
print("  Title: LU4-RB respawn check")
print("  URL: (строка выше)")
print("  Schedule: every 1 minute")
print("  Method: GET")
print("  Enabled: yes")

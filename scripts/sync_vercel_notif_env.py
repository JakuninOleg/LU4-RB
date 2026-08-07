from pathlib import Path
import subprocess

env = {}
for path in (Path(".env"), Path(".env.local")):
    if not path.exists():
        continue
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

keys = [
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
    "CRON_SECRET",
]

for key in keys:
    value = env.get(key)
    if not value:
        print("skip", key)
        continue
    for target in ("production", "preview", "development"):
        print(f"add {key} -> {target}")
        proc = subprocess.run(
            ["vercel.cmd", "env", "add", key, target, "--yes"],
            input=value + "\n",
            text=True,
            capture_output=True,
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        if proc.returncode != 0 and "already" not in out.lower():
            # try remove+add is heavy; just report
            print("  result:", out[-200:].replace("\n", " "))
        else:
            print("  ok/exists")

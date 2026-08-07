from pathlib import Path
import subprocess
import sys

# Prefer .env values; don't print secrets
env_file = Path(".env")
if not env_file.exists():
    raise SystemExit("Missing .env")

env = {}
for line in env_file.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

# Ensure .env.local has app vars (Vercel may have created empty OIDC-only file)
local_path = Path(".env.local")
existing = {}
if local_path.exists():
    for line in local_path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.strip().startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        existing[k.strip()] = v.strip()

merged = {**existing}
for key in [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_APP_TIMEZONE",
]:
    if env.get(key):
        merged[key] = env[key]

lines = [f"{k}={v}" for k, v in merged.items()]
local_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("Wrote .env.local keys:", ", ".join(sorted(merged.keys())))

keys_for_vercel = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_APP_TIMEZONE",
]

for key in keys_for_vercel:
    value = env.get(key)
    if not value:
        print(f"skip empty {key}")
        continue
    for target in ("production", "preview", "development"):
        print(f"Adding {key} -> {target}")
        proc = subprocess.run(
            ["vercel.cmd", "env", "add", key, target, "--yes"],
            input=value + "\n",
            text=True,
            capture_output=True,
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        if proc.returncode != 0:
            if "already exists" in out.lower() or "duplicate" in out.lower():
                print(f"  exists, ok")
            else:
                print(f"  failed ({proc.returncode}): {out[-300:]}")
        else:
            print("  ok")

print("done")

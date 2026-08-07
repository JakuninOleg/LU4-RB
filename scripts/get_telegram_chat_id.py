from pathlib import Path
import json
import urllib.request
import urllib.error

env = {}
for line in Path(".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

token = env.get("TELEGRAM_BOT_TOKEN")
if not token:
    raise SystemExit("TELEGRAM_BOT_TOKEN missing in .env")

url = f"https://api.telegram.org/bot{token}/getUpdates"
try:
    with urllib.request.urlopen(url, timeout=20) as resp:
        data = json.loads(resp.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:300])
    raise SystemExit(1)

if not data.get("ok"):
    print("API error:", data)
    raise SystemExit(1)

results = data.get("result") or []
if not results:
    print("NO_UPDATES")
    print("Write /start to @LU4_RB_BOT in Telegram, then run again.")
    raise SystemExit(2)

seen = {}
for item in results:
    msg = item.get("message") or item.get("channel_post") or item.get("my_chat_member") or {}
    chat = msg.get("chat") or {}
    if not chat:
        continue
    chat_id = chat.get("id")
    if chat_id is None:
        continue
    seen[chat_id] = {
        "id": chat_id,
        "type": chat.get("type"),
        "title": chat.get("title"),
        "username": chat.get("username"),
        "first_name": chat.get("first_name"),
        "last_name": chat.get("last_name"),
    }

print(f"FOUND {len(seen)} chat(s):")
for chat in seen.values():
    print(json.dumps(chat, ensure_ascii=False))

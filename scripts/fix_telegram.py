from pathlib import Path
import json
import urllib.request
import urllib.error
import urllib.parse

env = {}
for line in Path(".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

token = env["TELEGRAM_BOT_TOKEN"]
base = f"https://api.telegram.org/bot{token}"


def api(method: str, payload: dict | None = None):
    url = f"{base}/{method}"
    if payload is None:
        with urllib.request.urlopen(url, timeout=20) as resp:
            return json.loads(resp.read().decode())
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode())


print("1) getWebhookInfo")
wh = api("getWebhookInfo")
print(json.dumps(wh.get("result", {}), ensure_ascii=False))

info = wh.get("result") or {}
if info.get("url"):
    print("2) deleteWebhook (was set, blocks getUpdates)")
    print(json.dumps(api("deleteWebhook", {"drop_pending_updates": False}), ensure_ascii=False))
else:
    print("2) webhook empty — ok")

print("3) getUpdates")
updates = api("getUpdates")
results = updates.get("result") or []
print("updates_count", len(results))

seen = {}
for item in results:
    for key in ("message", "edited_message", "channel_post", "my_chat_member", "chat_member"):
        msg = item.get(key)
        if not msg:
            continue
        chat = msg.get("chat") or {}
        cid = chat.get("id")
        if cid is None:
            continue
        seen[cid] = {
            "id": cid,
            "type": chat.get("type"),
            "username": chat.get("username"),
            "first_name": chat.get("first_name"),
            "title": chat.get("title"),
            "text": (msg.get("text") or "")[:80],
        }

if not seen:
    print("NO_CHATS_YET")
else:
    print("CHATS:")
    for chat in seen.values():
        print(json.dumps(chat, ensure_ascii=False))
    # pick first private chat preferably
    preferred = None
    for chat in seen.values():
        if chat.get("type") == "private":
            preferred = chat
            break
    if preferred is None:
        preferred = next(iter(seen.values()))

    chat_id = str(preferred["id"])
    # write to .env
    text = Path(".env").read_text(encoding="utf-8")
    if "TELEGRAM_CHAT_ID=" in text:
        import re

        text = re.sub(r"^TELEGRAM_CHAT_ID=.*$", f"TELEGRAM_CHAT_ID={chat_id}", text, flags=re.M)
    else:
        text = text.rstrip() + f"\nTELEGRAM_CHAT_ID={chat_id}\n"
    Path(".env").write_text(text, encoding="utf-8")
    print("SAVED_CHAT_ID", chat_id)

    # send test message
    send = api(
        "sendMessage",
        {
            "chat_id": preferred["id"],
            "text": "✅ LU4-RB: бот подключён. Сюда будут приходить алерты о респе РБ.",
        },
    )
    print("test_send_ok", send.get("ok"))

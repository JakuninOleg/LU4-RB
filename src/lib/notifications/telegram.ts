import { statusAlertText } from "@/lib/notifications/messages";
import type { BossStatus } from "@/lib/timers";

export async function sendTelegramAlert(status: BossStatus, bossName: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { ok: false as const, skipped: true as const, reason: "Telegram env not set" };
  }

  const text = statusAlertText(status, bossName);
  if (!text) {
    return { ok: false as const, skipped: true as const, reason: "Not an alert status" };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.telegram,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false as const, skipped: false as const, reason: body.slice(0, 300) };
  }

  return { ok: true as const, skipped: false as const };
}

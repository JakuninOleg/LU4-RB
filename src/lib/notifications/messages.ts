import type { BossStatus } from "@/lib/timers";

const ALERT_STATUSES = new Set<BossStatus>(["possible", "respawned"]);

export function shouldNotifyStatus(status: BossStatus) {
  return ALERT_STATUSES.has(status);
}

export function statusAlertText(status: BossStatus, bossName: string) {
  if (status === "possible") {
    return {
      title: "Возможно реснулся",
      body: `${bossName}: возможно реснулся (окно респа)`,
      telegram: `⚠️ <b>Возможно реснулся</b>\n${escapeHtml(bossName)}`,
    };
  }
  if (status === "respawned") {
    return {
      title: "100% реснулся",
      body: `${bossName}: 100% реснулся`,
      telegram: `🚨 <b>100% реснулся</b>\n${escapeHtml(bossName)}`,
    };
  }
  return null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

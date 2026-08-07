import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { statusAlertText } from "@/lib/notifications/messages";
import type { BossStatus } from "@/lib/timers";

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@lu4-rb.local";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendWebPushAlerts(
  status: BossStatus,
  bossName: string,
  supabase: SupabaseClient,
) {
  if (!configureWebPush()) {
    return { sent: 0, failed: 0, skipped: true as const, reason: "VAPID env not set" };
  }

  const text = statusAlertText(status, bossName);
  if (!text) {
    return { sent: 0, failed: 0, skipped: true as const, reason: "Not an alert status" };
  }

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    return { sent: 0, failed: 0, skipped: false as const, reason: error.message };
  }

  const payload = JSON.stringify({
    title: `LU4-RB · ${text.title}`,
    body: text.body,
    url: "/",
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload,
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      const statusCode =
        typeof err === "object" && err && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return { sent, failed, skipped: false as const };
}

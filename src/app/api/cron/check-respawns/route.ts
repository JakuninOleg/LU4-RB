import { NextResponse } from "next/server";
import { createCronClient } from "@/lib/supabase/cron";
import { sendTelegramAlert } from "@/lib/notifications/telegram";
import { sendWebPushAlerts } from "@/lib/notifications/web-push";
import { shouldNotifyStatus } from "@/lib/notifications/messages";
import { getBossStatus, type BossStatus, type RaidBoss } from "@/lib/timers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return bearer === secret || querySecret === secret;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createCronClient();
    const { data, error } = await supabase
      .from("raid_bosses")
      .select(
        "id, name, killed_at, checked_at, respawn_hours, variance_hours, last_notified_status",
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date();
    const alerts: Array<{
      id: string;
      name: string;
      status: BossStatus;
      telegram: unknown;
      push: unknown;
    }> = [];

    for (const row of data ?? []) {
      const boss = row as Pick<
        RaidBoss,
        "id" | "name" | "killed_at" | "checked_at" | "respawn_hours" | "variance_hours"
      > & { last_notified_status: string | null };

      const status = getBossStatus(boss, now);
      const previous = boss.last_notified_status as BossStatus | null;

      if (shouldNotifyStatus(status)) {
        if (previous !== status) {
          const telegram = await sendTelegramAlert(status, boss.name);
          const push = await sendWebPushAlerts(status, boss.name, supabase);
          await supabase
            .from("raid_bosses")
            .update({ last_notified_status: status })
            .eq("id", boss.id);
          alerts.push({
            id: boss.id,
            name: boss.name,
            status,
            telegram,
            push,
          });
        }
      } else if (previous) {
        await supabase
          .from("raid_bosses")
          .update({ last_notified_status: null })
          .eq("id", boss.id);
      }
    }

    return NextResponse.json({
      ok: true,
      checked: data?.length ?? 0,
      alerts: alerts.length,
      details: alerts,
      at: now.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

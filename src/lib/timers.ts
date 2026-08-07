export type RaidBoss = {
  id: string;
  level: number;
  name: string;
  location: string;
  respawn_hours: number;
  variance_hours: number;
  has_guards: boolean;
  wiki_url: string | null;
  notes: string | null;
  level_group: string;
  sort_order: number;
  killed_at: string | null;
  checked_at: string | null;
  updated_at: string;
  updated_by: string | null;
};

/** UI / filter statuses */
export type BossStatus =
  | "verified"
  | "unverified"
  | "waiting_far"
  | "waiting_soon"
  | "possible"
  | "respawned";

export const VERIFIED_TTL_MS = 15 * 60 * 1000;
export const SOON_THRESHOLD_MS = 60 * 60 * 1000;

export function getRespawnWindow(
  boss: Pick<RaidBoss, "killed_at" | "respawn_hours" | "variance_hours">,
) {
  if (!boss.killed_at) {
    return null;
  }

  const killedAt = new Date(boss.killed_at).getTime();
  const baseMs = Number(boss.respawn_hours) * 60 * 60 * 1000;
  const varianceMs = Number(boss.variance_hours) * 60 * 60 * 1000;

  return {
    start: new Date(killedAt + baseMs - varianceMs),
    end: new Date(killedAt + baseMs + varianceMs),
  };
}

export function getBossStatus(
  boss: Pick<RaidBoss, "killed_at" | "checked_at" | "respawn_hours" | "variance_hours">,
  now = new Date(),
): BossStatus {
  const window = getRespawnWindow(boss);
  const t = now.getTime();

  if (window) {
    const untilStart = window.start.getTime() - t;
    if (untilStart > SOON_THRESHOLD_MS) {
      return "waiting_far";
    }
    if (untilStart > 0) {
      return "waiting_soon";
    }
    if (t <= window.end.getTime()) {
      return "possible";
    }
    return "respawned";
  }

  if (boss.checked_at) {
    const checkedAt = new Date(boss.checked_at).getTime();
    if (t - checkedAt < VERIFIED_TTL_MS) {
      return "verified";
    }
  }

  return "unverified";
}

/** @deprecated use getBossStatus */
export type RespawnStatus = BossStatus;

/** @deprecated use getBossStatus */
export function getRespawnStatus(
  boss: Pick<RaidBoss, "killed_at" | "checked_at" | "respawn_hours" | "variance_hours">,
  now = new Date(),
): BossStatus {
  return getBossStatus(boss, now);
}

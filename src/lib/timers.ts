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
  updated_at: string;
  updated_by: string | null;
};

export type RespawnStatus =
  | "no_timer"
  | "waiting"
  | "possible"
  | "respawned";

export function getRespawnWindow(boss: Pick<RaidBoss, "killed_at" | "respawn_hours" | "variance_hours">) {
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

export function getRespawnStatus(
  boss: Pick<RaidBoss, "killed_at" | "respawn_hours" | "variance_hours">,
  now = new Date(),
): RespawnStatus {
  const window = getRespawnWindow(boss);
  if (!window) {
    return "no_timer";
  }

  const t = now.getTime();
  if (t < window.start.getTime()) {
    return "waiting";
  }
  if (t <= window.end.getTime()) {
    return "possible";
  }
  return "respawned";
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BossStatus, RaidBoss } from "@/lib/timers";
import { getBossStatus, getRespawnWindow } from "@/lib/timers";
import {
  isoToHourMinute,
  KillTimePicker,
  timeToKilledAtIso,
} from "@/components/kill-time-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BossGroupSection } from "@/components/boss-group-section";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusLabel: Record<BossStatus, string> = {
  alive: "Живой",
  verified: "Проверен",
  unverified: "Непроверен",
  waiting_far: "На респе",
  waiting_soon: "Скоро",
  possible: "Возможно",
  respawned: "Реснулся",
};

const statusClass: Record<BossStatus, string> = {
  alive: "border-transparent bg-lime-600 text-white",
  verified: "border-transparent bg-emerald-600 text-white",
  unverified: "border-transparent bg-zinc-400 text-white dark:bg-zinc-600",
  waiting_far: "border-transparent bg-sky-600 text-white",
  waiting_soon: "border-transparent bg-amber-500 text-white",
  possible: "border-transparent bg-orange-500 text-white",
  respawned: "border-transparent bg-red-600 text-white",
};

const FILTERS: { id: BossStatus | "all"; label: string; className: string }[] = [
  { id: "all", label: "Все", className: "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" },
  { id: "alive", label: "Живой", className: "bg-lime-600 text-white" },
  { id: "verified", label: "Проверен", className: "bg-emerald-600 text-white" },
  { id: "waiting_soon", label: "Скоро реснутся", className: "bg-amber-500 text-white" },
  { id: "waiting_far", label: "На респавне", className: "bg-sky-600 text-white" },
  { id: "unverified", label: "Непроверенные", className: "bg-zinc-500 text-white" },
  { id: "possible", label: "Возможно реснулись", className: "bg-orange-500 text-white" },
  { id: "respawned", label: "Реснулись", className: "bg-red-600 text-white" },
];

function formatTime(value: Date | string | null, timeZone: string) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function notifyStatusChange(bossName: string, status: BossStatus) {
  const title =
    status === "possible"
      ? "Возможно реснулся"
      : status === "respawned"
        ? "100% реснулся"
        : null;
  if (!title) return;

  const body = `${bossName}: ${title}`;
  toast.warning(body);

  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification("LU4-RB", { body, tag: `${bossName}-${status}` });
    }
  }
}

function mergeBoss(prev: RaidBoss, next: Partial<RaidBoss>): RaidBoss {
  return {
    ...prev,
    ...next,
    checked_at: next.checked_at !== undefined ? next.checked_at : prev.checked_at,
    alive_at: next.alive_at !== undefined ? next.alive_at : prev.alive_at,
    last_notified_status:
      next.last_notified_status !== undefined
        ? next.last_notified_status
        : prev.last_notified_status,
  };
}

export function RaidBossTable({
  bosses: initialBosses,
  timeZone,
}: {
  bosses: RaidBoss[];
  timeZone: string;
}) {
  const [bosses, setBosses] = useState(initialBosses);
  const [now, setNow] = useState(() => new Date());
  const [filter, setFilter] = useState<BossStatus | "all">("all");
  const [selected, setSelected] = useState<RaidBoss | null>(null);
  const [resetTarget, setResetTarget] = useState<RaidBoss | null>(null);
  const [hour, setHour] = useState("00");
  const [minute, setMinute] = useState("00");
  const [pending, startTransition] = useTransition();
  const prevStatusRef = useRef<Map<string, BossStatus>>(new Map());

  useEffect(() => {
    setBosses(initialBosses);
  }, [initialBosses]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("raid-bosses-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "raid_bosses" },
        (payload) => {
          if (payload.eventType === "UPDATE" && payload.new) {
            const updated = payload.new as RaidBoss;
            setBosses((prev) =>
              prev.map((boss) =>
                boss.id === updated.id ? mergeBoss(boss, updated) : boss,
              ),
            );
            setSelected((current) =>
              current?.id === updated.id ? mergeBoss(current, updated) : current,
            );
            return;
          }

          if (payload.eventType === "INSERT" && payload.new) {
            const inserted = payload.new as RaidBoss;
            setBosses((prev) => {
              if (prev.some((boss) => boss.id === inserted.id)) return prev;
              return [...prev, mergeBoss(inserted, {})].sort(
                (a, b) => a.sort_order - b.sort_order,
              );
            });
            return;
          }

          if (payload.eventType === "DELETE" && payload.old) {
            const removed = payload.old as { id?: string };
            if (!removed.id) return;
            setBosses((prev) => prev.filter((boss) => boss.id !== removed.id));
            setSelected((current) =>
              current?.id === removed.id ? null : current,
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const nextMap = new Map<string, BossStatus>();
    for (const boss of bosses) {
      const status = getBossStatus(boss, now);
      nextMap.set(boss.id, status);
      const prev = prevStatusRef.current.get(boss.id);
      if (
        prev &&
        prev !== status &&
        (status === "possible" || status === "respawned")
      ) {
        notifyStatusChange(boss.name, status);
      }
    }
    prevStatusRef.current = nextMap;
  }, [bosses, now]);

  const filteredBosses = useMemo(() => {
    if (filter === "all") return bosses;
    return bosses.filter((boss) => getBossStatus(boss, now) === filter);
  }, [bosses, filter, now]);

  const groups = useMemo(() => {
    const map = new Map<string, RaidBoss[]>();
    for (const boss of filteredBosses) {
      const list = map.get(boss.level_group) ?? [];
      list.push(boss);
      map.set(boss.level_group, list);
    }
    return [...map.entries()];
  }, [filteredBosses]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: bosses.length };
    for (const boss of bosses) {
      const status = getBossStatus(boss, now);
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, [bosses, now]);

  function openEditor(boss: RaidBoss) {
    const parts = isoToHourMinute(boss.killed_at, timeZone);
    setSelected(boss);
    setHour(parts.hour);
    setMinute(parts.minute);
  }

  async function saveKilledAt() {
    if (!selected) return;
    const supabase = createClient();
    const iso = timeToKilledAtIso(hour, minute, timeZone);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const patch = {
      killed_at: iso,
      checked_at: null as string | null,
      alive_at: null as string | null,
      updated_by: user?.id ?? null,
    };

    const { error } = await supabase
      .from("raid_bosses")
      .update(patch)
      .eq("id", selected.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    startTransition(() => {
      setBosses((prev) =>
        prev.map((boss) =>
          boss.id === selected.id ? mergeBoss(boss, patch) : boss,
        ),
      );
    });
    toast.success(`Таймер обновлён: ${selected.name}`);
    setSelected(null);
  }

  async function markNotOnSpawn(boss: RaidBoss) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const patch = {
      killed_at: null as string | null,
      checked_at: new Date().toISOString(),
      alive_at: null as string | null,
      updated_by: user?.id ?? null,
    };

    const { error } = await supabase
      .from("raid_bosses")
      .update(patch)
      .eq("id", boss.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    startTransition(() => {
      setBosses((prev) =>
        prev.map((row) => (row.id === boss.id ? mergeBoss(row, patch) : row)),
      );
    });
    toast.success(`${boss.name}: нет на спавне (проверен 20 мин)`);
    if (selected?.id === boss.id) setSelected(null);
  }

  async function markAlive(boss: RaidBoss) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const patch = {
      killed_at: null as string | null,
      checked_at: null as string | null,
      alive_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };

    const { error } = await supabase
      .from("raid_bosses")
      .update(patch)
      .eq("id", boss.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    startTransition(() => {
      setBosses((prev) =>
        prev.map((row) => (row.id === boss.id ? mergeBoss(row, patch) : row)),
      );
    });
    toast.success(`${boss.name}: живой (20 мин)`);
    if (selected?.id === boss.id) setSelected(null);
  }

  async function clearTimer(boss: RaidBoss) {
    const supabase = createClient();
    const patch = {
      killed_at: null as string | null,
      checked_at: null as string | null,
      alive_at: null as string | null,
      last_notified_status: null as string | null,
      updated_by: null as string | null,
    };
    const { error } = await supabase
      .from("raid_bosses")
      .update(patch)
      .eq("id", boss.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    startTransition(() => {
      setBosses((prev) =>
        prev.map((row) => (row.id === boss.id ? mergeBoss(row, patch) : row)),
      );
    });
    toast.success(`Таймер сброшен: ${boss.name}`);
    setResetTarget(null);
    if (selected?.id === boss.id) setSelected(null);
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Обновления от других игроков приходят сами (Realtime). Статусы
          пересчитываются каждые 15 сек — F5 не нужен.
        </p>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            const count = filterCounts[item.id] ?? 0;
            return (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className={cn(
                  "border-0",
                  active ? item.className : "opacity-80",
                  !active && "hover:opacity-100",
                )}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                <span className="ml-1 opacity-80">({count})</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-base">Нет РБ по выбранному фильтру.</p>
        ) : (
          groups.map(([group, rows]) => (
            <BossGroupSection
              key={group}
              groupId={group}
              title={`РБ ${group}`}
              count={rows.length}
            >
              <div className="overflow-x-auto">
                <Table className="text-base">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base">Lvl</TableHead>
                      <TableHead className="text-base">Название</TableHead>
                      <TableHead className="hidden text-base md:table-cell">Локация</TableHead>
                      <TableHead className="text-base">Таймер</TableHead>
                      <TableHead className="text-base">Статус</TableHead>
                      <TableHead className="hidden text-base lg:table-cell">Респ от</TableHead>
                      <TableHead className="hidden text-base lg:table-cell">Респ до</TableHead>
                      <TableHead className="text-base">Охрана</TableHead>
                      <TableHead className="min-w-72" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((boss) => {
                      const status = getBossStatus(boss, now);
                      const window = getRespawnWindow(boss);
                      return (
                        <TableRow key={boss.id}>
                          <TableCell>{boss.level}</TableCell>
                          <TableCell className="font-medium">{boss.name}</TableCell>
                          <TableCell className="text-muted-foreground hidden max-w-64 truncate md:table-cell">
                            {boss.location}
                          </TableCell>
                          <TableCell>
                            {boss.respawn_hours}ч ± {boss.variance_hours}ч
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-sm", statusClass[status])}>
                              {statusLabel[status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {formatTime(window?.start ?? null, timeZone)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {formatTime(window?.end ?? null, timeZone)}
                          </TableCell>
                          <TableCell>{boss.has_guards ? "Есть" : "Нет"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => openEditor(boss)}
                              >
                                Таймер
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="bg-lime-600 text-white hover:bg-lime-700"
                                disabled={pending}
                                onClick={() => markAlive(boss)}
                              >
                                Живой
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="bg-amber-500 text-white hover:bg-amber-600"
                                disabled={pending}
                                onClick={() => markNotOnSpawn(boss)}
                              >
                                Нет на спавне
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="bg-red-600 text-white hover:bg-red-700"
                                disabled={pending || !boss.killed_at}
                                onClick={() => setResetTarget(boss)}
                              >
                                Сбросить
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </BossGroupSection>
          ))
        )}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{selected?.name}</DialogTitle>
            <DialogDescription className="text-base">
              Укажите время убийства, отметьте «Живой» или «Нет на спавне».
            </DialogDescription>
          </DialogHeader>
          <KillTimePicker
            hour={hour}
            minute={minute}
            timeZone={timeZone}
            onChange={(nextHour, nextMinute) => {
              setHour(nextHour);
              setMinute(nextMinute);
            }}
          />
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={pending}
              onClick={saveKilledAt}
            >
              Сохранить время
            </Button>
            <Button
              type="button"
              className="w-full bg-lime-600 text-white hover:bg-lime-700"
              disabled={pending || !selected}
              onClick={() => {
                if (selected) void markAlive(selected);
              }}
            >
              Живой
            </Button>
            <Button
              type="button"
              className="w-full bg-amber-500 text-white hover:bg-amber-600"
              disabled={pending || !selected}
              onClick={() => {
                if (selected) void markNotOnSpawn(selected);
              }}
            >
              Нет на спавне
            </Button>
            <Button
              type="button"
              className="w-full bg-red-600 text-white hover:bg-red-700"
              disabled={pending || !selected?.killed_at}
              onClick={() => {
                if (selected) setResetTarget(selected);
              }}
            >
              Сбросить таймер
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сбросить таймер?</AlertDialogTitle>
            <AlertDialogDescription>
              {resetTarget
                ? `Вы уверены, что хотите сбросить таймер для ${resetTarget.name}? Статус станет «Непроверен».`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (resetTarget) void clearTimer(resetTarget);
              }}
            >
              Да, сбросить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

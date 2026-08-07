"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RaidBoss, RespawnStatus } from "@/lib/timers";
import { getRespawnStatus, getRespawnWindow } from "@/lib/timers";
import {
  isoToHourMinute,
  KillTimePicker,
  timeToKilledAtIso,
} from "@/components/kill-time-picker";
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
import { toast } from "sonner";

const statusLabel: Record<RespawnStatus, string> = {
  no_timer: "Нет таймера",
  waiting: "Ожидание",
  possible: "Возможно",
  respawned: "Реснулся",
};

const statusVariant: Record<
  RespawnStatus,
  "outline" | "secondary" | "default" | "destructive"
> = {
  no_timer: "outline",
  waiting: "secondary",
  possible: "default",
  respawned: "destructive",
};

function formatTime(value: Date | string | null, timeZone: string) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function RaidBossTable({
  bosses,
  timeZone,
}: {
  bosses: RaidBoss[];
  timeZone: string;
}) {
  const router = useRouter();
  const [now] = useState(() => new Date());
  const [selected, setSelected] = useState<RaidBoss | null>(null);
  const [hour, setHour] = useState("00");
  const [minute, setMinute] = useState("00");
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const map = new Map<string, RaidBoss[]>();
    for (const boss of bosses) {
      const list = map.get(boss.level_group) ?? [];
      list.push(boss);
      map.set(boss.level_group, list);
    }
    return [...map.entries()];
  }, [bosses]);

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

    const { error } = await supabase
      .from("raid_bosses")
      .update({
        killed_at: iso,
        updated_by: user?.id ?? null,
      })
      .eq("id", selected.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Таймер обновлён: ${selected.name}`);
    setSelected(null);
    startTransition(() => router.refresh());
  }

  async function clearKilledAt(boss: RaidBoss) {
    const supabase = createClient();
    const { error } = await supabase
      .from("raid_bosses")
      .update({ killed_at: null, updated_by: null })
      .eq("id", boss.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Таймер сброшен: ${boss.name}`);
    if (selected?.id === boss.id) {
      setSelected(null);
    }
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        {groups.map(([group, rows]) => (
          <section key={group} className="flex flex-col gap-3">
            <h2 className="font-heading text-2xl font-semibold tracking-wide">
              РБ {group}
            </h2>
            <div className="bg-card overflow-x-auto rounded-lg border">
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
                    <TableHead className="w-48" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((boss) => {
                    const status = getRespawnStatus(boss, now);
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
                          <Badge variant={statusVariant[status]} className="text-sm">
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
                              variant="outline"
                              onClick={() => openEditor(boss)}
                            >
                              Таймер
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={pending || !boss.killed_at}
                              onClick={() => clearKilledAt(boss)}
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
          </section>
        ))}
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
              Укажите час и минуту убийства. Дата подставится автоматически.
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
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={pending || !selected?.killed_at}
              onClick={() => {
                if (selected) void clearKilledAt(selected);
              }}
            >
              Сбросить таймер
            </Button>
            <Button type="button" disabled={pending} onClick={saveKilledAt}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

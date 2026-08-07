"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RaidBoss, RespawnStatus } from "@/lib/timers";
import { getRespawnStatus, getRespawnWindow } from "@/lib/timers";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

function toDatetimeLocalValue(iso: string | null, timeZone: string) {
  const date = iso ? new Date(iso) : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function datetimeLocalToIso(value: string, timeZone: string) {
  // Europe/Moscow is fixed UTC+3; for other zones fall back to browser local parse.
  if (timeZone === "Europe/Moscow") {
    return new Date(`${value}:00+03:00`).toISOString();
  }
  return new Date(value).toISOString();
}

function formatDateTime(value: Date | string | null, timeZone: string) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
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
  const [killedAtLocal, setKilledAtLocal] = useState("");
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
    setSelected(boss);
    setKilledAtLocal(toDatetimeLocalValue(boss.killed_at, timeZone));
  }

  async function saveKilledAt() {
    if (!selected) return;
    const supabase = createClient();
    const iso = datetimeLocalToIso(killedAtLocal, timeZone);
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

  async function clearKilledAt() {
    if (!selected) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("raid_bosses")
      .update({ killed_at: null, updated_by: null })
      .eq("id", selected.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Таймер сброшен: ${selected.name}`);
    setSelected(null);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        {groups.map(([group, rows]) => (
          <section key={group} className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">РБ {group}</h2>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lvl</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead className="hidden md:table-cell">Локация</TableHead>
                    <TableHead>Таймер</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="hidden lg:table-cell">Респ от</TableHead>
                    <TableHead className="hidden lg:table-cell">Респ до</TableHead>
                    <TableHead>Охрана</TableHead>
                    <TableHead className="w-24" />
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
                        <TableCell className="text-muted-foreground hidden max-w-56 truncate md:table-cell">
                          {boss.location}
                        </TableCell>
                        <TableCell>
                          {boss.respawn_hours}ч ± {boss.variance_hours}ч
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[status]}>
                            {statusLabel[status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {formatDateTime(window?.start ?? null, timeZone)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {formatDateTime(window?.end ?? null, timeZone)}
                        </TableCell>
                        <TableCell>{boss.has_guards ? "Есть" : "Нет"}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditor(boss)}
                          >
                            Таймер
                          </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              Время убийства в часовом поясе {timeZone}. Окно респа считается
              автоматически.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="killed-at">Время убийства</FieldLabel>
              <Input
                id="killed-at"
                type="datetime-local"
                value={killedAtLocal}
                onChange={(event) => setKilledAtLocal(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={pending || !selected?.killed_at}
              onClick={clearKilledAt}
            >
              Сбросить
            </Button>
            <Button type="button" disabled={pending || !killedAtLocal} onClick={saveKilledAt}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

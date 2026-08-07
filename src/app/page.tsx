import { createClient } from "@/lib/supabase/server";
import type { RaidBoss } from "@/lib/timers";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRespawnStatus, getRespawnWindow } from "@/lib/timers";
import { SignOutButton } from "@/components/sign-out-button";

const statusLabel = {
  no_timer: "Нет таймера",
  waiting: "Ожидание",
  possible: "Возможно",
  respawned: "Реснулся",
} as const;

const statusVariant = {
  no_timer: "outline",
  waiting: "secondary",
  possible: "default",
  respawned: "destructive",
} as const;

function formatDateTime(value: Date | string | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("raid_bosses")
    .select("*")
    .order("sort_order", { ascending: true });

  const bosses = (data ?? []) as RaidBoss[];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">LU4-RB</h1>
          <p className="text-muted-foreground text-sm">
            Таймеры респауна рейд-боссов
          </p>
        </div>
        <SignOutButton />
      </header>

      {error ? (
        <p className="text-destructive text-sm">
          Не удалось загрузить РБ: {error.message}
        </p>
      ) : bosses.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Каталог пуст. Примените миграцию и seed.
        </p>
      ) : (
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {bosses.map((boss) => {
                const status = getRespawnStatus(boss);
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
                      {formatDateTime(window?.start ?? null)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatDateTime(window?.end ?? null)}
                    </TableCell>
                    <TableCell>{boss.has_guards ? "Есть" : "Нет"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}

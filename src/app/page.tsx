import { createClient } from "@/lib/supabase/server";
import type { RaidBoss } from "@/lib/timers";
import { RaidBossTable } from "@/components/raid-boss-table";
import { SignOutButton } from "@/components/sign-out-button";

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("raid_bosses")
    .select("*")
    .order("sort_order", { ascending: true });

  const bosses = (data ?? []) as RaidBoss[];
  const timeZone = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Moscow";

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
        <RaidBossTable bosses={bosses} timeZone={timeZone} />
      )}
    </main>
  );
}

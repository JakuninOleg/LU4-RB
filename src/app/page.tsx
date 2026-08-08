import { createClient } from "@/lib/supabase/server";
import type { RaidBoss } from "@/lib/timers";
import { PushSubscribeButton } from "@/components/push-subscribe-button";
import { RaidBossTable } from "@/components/raid-boss-table";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("raid_bosses")
    .select("*")
    .order("sort_order", { ascending: true });

  const bosses = ((data ?? []) as RaidBoss[]).map((boss) => ({
    ...boss,
    checked_at: boss.checked_at ?? null,
    alive_at: boss.alive_at ?? null,
    last_notified_status: boss.last_notified_status ?? null,
  }));
  const timeZone = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Moscow";

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 p-4 md:p-6">
      <header className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-4 md:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-4xl font-semibold tracking-wide">LU4-RB</h1>
          <p className="text-muted-foreground text-base">
            Таймеры респауна · {timeZone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PushSubscribeButton />
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      {error ? (
        <p className="text-destructive text-base">
          Не удалось загрузить РБ: {error.message}
        </p>
      ) : bosses.length === 0 ? (
        <p className="text-muted-foreground text-base">
          Каталог пуст. Примените миграцию и seed.
        </p>
      ) : (
        <RaidBossTable bosses={bosses} timeZone={timeZone} />
      )}
    </main>
  );
}

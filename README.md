# LU4-RB

Трекер респауна рейд-боссов Lineage 2 (LU4).

**Production:** https://lu4-rb.vercel.app

## Стек

- Next.js (App Router) + TypeScript + Tailwind CSS
- shadcn/ui
- Supabase (Auth + Postgres)
- Деплой: Vercel
- Оповещения: Telegram Bot + Web Push (Vercel Cron)

## Быстрый старт

```bash
npm install
cp .env.example .env.local
npm run dev
```

В Supabase Auth → URL Configuration:

- Site URL: `https://lu4-rb.vercel.app`
- Redirect URLs: `https://lu4-rb.vercel.app/**`, `http://localhost:3000/**`

SQL (если ещё не применяли):

1. `supabase/apply_checked_at.sql`
2. `supabase/apply_notifications.sql`
3. `supabase/apply_realtime.sql` — Live-синхронизация таблицы без F5
4. `supabase/apply_alive_at.sql` — статус «Живой» (до смены статуса)

## Оповещения (Telegram + Push)

Cron раз в минуту бьёт `/api/cron/check-respawns` и при переходе статуса в **возможно реснулся** / **100% реснулся** шлёт:

- сообщение в Telegram-чат
- Web Push всем подписанным браузерам

### Env

```
AUTH_USER=                   # клановый логин (используется и cron)
AUTH_PASSWORD=
CRON_SECRET=                 # любой длинный секрет
TELEGRAM_BOT_TOKEN=          # от @BotFather
TELEGRAM_CHAT_ID=            # id чата/группы
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
```

Cron входит через `AUTH_USER`/`AUTH_PASSWORD` (service_role не нужен).

### Telegram

1. Создай бота у [@BotFather](https://t.me/BotFather) → получи token  
2. Напиши боту `/start` (или добавь в группу)  
3. Узнай `chat_id` (например через `@userinfobot` или API `getUpdates`)  
4. Пропиши `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в `.env` / Vercel  

### Push

На сайте нажми **Push вкл** (после логина) и разреши уведомления в браузере.

### Cron

На Hobby Vercel минутный cron недоступен. Настрой внешний ping:

1. Запусти локально: `python scripts/print_cron_url.py` — скопируй URL  
2. Зайди на [cron-job.org](https://cron-job.org) → Create cronjob  
3. **URL** = из скрипта  
4. **Schedule** = Every minute (`* * * * *`)  
5. **Request method** = GET  
6. Save / Enable  

Проверка вручную: открой тот же URL в браузере — должен быть JSON `{"ok":true,...}`.

## Git Flow

| Ветка | Назначение |
|-------|------------|
| `main` | production |
| `develop` | интеграция |
| `feature/*` | фичи от `develop` |
| `fix/*` | хотфиксы от `main` |

Коммиты: Conventional Commits (`feat:`, `fix:`, `chore:`).

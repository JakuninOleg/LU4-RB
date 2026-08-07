# LU4-RB

Трекер респауна рейд-боссов Lineage 2 (LU4).

**Production:** https://lu4-rb.vercel.app

## Стек

- Next.js (App Router) + TypeScript + Tailwind CSS
- shadcn/ui
- Supabase (Auth + Postgres)
- Деплой: Vercel

## Быстрый старт

```bash
npm install
cp .env.example .env.local
# заполните NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
npm run dev
```

В Supabase Auth → URL Configuration добавьте:

- Site URL: `https://lu4-rb.vercel.app`
- Redirect URLs: `https://lu4-rb.vercel.app/**`, `http://localhost:3000/**`

## Git Flow

| Ветка | Назначение |
|-------|------------|
| `main` | production (Vercel Production) |
| `develop` | интеграция (Preview) |
| `feature/*` | фичи от `develop` |
| `fix/*` | хотфиксы от `main` |

1. Фичи: `git checkout develop && git checkout -b feature/name`
2. PR `feature/*` → `develop`
3. Релиз: PR `develop` → `main`
4. Hotfix: `fix/*` от `main`, затем влить и в `develop`

Коммиты: Conventional Commits (`feat:`, `fix:`, `chore:`).

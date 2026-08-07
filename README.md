# LU4-RB

Трекер респауна рейд-боссов Lineage 2 (LU4).

## Стек

- Next.js (App Router) + TypeScript + Tailwind CSS
- shadcn/ui
- Supabase (Auth + Postgres)
- Деплой: Vercel

## Быстрый старт

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Git Flow

| Ветка | Назначение |
|-------|------------|
| `main` | production (Vercel Production) |
| `develop` | интеграция (Preview) |
| `feature/*` | фичи от `develop` |
| `fix/*` | хотфиксы от `main` |

1. Фичи: `git checkout develop && git checkout -b feature/name`
2. PR `feature/*` -> `develop`
3. Релиз: PR `develop` -> `main`
4. Hotfix: `fix/*` from `main`, then merge back into `develop`

Коммиты: Conventional Commits (`feat:`, `fix:`, `chore:`).

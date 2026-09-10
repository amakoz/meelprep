# Supabase

## Migrations (run in order)

Apply in the Supabase SQL editor (CLI optional):

| File | Purpose |
| --- | --- |
| [`0001_init.sql`](../../supabase/migrations/0001_init.sql) | Enums, tables, RLS, diet tags seed, demo profile, pgvector, Realtime publication |
| [`0002_recipes_write.sql`](../../supabase/migrations/0002_recipes_write.sql) | Allow demo user to insert/update name-only recipes (favorites before ingredients) |
| [`0003_shopping_used_for.sql`](../../supabase/migrations/0003_shopping_used_for.sql) | `shopping_list_items.used_for text[]` for meal labels on ingredients |

After schema changes, update [`src/lib/supabase/database.types.ts`](../../src/lib/supabase/database.types.ts) if columns/enums changed.

## Demo user

- Seeded profile id: `00000000-0000-4000-8000-000000000001` (override via `DEMO_USER_ID`).
- `current_app_user_id()` returns `auth.uid()` or falls back to demo id — no login UI yet.
- All user-owned tables use RLS policies on `current_app_user_id()`.

## Clients

| Helper | File | Use |
| --- | --- | --- |
| `createServerSupabase()` | `server.ts` | RSC / Server Actions with cookies |
| `createBrowserSupabase()` | `client.ts` | Client Realtime subscriptions |
| `createWriteSupabase()` | `server.ts` | Writes: service role if set, else publishable key |
| `createAdminSupabase()` | `server.ts` | Service role only |

Session refresh: [`src/proxy.ts`](../../src/proxy.ts) (Next.js 16 proxy, not middleware).

## Core tables (mental model)

- **menus** — one prep batch; `meals_per_slot` jsonb; `status` drives UI.
- **menu_meals** — grid cells; `display_name` is canonical for UI and shopping.
- **recipes** + **recipe_ingredients** + **ingredients** — shared cache for shopping merge.
- **shopping_lists** / **shopping_list_items** — output; `is_manual` for extras; `used_for` for meal attribution.
- **generation_jobs** — audit trail for webhook runs.

## Realtime

Publication includes `menus`, `menu_meals`, `shopping_lists`, `shopping_list_items`, `generation_jobs`.

`PlannerApp` subscribes to changes for the active `menu_id` and calls `getPlannerSnapshot` to refresh.

## Common failures

| Symptom | Likely cause |
| --- | --- |
| Heart / favorite fails RLS on `recipes` | Run `0002_recipes_write.sql` |
| Shopping items missing meal labels | Run `0003`; n8n must set `used_for` or link `ingredient_id` + recipes |
| Writes silently fail | Missing service role for server paths that bypass RLS |
| UI stuck on generating | n8n returned 200 before DB writes; check job row + 10s timeout recovery |

## In-memory fallback

If Supabase env is unset, `repo.ts` uses `src/data/memory-store.ts` with the same DTO shape. Useful for UI-only work; do not treat it as production behavior.

# Architecture

## Pattern: thin webhook layer

MeelPrep follows an **event-driven, thin UI** pattern suitable for AI automation portfolios:

- **Next.js** renders the board and fires webhooks.
- **Supabase** stores menus, meals, recipes, jobs, and shopping lists.
- **n8n** (or the in-repo mock) performs generation, aggregation, and future embedding/LLM work.

The UI never blocks on long AI work: Server Actions enqueue a `generation_jobs` row, POST to n8n, and return. The client uses **Supabase Realtime** plus **polling** while status is `generating`.

## Two-phase generation (cost control)

| Phase | When | n8n action | Writes |
| --- | --- | --- | --- |
| Names | User clicks Generate (or regenerate) | `generate_menu` / `regenerate_meals` | `menu_meals.display_name`, `status=review` |
| Shopping | User approves or Build shopping list | `generate_shopping` | `shopping_list_items`, `status=shopping` |

Ingredients are **not** required during name review. Shopping scales `recipe_ingredients` by `menus.portions` or creates recipes on cache miss.

## Skip generation path

When **every** `menu_meals` row has `source != empty` on a **draft** menu, the AI panel offers **Build shopping list** instead of **Generate empty slots**. That path:

1. Persists settings via `saveSettingsAction`.
2. Calls `approveAndShop` → `generate_shopping` webhook (same as post-review approve).

No `generate_menu` job runs.

## Data access layers

```
page.tsx (RSC)
  └─ getPlannerDTO(menuId?)     [dal.ts, cached]
       └─ loadPlanner           [repo.ts]
            └─ Supabase or memory-store

Server Actions
  └─ dal.ts (orchestration, emitN8nJob, recover)
       └─ repo.ts (SQL)
       └─ lib/n8n/client.ts (webhook)
```

**Rule:** Client components never import `repo.ts` or `dal.ts`. They call Server Actions only.

## Mock vs live n8n

| | Mock | Live n8n |
| --- | --- | --- |
| Trigger | `N8N_WEBHOOK_URL` contains `/api/mock-n8n` | External webhook URL (e.g. `localhost:5678`) |
| Execution | `processN8nJob` in-process via `after()` | n8n workflow nodes |
| Catalog | Static `CATALOG_MEALS` | LLM + optional pgvector cache |

Both must write identical table shapes. The UI reads DTOs from Postgres — if n8n skips columns (e.g. `used_for`), features silently degrade unless the app rehydrates (shopping meal labels do this from `recipe_ingredients`).

## Key invariants

1. Generate payload includes only **empty** slots; `filled[]` is context.
2. Renamed meals (`display_name` ≠ recipe name) → shopping cache miss.
3. New menu must **redirect** to `/?menu=<new-id>`.
4. `revalidatePath("/")` alone with an old `?menu=` query reloads the wrong menu.

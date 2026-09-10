# n8n integration

Source of truth for payloads: [`src/lib/n8n/contracts.ts`](../../src/lib/n8n/contracts.ts).

## Endpoint

- **Method:** POST
- **Body:** JSON with required `action`, `job_id`, `menu_id`, `user_id`
- **Header:** `x-webhook-secret` when `N8N_WEBHOOK_SECRET` is configured
- **Response:** App expects success quickly; heavy work runs async in n8n. Prefer **Respond when last node finishes** (or equivalent) so DB writes complete before the UI timeout (10s).

## Actions

### `generate_menu`

Fills **empty** slots with display names only.

```json
{
  "job_id": "uuid",
  "menu_id": "uuid",
  "user_id": "uuid",
  "action": "generate_menu",
  "portions": 4,
  "diet_tags": ["vegetarian"],
  "filled": [
    { "slot": "breakfast", "position": 0, "name": "Overnight oats", "recipe_id": "…" }
  ],
  "empty": [{ "slot": "dinner", "position": 0 }]
}
```

**Writes:** update `menu_meals` for each empty slot (`display_name`, `source=generated`, `status=ready`); set `menus.status=review`; set `generation_jobs.status=done`.

**Do not:** send recipe instructions or ingredient lists to the LLM for this action.

### `regenerate_meals`

Replace selected meals; optional natural-language `note`.

```json
{
  "action": "regenerate_meals",
  "menu_id": "uuid",
  "user_id": "uuid",
  "job_id": "uuid",
  "note": "no broccoli, more protein",
  "diet_tags": ["vegetarian"],
  "keep_names": ["Overnight oats"],
  "replace": [
    {
      "menu_meal_id": "uuid",
      "slot": "dinner",
      "position": 0,
      "current_name": "Broccoli pasta"
    }
  ]
}
```

### `generate_shopping`

Runs after approve or skip-to-shop.

```json
{
  "action": "generate_shopping",
  "menu_id": "uuid",
  "user_id": "uuid",
  "job_id": "uuid",
  "portions": 4,
  "meals": [
    {
      "menu_meal_id": "uuid",
      "recipe_id": "uuid-or-null",
      "display_name": "Greek salad",
      "slot": "supper"
    }
  ]
}
```

**Writes:**

- Upsert `shopping_lists` for `menu_id` (`status=ready` when done).
- Replace non-manual `shopping_list_items`.
- Aggregate ingredients from `recipe_ingredients` × `portions`.
- Set `menus.status=shopping`.

## `used_for` on shopping items

Migration [`0003_shopping_used_for.sql`](../../supabase/migrations/0003_shopping_used_for.sql) adds:

```sql
used_for text[] not null default '{}'
```

When inserting aggregated rows, set meal names that contributed each ingredient:

```json
{
  "name": "lemon",
  "quantity": 2,
  "unit": "pcs",
  "category": "produce",
  "used_for": ["Greek salad", "Roast chicken"]
}
```

In the Supabase node, map as a **Postgres text array**, not a comma-separated string.

If n8n omits `used_for`, the app still tries to **rehydrate** labels from `recipe_ingredients` + menu meals when loading the list (`attachUsedFor` in `repo.ts`). Explicit writes from n8n are preferred.

## n8n ↔ Supabase tips

- Filters: use PostgREST style — separate conditions (`menu_id=eq.<uuid>`, `slot=eq.dinner`), not SQL fragments.
- After Split/Code nodes, reference webhook body with `$('Webhook').first().json.body.menu_id`.
- Do not send `recipe_id` as the string `"null"`; omit the field when null.
- Stringify objects in LLM prompts (`JSON.stringify`); raw objects become `[object Object]`.

## Local mock

- Route: [`src/app/api/mock-n8n/route.ts`](../../src/app/api/mock-n8n/route.ts)
- Handler: [`src/lib/n8n/handlers.ts`](../../src/lib/n8n/handlers.ts)
- Uses `CATALOG_MEALS` for names and ingredients; implements all three actions including `used_for` aggregation.

## Future: vector cache

Schema has `embedding vector(1536)` on `recipes` and `ingredients` with HNSW indexes. Intended flow in n8n:

1. Embed query from slot + diet tags + exclude list.
2. Search `recipes` above similarity threshold.
3. LLM only on cache miss; write embedding on insert.

Not implemented in the mock.

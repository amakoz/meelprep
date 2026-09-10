# UI flows & components

Single route: `/` with optional `?menu=<uuid>`.

## Layout (sidebar)

1. **History** — `<select>` of past menus (`HistoryPanel.tsx`), above AI panel.
2. **AI planner** — portions, slot counts, diet tags, primary action (`AiPanel.tsx`).
3. **Board** — Breakfast / Dinner / Supper (`DayBoard.tsx`, `MealSlot.tsx`).
4. **Review bar** — when `status` is `review` or `generating` (`ReviewBar.tsx`).
5. **Shopping** — when list exists (`ShoppingPanel.tsx`).

## Primary actions

| User action | Server Action | Notes |
| --- | --- | --- |
| Change settings | `saveSettingsAction` | Debounced 350ms; resizes empty slots |
| Generate empty slots | `generateMenuAction` | Only empty cells; skips if none (→ review) |
| Build shopping list | `approveMenuAction` | When `isBoardFilled` on draft |
| Regenerate selected | `regenerateMealsAction` | Requires selected meal ids + optional note |
| Approve & shop | `approveMenuAction` | From review bar |
| Plus → favorite / manual name | `assignFavoriteAction` / `renameMealAction` | `FavoritesPicker.tsx` |
| Heart | `toggleFavoriteAction` | Creates name-only recipe if needed |
| New menu | `startNewMenuAction` | **redirect** to new `?menu=` |
| History select | client `router.replace` + snapshot | |

## AI panel button states

| Condition | Label | Icon |
| --- | --- | --- |
| Locked (approved/shopping) | Menu already approved | Spark |
| Busy | Working… | Spark |
| All slots filled on draft | Build shopping list | Bag |
| Otherwise | Generate empty slots | Spark |

## Shopping list display

Each item shows:

- Editable name and quantity
- Subline `(Meal A, Meal B)` from `usedFor` when present
- Copy includes `name (meals): qty unit`

Manual extras have `is_manual=true` and empty `usedFor`.

## Client refresh strategy

While `generating`, `regenerating`, or shopping `generating`:

- Poll ~900ms
- Realtime on menu/meals/shopping tables
- After 10s without completion → `recoverWaitingAction` + user-visible error

## Styling

Tailwind 4 + CSS variables in `src/app/globals.css` (`--accent`, `--card`, `--line`, etc.). Match existing rounded-3xl cards and compact sidebar patterns.

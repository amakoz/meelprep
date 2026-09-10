"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignFavoriteAction,
  approveMenuAction,
  clearSlotAction,
  generateMenuAction,
  getPlannerSnapshot,
  recoverWaitingAction,
  regenerateMealsAction,
  renameMealAction,
  saveSettingsAction,
  startNewMenuAction,
  toggleFavoriteAction,
} from "@/app/actions/menu";
import {
  addShoppingItemAction,
  updateShoppingItemAction,
} from "@/app/actions/shopping";
import { AiPanel } from "@/components/planner/AiPanel";
import { DayBoard } from "@/components/planner/DayBoard";
import { FavoritesPicker } from "@/components/planner/FavoritesPicker";
import { HistoryPanel } from "@/components/planner/HistoryPanel";
import { PlusIcon } from "@/components/planner/Icons";
import { ReviewBar } from "@/components/planner/ReviewBar";
import { ShoppingPanel } from "@/components/planner/ShoppingPanel";
import { isPlanningLocked } from "@/lib/menu-utils";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { MealSlot, MealsPerSlot, MenuMeal, PlannerDTO } from "@/lib/types";

type Props = { initial: PlannerDTO };

const JOB_TIMEOUT_MS = 10_000;

function isBusy(data: PlannerDTO) {
  return (
    data.menu.status === "generating" ||
    data.meals.some((meal) => meal.status === "regenerating") ||
    data.shoppingList?.status === "generating"
  );
}

function formatMenuDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(iso));
}

export function PlannerApp({ initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [picker, setPicker] = useState<MenuMeal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const settingsTimer = useRef<number | null>(null);
  const menuIdRef = useRef(data.menu.id);
  menuIdRef.current = data.menu.id;

  useEffect(() => {
    setData(initial);
    menuIdRef.current = initial.menu.id;
    setSelectedIds([]);
    setNote("");
  }, [initial.menu.id]);
  const busyFlag = isBusy(data);
  const locked = isPlanningLocked(data.menu.status);

  async function refresh(menuId = menuIdRef.current) {
    const next = await getPlannerSnapshot(menuId);
    setData(next);
  }

  function openMenu(menuId: string) {
    menuIdRef.current = menuId;
    router.replace(`/?menu=${menuId}`, { scroll: false });
    setSelectedIds([]);
    setNote("");
    setError(null);
    startTransition(async () => {
      await refresh(menuId);
    });
  }

  useEffect(() => {
    if (!busyFlag) return;
    const poll = window.setInterval(() => {
      void refresh();
    }, 900);
    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        await recoverWaitingAction(data.menu.id);
        setError("No response from n8n yet. Try again when the workflow is ready.");
        await refresh();
      });
    }, JOB_TIMEOUT_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(timeout);
    };
  }, [busyFlag, data.menu.id]);

  useEffect(() => {
    if (!data.usingSupabase) return;
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    const channel = supabase
      .channel(`menu-${data.menu.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menus",
          filter: `id=eq.${data.menu.id}`,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu_meals",
          filter: `menu_id=eq.${data.menu.id}`,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_lists",
          filter: `menu_id=eq.${data.menu.id}`,
        },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [data.usingSupabase, data.menu.id]);

  function queueSettings(next: {
    portions: number;
    mealsPerSlot: MealsPerSlot;
    dietTags: string[];
  }) {
    if (locked) return;
    setData((current) => ({
      ...current,
      menu: {
        ...current.menu,
        portions: next.portions,
        mealsPerSlot: next.mealsPerSlot,
        dietTags: next.dietTags,
      },
    }));
    if (busyFlag) return;
    if (settingsTimer.current) window.clearTimeout(settingsTimer.current);
    settingsTimer.current = window.setTimeout(() => {
      startTransition(async () => {
        await saveSettingsAction({
          menuId: data.menu.id,
          ...next,
        });
        await refresh();
      });
    }, 350);
  }

  const busy = pending || busyFlag;
  const showReview =
    !locked &&
    (data.menu.status === "review" || data.menu.status === "generating");
  const portions = data.menu.portions;
  const mealsPerSlot = data.menu.mealsPerSlot;
  const dietTags = data.menu.dietTags;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            MeelPrep
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {locked ? "Approved menu" : "Today's board"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {formatMenuDate(data.menu.createdAt)}
            {locked
              ? " · Pick a past menu, or start a new one."
              : " · Fill breakfast, dinner, and supper. Generate the rest, then shop."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium capitalize text-accent">
            {data.menu.status}
            {data.usingSupabase ? "" : " · local store"}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await startNewMenuAction(data.menu.id);
                if (result && "error" in result) setError(result.error);
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New menu
          </button>
        </div>
      </header>

      {error ? (
        <p className="mb-6 rounded-2xl border border-line bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <HistoryPanel
            items={data.history}
            currentId={data.menu.id}
            onSelect={openMenu}
          />
          <AiPanel
            portions={portions}
            mealsPerSlot={mealsPerSlot}
            dietTags={dietTags}
            availableTags={data.dietTags}
            busy={busy}
            locked={locked}
            onPortions={(value) => {
              const next = Math.max(1, value || 1);
              queueSettings({ portions: next, mealsPerSlot, dietTags });
            }}
            onCount={(slot, value) => {
              const next = {
                ...mealsPerSlot,
                [slot]: Math.min(6, Math.max(1, value || 1)),
              };
              queueSettings({ portions, mealsPerSlot: next, dietTags });
            }}
            onToggleTag={(slug) => {
              const next = dietTags.includes(slug)
                ? dietTags.filter((tag) => tag !== slug)
                : [...dietTags, slug];
              queueSettings({ portions, mealsPerSlot, dietTags: next });
            }}
            onGenerate={() => {
              setError(null);
              startTransition(async () => {
                const result = await generateMenuAction({
                  menuId: data.menu.id,
                  portions,
                  mealsPerSlot,
                  dietTags,
                });
                if (result && "error" in result) setError(result.error);
                await refresh();
              });
            }}
          />
        </div>

        <div className="space-y-6">
          <DayBoard
            meals={data.meals}
            status={data.menu.status}
            selectedIds={selectedIds}
            readOnly={locked}
            onPlus={(meal) => setPicker(meal)}
            onSelect={(mealId, selected) => {
              setSelectedIds((current) =>
                selected
                  ? [...current, mealId]
                  : current.filter((id) => id !== mealId),
              );
            }}
            onRename={(mealId, name) => {
              startTransition(async () => {
                await renameMealAction(mealId, name);
                await refresh();
              });
            }}
            onClear={(mealId) => {
              startTransition(async () => {
                await clearSlotAction(mealId);
                setSelectedIds((current) =>
                  current.filter((id) => id !== mealId),
                );
                await refresh();
              });
            }}
            onFavorite={(meal) => {
              startTransition(async () => {
                const result = await toggleFavoriteAction(meal.id);
                if (result && "error" in result) setError(result.error);
                await refresh();
              });
            }}
          />

          {showReview ? (
            <ReviewBar
              selectedCount={selectedIds.length}
              note={note}
              busy={busy}
              onNote={setNote}
              onRegenerate={() => {
                setError(null);
                startTransition(async () => {
                  const result = await regenerateMealsAction({
                    menuId: data.menu.id,
                    mealIds: selectedIds,
                    note,
                  });
                  setSelectedIds([]);
                  if (result && "error" in result) setError(result.error);
                  await refresh();
                });
              }}
              onApprove={() => {
                setError(null);
                startTransition(async () => {
                  const result = await approveMenuAction(data.menu.id);
                  setSelectedIds([]);
                  if (result && "error" in result) setError(result.error);
                  await refresh();
                });
              }}
            />
          ) : null}

          {data.shoppingList ? (
            <ShoppingPanel
              list={data.shoppingList}
              onAdd={(itemName, quantity, unit) => {
                startTransition(async () => {
                  await addShoppingItemAction({
                    shoppingListId: data.shoppingList!.id,
                    name: itemName,
                    quantity,
                    unit,
                  });
                  await refresh();
                });
              }}
              onRename={(itemId, itemName) => {
                startTransition(async () => {
                  await updateShoppingItemAction({ itemId, name: itemName });
                  await refresh();
                });
              }}
              onQuantity={(itemId, quantity) => {
                startTransition(async () => {
                  await updateShoppingItemAction({ itemId, quantity });
                  await refresh();
                });
              }}
            />
          ) : null}
        </div>
      </div>

      {picker && !locked ? (
        <FavoritesPicker
          slot={picker.slot as MealSlot}
          favorites={data.favorites}
          onClose={() => setPicker(null)}
          onPick={(recipeId) => {
            const mealId = picker.id;
            setPicker(null);
            startTransition(async () => {
              await assignFavoriteAction(mealId, recipeId);
              await refresh();
            });
          }}
          onManual={(name) => {
            const mealId = picker.id;
            setPicker(null);
            startTransition(async () => {
              await renameMealAction(mealId, name);
              await refresh();
            });
          }}
        />
      ) : null}
    </div>
  );
}

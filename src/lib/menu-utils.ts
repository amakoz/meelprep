import {
  DEFAULT_MEALS_PER_SLOT,
  MEAL_SLOTS,
} from "@/lib/constants";
import type { MealSlot, MealsPerSlot, MenuStatus } from "@/lib/types";

export function clampCount(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(6, Math.max(1, Math.round(value)));
}

export function normalizeMealsPerSlot(value: unknown): MealsPerSlot {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    breakfast: clampCount(Number(raw.breakfast) || DEFAULT_MEALS_PER_SLOT.breakfast),
    dinner: clampCount(Number(raw.dinner) || DEFAULT_MEALS_PER_SLOT.dinner),
    supper: clampCount(Number(raw.supper) || DEFAULT_MEALS_PER_SLOT.supper),
  };
}

export function emptyMealFields() {
  return {
    recipe_id: null as string | null,
    display_name: null as string | null,
    source: "empty" as const,
    status: "empty" as const,
    regenerate_note: null as string | null,
  };
}

export function slotsToCreate(counts: MealsPerSlot) {
  return MEAL_SLOTS.flatMap((slot) =>
    Array.from({ length: counts[slot] }, (_, position) => ({ slot, position })),
  );
}

export function isNameDirty(displayName: string | null, recipeName: string | null) {
  if (!displayName) return false;
  if (!recipeName) return true;
  return displayName.trim().toLowerCase() !== recipeName.trim().toLowerCase();
}

export function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function requiredFilledCount(
  slot: MealSlot,
  currentMeals: { slot: MealSlot; source: string }[],
  requested: number,
) {
  const filled = currentMeals.filter(
    (meal) => meal.slot === slot && meal.source !== "empty",
  ).length;
  return Math.max(requested, filled);
}

export function isPlanningLocked(status: MenuStatus) {
  return status === "approved" || status === "shopping";
}

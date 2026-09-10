"use client";

import { MEAL_SLOTS, SLOT_LABELS } from "@/lib/constants";
import type { MealSlot, MenuMeal, MenuStatus } from "@/lib/types";
import { MealSlotCard, statusAllowsSelect } from "@/components/planner/MealSlot";

type Props = {
  meals: MenuMeal[];
  status: MenuStatus;
  selectedIds: string[];
  readOnly?: boolean;
  onPlus: (meal: MenuMeal) => void;
  onSelect: (mealId: string, selected: boolean) => void;
  onRename: (mealId: string, name: string) => void;
  onClear: (mealId: string) => void;
  onFavorite: (meal: MenuMeal) => void;
};

export function DayBoard({
  meals,
  status,
  selectedIds,
  readOnly = false,
  onPlus,
  onSelect,
  onRename,
  onClear,
  onFavorite,
}: Props) {
  return (
    <div className="space-y-6">
      {MEAL_SLOTS.map((slot: MealSlot) => {
        const slotMeals = meals
          .filter((meal) => meal.slot === slot)
          .sort((a, b) => a.position - b.position);
        return (
          <section key={slot}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                {SLOT_LABELS[slot]}
              </h2>
              <p className="text-xs text-muted">
                {slotMeals.filter((meal) => meal.source !== "empty").length}/
                {slotMeals.length} filled
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {slotMeals.map((meal) => (
                <MealSlotCard
                  key={meal.id}
                  meal={meal}
                  selectable={
                    !readOnly &&
                    statusAllowsSelect(status) &&
                    meal.source !== "empty"
                  }
                  selected={selectedIds.includes(meal.id)}
                  readOnly={readOnly}
                  onPlus={() => onPlus(meal)}
                  onSelect={(selected) => onSelect(meal.id, selected)}
                  onRename={(name) => onRename(meal.id, name)}
                  onClear={() => onClear(meal.id)}
                  onFavorite={() => onFavorite(meal)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

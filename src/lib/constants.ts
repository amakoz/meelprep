import type { IngredientCategory, MealSlot, MealsPerSlot } from "@/lib/types";

export const DEMO_USER_ID =
  process.env.DEMO_USER_ID ?? "00000000-0000-4000-8000-000000000001";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "dinner", "supper"];

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  dinner: "Dinner",
  supper: "Supper",
};

export const DEFAULT_PORTIONS = 4;

export const DEFAULT_MEALS_PER_SLOT: MealsPerSlot = {
  breakfast: 1,
  dinner: 1,
  supper: 1,
};

export const CATEGORY_ORDER: IngredientCategory[] = [
  "produce",
  "dairy",
  "meat",
  "bakery",
  "pantry",
  "frozen",
  "spices",
  "other",
];

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  produce: "Produce",
  dairy: "Dairy",
  meat: "Meat & fish",
  bakery: "Bakery",
  pantry: "Pantry",
  frozen: "Frozen",
  spices: "Spices",
  other: "Other",
};

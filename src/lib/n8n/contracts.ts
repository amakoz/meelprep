import type { MealSlot } from "@/lib/types";

export type FilledSlot = {
  slot: MealSlot;
  position: number;
  name: string;
  recipe_id: string | null;
};

export type EmptySlot = {
  slot: MealSlot;
  position: number;
};

export type GenerateMenuPayload = {
  job_id: string;
  menu_id: string;
  user_id: string;
  action: "generate_menu";
  portions: number;
  diet_tags: string[];
  filled: FilledSlot[];
  empty: EmptySlot[];
};

export type RegenerateMealsPayload = {
  job_id: string;
  menu_id: string;
  user_id: string;
  action: "regenerate_meals";
  note: string;
  diet_tags: string[];
  keep_names: string[];
  replace: {
    menu_meal_id: string;
    slot: MealSlot;
    position: number;
    current_name: string | null;
  }[];
};

export type GenerateShoppingPayload = {
  job_id: string;
  menu_id: string;
  user_id: string;
  action: "generate_shopping";
  portions: number;
  meals: {
    menu_meal_id: string;
    recipe_id: string | null;
    display_name: string;
    slot: MealSlot;
  }[];
};

export type N8nPayload =
  | GenerateMenuPayload
  | RegenerateMealsPayload
  | GenerateShoppingPayload;

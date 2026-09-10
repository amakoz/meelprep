export type MealSlot = "breakfast" | "dinner" | "supper";

export type MenuStatus =
  | "draft"
  | "generating"
  | "review"
  | "approved"
  | "shopping";

export type MealSource = "empty" | "favorite" | "generated" | "manual";

export type MealStatus = "empty" | "ready" | "regenerating";

export type JobType = "generate_menu" | "regenerate_meals" | "generate_shopping";

export type JobStatus = "queued" | "running" | "done" | "error";

export type ShoppingStatus = "generating" | "ready";

export type IngredientCategory =
  | "produce"
  | "dairy"
  | "meat"
  | "bakery"
  | "pantry"
  | "frozen"
  | "spices"
  | "other";

export type MealsPerSlot = Record<MealSlot, number>;

export type DietTag = {
  slug: string;
  label: string;
};

export type FavoriteRecipe = {
  recipeId: string;
  name: string;
  description: string;
  slot: MealSlot | null;
  hasIngredients: boolean;
};

export type MenuMeal = {
  id: string;
  menuId: string;
  slot: MealSlot;
  position: number;
  recipeId: string | null;
  recipeName: string | null;
  displayName: string | null;
  source: MealSource;
  status: MealStatus;
  hasIngredients: boolean;
  isFavorite: boolean;
};

export type Menu = {
  id: string;
  status: MenuStatus;
  portions: number;
  mealsPerSlot: MealsPerSlot;
  dietTags: string[];
  approvedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type MenuHistoryItem = {
  id: string;
  status: MenuStatus;
  createdAt: string;
  approvedAt: string | null;
  archivedAt: string | null;
  mealNames: string[];
  shoppingStatus: ShoppingStatus | null;
  shoppingItemCount: number;
};

export type ShoppingItem = {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity: number;
  unit: string;
  isManual: boolean;
  sortOrder: number;
};

export type ShoppingList = {
  id: string;
  menuId: string;
  status: ShoppingStatus;
  items: ShoppingItem[];
};

export type PlannerDTO = {
  usingSupabase: boolean;
  dietTags: DietTag[];
  favorites: FavoriteRecipe[];
  menu: Menu;
  meals: MenuMeal[];
  shoppingList: ShoppingList | null;
  history: MenuHistoryItem[];
};

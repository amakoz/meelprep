import { DEMO_USER_ID } from "@/lib/constants";
import { CATALOG_MEALS } from "@/lib/n8n/catalog";
import type {
  IngredientCategory,
  JobStatus,
  JobType,
  MealSlot,
  MealSource,
  MealStatus,
  MenuStatus,
  ShoppingStatus,
} from "@/lib/types";

export type IngredientRow = {
  id: string;
  name: string;
  category: IngredientCategory;
  default_unit: string;
};

export type RecipeRow = {
  id: string;
  name: string;
  description: string;
  slot: MealSlot | null;
  diet_tags: string[];
  has_ingredients: boolean;
  created_by: string | null;
};

export type RecipeIngredientRow = {
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
};

export type FavoriteRow = {
  user_id: string;
  recipe_id: string;
  slot: MealSlot | null;
};

export type MenuRow = {
  id: string;
  user_id: string;
  status: MenuStatus;
  portions: number;
  meals_per_slot: { breakfast: number; dinner: number; supper: number };
  diet_tags: string[];
  approved_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MenuMealRow = {
  id: string;
  menu_id: string;
  slot: MealSlot;
  position: number;
  recipe_id: string | null;
  display_name: string | null;
  source: MealSource;
  status: MealStatus;
  regenerate_note: string | null;
};

export type ShoppingListRow = {
  id: string;
  menu_id: string;
  user_id: string;
  status: ShoppingStatus;
};

export type ShoppingItemRow = {
  id: string;
  shopping_list_id: string;
  ingredient_id: string | null;
  name: string;
  category: IngredientCategory;
  quantity: number;
  unit: string;
  is_manual: boolean;
  sort_order: number;
};

export type JobRow = {
  id: string;
  menu_id: string;
  type: JobType;
  status: JobStatus;
  request: Record<string, unknown>;
  error: string | null;
};

export type MemoryStore = {
  dietTags: { slug: string; label: string }[];
  ingredients: Map<string, IngredientRow>;
  recipes: Map<string, RecipeRow>;
  recipeIngredients: RecipeIngredientRow[];
  favorites: FavoriteRow[];
  menus: Map<string, MenuRow>;
  meals: Map<string, MenuMealRow>;
  shoppingLists: Map<string, ShoppingListRow>;
  shoppingItems: Map<string, ShoppingItemRow>;
  jobs: Map<string, JobRow>;
};

const globalForStore = globalThis as unknown as { __meelprepStore?: MemoryStore };

function seedIngredient(
  id: string,
  name: string,
  category: IngredientCategory,
  unit: string,
): IngredientRow {
  return { id, name, category, default_unit: unit };
}

function createSeedStore(): MemoryStore {
  const ingredients = new Map<string, IngredientRow>();
  const recipes = new Map<string, RecipeRow>();
  const recipeIngredients: RecipeIngredientRow[] = [];

  for (const meal of CATALOG_MEALS) {
    const recipeId =
      meal.name === "Overnight oats"
        ? "20000000-0000-4000-8000-000000000001"
        : meal.name === "Lentil stew"
          ? "20000000-0000-4000-8000-000000000002"
          : meal.name === "Tomato soup"
            ? "20000000-0000-4000-8000-000000000003"
            : crypto.randomUUID();

    recipes.set(recipeId, {
      id: recipeId,
      name: meal.name,
      description: meal.description,
      slot: meal.slot,
      diet_tags: meal.dietTags,
      has_ingredients: true,
      created_by: DEMO_USER_ID,
    });

    for (const item of meal.ingredients) {
      let ingredient = [...ingredients.values()].find(
        (row) => row.name === item.name,
      );
      if (!ingredient) {
        ingredient = seedIngredient(
          crypto.randomUUID(),
          item.name,
          item.category,
          item.unit,
        );
        ingredients.set(ingredient.id, ingredient);
      }
      recipeIngredients.push({
        recipe_id: recipeId,
        ingredient_id: ingredient.id,
        quantity: item.quantity,
        unit: item.unit,
      });
    }
  }

  const favoriteRecipeIds = [...recipes.values()]
    .filter((recipe) =>
      ["Overnight oats", "Lentil stew", "Tomato soup"].includes(recipe.name),
    )
    .map((recipe) => recipe.id);

  return {
    dietTags: [
      { slug: "vegetarian", label: "Vegetarian" },
      { slug: "vegan", label: "Vegan" },
      { slug: "low_fat", label: "Low fat" },
      { slug: "high_protein", label: "High protein" },
      { slug: "gluten_free", label: "Gluten free" },
      { slug: "dairy_free", label: "Dairy free" },
    ],
    ingredients,
    recipes,
    recipeIngredients,
    favorites: favoriteRecipeIds.map((recipeId) => ({
      user_id: DEMO_USER_ID,
      recipe_id: recipeId,
      slot: recipes.get(recipeId)?.slot ?? null,
    })),
    menus: new Map(),
    meals: new Map(),
    shoppingLists: new Map(),
    shoppingItems: new Map(),
    jobs: new Map(),
  };
}

export function getMemoryStore(): MemoryStore {
  if (!globalForStore.__meelprepStore) {
    globalForStore.__meelprepStore = createSeedStore();
  }
  return globalForStore.__meelprepStore;
}

export function nowIso() {
  return new Date().toISOString();
}

import "server-only";

import { DEMO_USER_ID } from "@/lib/constants";
import { pickCatalogMeals } from "@/lib/n8n/catalog";
import type { N8nPayload } from "@/lib/n8n/contracts";
import type { IngredientCategory } from "@/lib/types";
import {
  ensureMealRecipeForShopping,
  fillGeneratedSlots,
  getMenuMeals,
  getMenuSnapshot,
  getRecipeIngredients,
  setJobStatus,
  setMenuStatus,
  upsertShoppingListForMenu,
} from "@/data/repo";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processN8nJob(payload: N8nPayload) {
  await setJobStatus(payload.job_id, "running");
  await delay(700);

  try {
    if (payload.action === "generate_menu") {
      await handleGenerateMenu(payload);
    } else if (payload.action === "regenerate_meals") {
      await handleRegenerate(payload);
    } else {
      await handleShopping(payload);
    }
    await setJobStatus(payload.job_id, "done");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown job error";
    await setJobStatus(payload.job_id, "error", message);
    throw error;
  }
}

async function handleGenerateMenu(
  payload: Extract<N8nPayload, { action: "generate_menu" }>,
) {
  const { meals } = await getMenuSnapshot(payload.menu_id, payload.user_id);
  const exclude = [
    ...payload.filled.map((item) => item.name),
    ...meals
      .map((meal) => meal.displayName)
      .filter((name): name is string => Boolean(name)),
  ];
  const assignments = [];

  for (const empty of payload.empty) {
    const current = meals.find(
      (meal) => meal.slot === empty.slot && meal.position === empty.position,
    );
    if (!current || current.source !== "empty") continue;
    const [catalogMeal] = pickCatalogMeals({
      slot: empty.slot,
      count: 1,
      excludeNames: exclude,
      dietTags: payload.diet_tags,
    });
    if (!catalogMeal) continue;
    exclude.push(catalogMeal.name);
    assignments.push({ mealId: current.id, catalogMeal });
  }

  await fillGeneratedSlots(assignments);
  await setMenuStatus(payload.menu_id, "review");
}

async function handleRegenerate(
  payload: Extract<N8nPayload, { action: "regenerate_meals" }>,
) {
  const exclude = [...payload.keep_names];
  const assignments = [];

  for (const target of payload.replace) {
    if (target.current_name) exclude.push(target.current_name);
    const [catalogMeal] = pickCatalogMeals({
      slot: target.slot,
      count: 1,
      excludeNames: exclude,
      dietTags: payload.diet_tags,
      note: payload.note,
    });
    if (!catalogMeal) continue;
    exclude.push(catalogMeal.name);
    assignments.push({ mealId: target.menu_meal_id, catalogMeal });
  }

  await fillGeneratedSlots(assignments);
  await setMenuStatus(payload.menu_id, "review");
}

async function handleShopping(
  payload: Extract<N8nPayload, { action: "generate_shopping" }>,
) {
  const meals = await getMenuMeals(payload.menu_id, payload.user_id);
  const aggregated = new Map<
    string,
    {
      name: string;
      category: IngredientCategory;
      quantity: number;
      unit: string;
      ingredientId: string | null;
    }
  >();

  for (const meal of meals) {
    if (!meal.displayName && !meal.recipeName) continue;
    const recipe = await ensureMealRecipeForShopping(meal);
    if (!recipe) continue;
    const ingredients = await getRecipeIngredients(recipe.id);
    for (const ingredient of ingredients) {
      const key = `${ingredient.name}|${ingredient.unit}`;
      const current = aggregated.get(key);
      const quantity = ingredient.quantity * payload.portions;
      if (current) current.quantity += quantity;
      else {
        aggregated.set(key, {
          name: ingredient.name,
          category: ingredient.category,
          quantity,
          unit: ingredient.unit,
          ingredientId: ingredient.ingredientId,
        });
      }
    }
  }

  await upsertShoppingListForMenu({
    menuId: payload.menu_id,
    userId: payload.user_id ?? DEMO_USER_ID,
    items: [...aggregated.values()],
  });
  await setMenuStatus(payload.menu_id, "shopping");
}

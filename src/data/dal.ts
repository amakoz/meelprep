import "server-only";

import { cache } from "react";
import { DEMO_USER_ID } from "@/lib/constants";
import { normalizeMealsPerSlot } from "@/lib/menu-utils";
import { emitN8nJob } from "@/lib/n8n/client";
import type {
  GenerateMenuPayload,
  GenerateShoppingPayload,
  RegenerateMealsPayload,
} from "@/lib/n8n/contracts";
import {
  addManualShoppingItem,
  assignFavoriteToSlot,
  clearMealSlot,
  createJob,
  getMenuMeals,
  getMenuSnapshot,
  getPlannerDTO as loadPlanner,
  markShoppingGenerating,
  recoverWaitingMenu,
  renameMeal,
  saveMenuSettings,
  setJobStatus,
  setMealsRegenerating,
  setMenuStatus,
  startNewMenu as createNewMenu,
  toggleFavoriteForMeal,
  updateShoppingItem,
} from "@/data/repo";

export const getPlannerDTO = cache(async (menuId?: string) =>
  loadPlanner(DEMO_USER_ID, menuId),
);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "n8n request failed";
}

async function emitOrRecover(
  menuId: string,
  jobId: string,
  payload: Parameters<typeof emitN8nJob>[0],
) {
  try {
    await emitN8nJob(payload);
  } catch (error) {
    const message = errorMessage(error);
    await recoverWaitingMenu(menuId);
    await setJobStatus(jobId, "error", message);
    throw new Error(message);
  }
}

export async function recoverFromWaitingJob(menuId: string) {
  await recoverWaitingMenu(menuId);
}

export async function persistSettingsAndResize(input: {
  menuId: string;
  portions: number;
  mealsPerSlot: { breakfast: number; dinner: number; supper: number };
  dietTags: string[];
}) {
  await saveMenuSettings({
    menuId: input.menuId,
    portions: input.portions,
    mealsPerSlot: normalizeMealsPerSlot(input.mealsPerSlot),
    dietTags: input.dietTags,
  });
}

export async function fillSlotFromFavorite(mealId: string, recipeId: string) {
  await assignFavoriteToSlot({ mealId, recipeId });
}

export async function emptySlot(mealId: string) {
  await clearMealSlot(mealId);
}

export async function updateMealDisplayName(mealId: string, displayName: string) {
  await renameMeal({ mealId, displayName });
}

export async function startGenerateMenu(input: {
  menuId: string;
  portions: number;
  mealsPerSlot: { breakfast: number; dinner: number; supper: number };
  dietTags: string[];
}) {
  await persistSettingsAndResize(input);
  const meals = await getMenuMeals(input.menuId);
  const empty = meals
    .filter((meal) => meal.source === "empty")
    .map((meal) => ({ slot: meal.slot, position: meal.position }));
  const filled = meals
    .filter((meal) => meal.source !== "empty")
    .map((meal) => ({
      slot: meal.slot,
      position: meal.position,
      name: meal.displayName ?? meal.recipeName ?? "",
      recipe_id: meal.recipeId,
    }));

  if (empty.length === 0) {
    await setMenuStatus(input.menuId, "review");
    return;
  }

  const payload: GenerateMenuPayload = {
    job_id: "",
    menu_id: input.menuId,
    user_id: DEMO_USER_ID,
    action: "generate_menu",
    portions: input.portions,
    diet_tags: input.dietTags,
    filled,
    empty,
  };
  payload.job_id = await createJob({
    menuId: input.menuId,
    type: "generate_menu",
    request: payload,
  });
  await setMenuStatus(input.menuId, "generating");
  await emitOrRecover(input.menuId, payload.job_id, payload);
}

export async function startRegenerateMeals(input: {
  menuId: string;
  mealIds: string[];
  note: string;
}) {
  const meals = await getMenuMeals(input.menuId);
  const replace = meals.filter((meal) => input.mealIds.includes(meal.id));
  if (replace.length === 0) return;

  const keepNames = meals
    .filter((meal) => !input.mealIds.includes(meal.id) && meal.displayName)
    .map((meal) => meal.displayName as string);

  await setMealsRegenerating(input.mealIds);

  const snapshot = await getMenuSnapshot(input.menuId);
  const payload: RegenerateMealsPayload = {
    job_id: "",
    menu_id: input.menuId,
    user_id: DEMO_USER_ID,
    action: "regenerate_meals",
    note: input.note.trim(),
    diet_tags: snapshot.menu.dietTags,
    keep_names: keepNames,
    replace: replace.map((meal) => ({
      menu_meal_id: meal.id,
      slot: meal.slot,
      position: meal.position,
      current_name: meal.displayName,
    })),
  };
  payload.job_id = await createJob({
    menuId: input.menuId,
    type: "regenerate_meals",
    request: payload,
  });
  await setMenuStatus(input.menuId, "generating");
  await emitOrRecover(input.menuId, payload.job_id, payload);
}

export async function approveAndShop(menuId: string) {
  const snapshot = await getMenuSnapshot(menuId);
  const meals = snapshot.meals.filter((meal) => meal.displayName || meal.recipeName);
  if (meals.length === 0) throw new Error("Add or generate meals first");

  await setMenuStatus(menuId, "approved", {
    approved_at: new Date().toISOString(),
  });
  await markShoppingGenerating(menuId);

  const payload: GenerateShoppingPayload = {
    job_id: "",
    menu_id: menuId,
    user_id: DEMO_USER_ID,
    action: "generate_shopping",
    portions: snapshot.menu.portions,
    meals: meals.map((meal) => ({
      menu_meal_id: meal.id,
      recipe_id: meal.recipeId,
      display_name: meal.displayName ?? meal.recipeName ?? "",
      slot: meal.slot,
    })),
  };
  payload.job_id = await createJob({
    menuId,
    type: "generate_shopping",
    request: payload,
  });
  await setMenuStatus(menuId, "shopping");
  await emitOrRecover(menuId, payload.job_id, payload);
}

export async function startNewMenu(fromMenuId?: string) {
  return createNewMenu(DEMO_USER_ID, fromMenuId);
}

export async function favoriteMeal(mealId: string) {
  await toggleFavoriteForMeal(mealId);
}

export async function addExtraShoppingItem(
  shoppingListId: string,
  name: string,
  quantity: number,
  unit: string,
) {
  await addManualShoppingItem({ shoppingListId, name, quantity, unit });
}

export async function editShoppingItem(itemId: string, patch: { name?: string; quantity?: number }) {
  await updateShoppingItem({ itemId, ...patch });
}

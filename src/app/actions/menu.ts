"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  approveAndShop,
  emptySlot,
  favoriteMeal,
  fillSlotFromFavorite,
  persistSettingsAndResize,
  recoverFromWaitingJob,
  startGenerateMenu,
  startNewMenu,
  startRegenerateMeals,
  updateMealDisplayName,
  getPlannerDTO,
} from "@/data/dal";

function asActionError(error: unknown) {
  return {
    ok: false as const,
    error: error instanceof Error ? error.message : "Something went wrong",
  };
}

async function refresh() {
  revalidatePath("/");
}

export async function getPlannerSnapshot(menuId?: string) {
  return getPlannerDTO(menuId);
}

export async function recoverWaitingAction(menuId: string) {
  await recoverFromWaitingJob(menuId);
  await refresh();
}

export async function saveSettingsAction(input: {
  menuId: string;
  portions: number;
  mealsPerSlot: { breakfast: number; dinner: number; supper: number };
  dietTags: string[];
}) {
  await persistSettingsAndResize(input);
  await refresh();
}

export async function generateMenuAction(input: {
  menuId: string;
  portions: number;
  mealsPerSlot: { breakfast: number; dinner: number; supper: number };
  dietTags: string[];
}) {
  try {
    await startGenerateMenu(input);
    await refresh();
    return { ok: true as const };
  } catch (error) {
    await recoverFromWaitingJob(input.menuId).catch(() => undefined);
    await refresh();
    return asActionError(error);
  }
}

export async function assignFavoriteAction(mealId: string, recipeId: string) {
  await fillSlotFromFavorite(mealId, recipeId);
  await refresh();
}

export async function clearSlotAction(mealId: string) {
  await emptySlot(mealId);
  await refresh();
}

export async function renameMealAction(mealId: string, displayName: string) {
  await updateMealDisplayName(mealId, displayName);
  await refresh();
}

export async function regenerateMealsAction(input: {
  menuId: string;
  mealIds: string[];
  note: string;
}) {
  try {
    await startRegenerateMeals(input);
    await refresh();
    return { ok: true as const };
  } catch (error) {
    await recoverFromWaitingJob(input.menuId).catch(() => undefined);
    await refresh();
    return asActionError(error);
  }
}

export async function approveMenuAction(menuId: string) {
  try {
    await approveAndShop(menuId);
    await refresh();
    return { ok: true as const };
  } catch (error) {
    await recoverFromWaitingJob(menuId).catch(() => undefined);
    await refresh();
    return asActionError(error);
  }
}

export async function startNewMenuAction(fromMenuId?: string) {
  let menuId: string;
  try {
    const menu = await startNewMenu(fromMenuId);
    menuId = menu.id;
  } catch (error) {
    return asActionError(error);
  }
  redirect(`/?menu=${menuId}`);
}

export async function toggleFavoriteAction(mealId: string) {
  try {
    await favoriteMeal(mealId);
    await refresh();
    return { ok: true as const };
  } catch (error) {
    return asActionError(error);
  }
}

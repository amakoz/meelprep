import "server-only";

import {
  CATEGORY_ORDER,
  DEFAULT_MEALS_PER_SLOT,
  DEFAULT_PORTIONS,
  DEMO_USER_ID,
} from "@/lib/constants";
import {
  emptyMealFields,
  isNameDirty,
  normalizeMealsPerSlot,
  requiredFilledCount,
  sameName,
} from "@/lib/menu-utils";
import type { CatalogMeal } from "@/lib/n8n/catalog";
import { findCatalogMeal } from "@/lib/n8n/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createWriteSupabase } from "@/lib/supabase/server";
import type {
  DietTag,
  FavoriteRecipe,
  IngredientCategory,
  JobType,
  MealSlot,
  Menu,
  MenuHistoryItem,
  MenuMeal,
  PlannerDTO,
  ShoppingItem,
  ShoppingList,
} from "@/lib/types";
import {
  getMemoryStore,
  nowIso,
  type MenuMealRow,
  type MenuRow,
  type RecipeRow,
} from "@/data/memory-store";

function sb() {
  if (!isSupabaseConfigured()) return null;
  return createWriteSupabase();
}

function toMenu(row: MenuRow): Menu {
  return {
    id: row.id,
    status: row.status,
    portions: row.portions,
    mealsPerSlot: normalizeMealsPerSlot(row.meals_per_slot),
    dietTags: row.diet_tags ?? [],
    approvedAt: row.approved_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

function mapMeal(
  row: MenuMealRow,
  recipe: Pick<RecipeRow, "id" | "name" | "has_ingredients"> | null,
  favoriteIds: Set<string>,
): MenuMeal {
  return {
    id: row.id,
    menuId: row.menu_id,
    slot: row.slot,
    position: row.position,
    recipeId: row.recipe_id,
    recipeName: recipe?.name ?? null,
    displayName: row.display_name,
    source: row.source,
    status: row.status,
    hasIngredients: recipe?.has_ingredients ?? false,
    isFavorite: row.recipe_id ? favoriteIds.has(row.recipe_id) : false,
  };
}

export async function getDietTags(): Promise<DietTag[]> {
  const client = sb();
  if (!client) return getMemoryStore().dietTags;
  const { data, error } = await client
    .from("diet_tags")
    .select("slug, label")
    .order("label");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFavorites(userId = DEMO_USER_ID): Promise<FavoriteRecipe[]> {
  const client = sb();
  if (!client) {
    const store = getMemoryStore();
    return store.favorites
      .filter((row) => row.user_id === userId)
      .map((row) => {
        const recipe = store.recipes.get(row.recipe_id);
        if (!recipe) return null;
        return {
          recipeId: recipe.id,
          name: recipe.name,
          description: recipe.description,
          slot: row.slot ?? recipe.slot,
          hasIngredients: recipe.has_ingredients,
        };
      })
      .filter((row): row is FavoriteRecipe => row !== null);
  }

  const { data, error } = await client
    .from("user_favorites")
    .select("slot, recipe_id, recipes(id, name, description, slot, has_ingredients)")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  type FavoriteJoin = {
    slot: MealSlot | null;
    recipes: {
      id: string;
      name: string;
      description: string;
      slot: MealSlot | null;
      has_ingredients: boolean;
    } | null;
  };

  return ((data ?? []) as unknown as FavoriteJoin[]).flatMap((row) => {
    const recipe = row.recipes;
    if (!recipe) return [];
    return [
      {
        recipeId: recipe.id,
        name: recipe.name,
        description: recipe.description,
        slot: row.slot ?? recipe.slot,
        hasIngredients: recipe.has_ingredients,
      },
    ];
  });
}

async function favoriteIdSet(userId: string) {
  const favorites = await getFavorites(userId);
  return new Set(favorites.map((item) => item.recipeId));
}

export async function getActiveMenuRow(userId = DEMO_USER_ID): Promise<MenuRow | null> {
  const client = sb();
  if (!client) {
    const menus = [...getMemoryStore().menus.values()]
      .filter((menu) => menu.user_id === userId && !menu.archived_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return menus[0] ?? null;
  }

  const { data, error } = await client
    .from("menus")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as MenuRow | null;
}

export async function getMenuRow(
  menuId: string,
  userId = DEMO_USER_ID,
): Promise<MenuRow | null> {
  const client = sb();
  if (!client) {
    const row = getMemoryStore().menus.get(menuId) ?? null;
    return row?.user_id === userId ? row : null;
  }
  const { data, error } = await client
    .from("menus")
    .select("*")
    .eq("id", menuId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as MenuRow | null;
}

export async function listMenuHistory(
  userId = DEMO_USER_ID,
): Promise<MenuHistoryItem[]> {
  const client = sb();
  let menus: MenuRow[] = [];
  if (!client) {
    menus = [...getMemoryStore().menus.values()]
      .filter((menu) => menu.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  } else {
    const { data, error } = await client
      .from("menus")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    menus = (data ?? []) as MenuRow[];
  }

  const ids = menus.map((menu) => menu.id);
  if (ids.length === 0) return [];

  const mealsByMenu = new Map<string, string[]>();
  const shoppingByMenu = new Map<
    string,
    { status: MenuHistoryItem["shoppingStatus"]; count: number }
  >();

  if (!client) {
    const store = getMemoryStore();
    for (const meal of store.meals.values()) {
      if (!meal.display_name) continue;
      const names = mealsByMenu.get(meal.menu_id) ?? [];
      names.push(meal.display_name);
      mealsByMenu.set(meal.menu_id, names);
    }
    const itemCount = new Map<string, number>();
    for (const item of store.shoppingItems.values()) {
      itemCount.set(
        item.shopping_list_id,
        (itemCount.get(item.shopping_list_id) ?? 0) + 1,
      );
    }
    for (const list of store.shoppingLists.values()) {
      shoppingByMenu.set(list.menu_id, {
        status: list.status,
        count: itemCount.get(list.id) ?? 0,
      });
    }
  } else {
    const { data: meals, error: mealsError } = await client
      .from("menu_meals")
      .select("menu_id, display_name, slot, position")
      .in("menu_id", ids)
      .order("slot")
      .order("position");
    if (mealsError) throw new Error(mealsError.message);
    for (const meal of meals ?? []) {
      if (!meal.display_name) continue;
      const names = mealsByMenu.get(meal.menu_id) ?? [];
      names.push(meal.display_name);
      mealsByMenu.set(meal.menu_id, names);
    }
    const { data: lists, error: listsError } = await client
      .from("shopping_lists")
      .select("id, menu_id, status")
      .in("menu_id", ids);
    if (listsError) throw new Error(listsError.message);
    const listIds = (lists ?? []).map((list) => list.id);
    const countByList = new Map<string, number>();
    if (listIds.length > 0) {
      const { data: items, error: itemsError } = await client
        .from("shopping_list_items")
        .select("shopping_list_id")
        .in("shopping_list_id", listIds);
      if (itemsError) throw new Error(itemsError.message);
      for (const item of items ?? []) {
        countByList.set(
          item.shopping_list_id,
          (countByList.get(item.shopping_list_id) ?? 0) + 1,
        );
      }
    }
    for (const list of lists ?? []) {
      shoppingByMenu.set(list.menu_id, {
        status: list.status,
        count: countByList.get(list.id) ?? 0,
      });
    }
  }

  return menus.map((menu) => {
    const shopping = shoppingByMenu.get(menu.id);
    return {
      id: menu.id,
      status: menu.status,
      createdAt: menu.created_at,
      approvedAt: menu.approved_at,
      archivedAt: menu.archived_at,
      mealNames: mealsByMenu.get(menu.id) ?? [],
      shoppingStatus: shopping?.status ?? null,
      shoppingItemCount: shopping?.count ?? 0,
    };
  });
}

async function getMealRows(menuId: string): Promise<MenuMealRow[]> {
  const client = sb();
  if (!client) {
    return [...getMemoryStore().meals.values()]
      .filter((meal) => meal.menu_id === menuId)
      .sort((a, b) => a.slot.localeCompare(b.slot) || a.position - b.position);
  }
  const { data, error } = await client
    .from("menu_meals")
    .select("*")
    .eq("menu_id", menuId)
    .order("slot")
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []) as MenuMealRow[];
}

async function getMealById(mealId: string): Promise<MenuMealRow | null> {
  const client = sb();
  if (!client) return getMemoryStore().meals.get(mealId) ?? null;
  const { data, error } = await client
    .from("menu_meals")
    .select("*")
    .eq("id", mealId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as MenuMealRow | null;
}

async function getRecipe(id: string | null): Promise<RecipeRow | null> {
  if (!id) return null;
  const client = sb();
  if (!client) return getMemoryStore().recipes.get(id) ?? null;
  const { data, error } = await client
    .from("recipes")
    .select("id, name, description, slot, diet_tags, has_ingredients, created_by")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as RecipeRow | null;
}

async function getRecipeByName(name: string): Promise<RecipeRow | null> {
  const client = sb();
  if (!client) {
    return (
      [...getMemoryStore().recipes.values()].find((recipe) =>
        sameName(recipe.name, name),
      ) ?? null
    );
  }
  const { data, error } = await client
    .from("recipes")
    .select("id, name, description, slot, diet_tags, has_ingredients, created_by")
    .ilike("name", name.trim());
  if (error) throw new Error(error.message);
  return ((data ?? []) as RecipeRow[]).find((recipe) => sameName(recipe.name, name)) ?? null;
}

export async function getMenuMeals(
  menuId: string,
  userId = DEMO_USER_ID,
): Promise<MenuMeal[]> {
  const rows = await getMealRows(menuId);
  const favoriteIds = await favoriteIdSet(userId);
  const meals: MenuMeal[] = [];
  for (const row of rows) {
    meals.push(mapMeal(row, await getRecipe(row.recipe_id), favoriteIds));
  }
  return meals;
}

export async function getShoppingList(menuId: string): Promise<ShoppingList | null> {
  const client = sb();
  if (!client) {
    const list = [...getMemoryStore().shoppingLists.values()].find(
      (row) => row.menu_id === menuId,
    );
    if (!list) return null;
    const items = [...getMemoryStore().shoppingItems.values()]
      .filter((item) => item.shopping_list_id === list.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toShoppingItem);
    return { id: list.id, menuId, status: list.status, items };
  }

  const { data: list, error } = await client
    .from("shopping_lists")
    .select("*")
    .eq("menu_id", menuId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!list) return null;
  const { data: items, error: itemsError } = await client
    .from("shopping_list_items")
    .select("*")
    .eq("shopping_list_id", list.id)
    .order("sort_order");
  if (itemsError) throw new Error(itemsError.message);
  return {
    id: list.id,
    menuId,
    status: list.status,
    items: (items ?? []).map(toShoppingItem),
  };
}

function toShoppingItem(row: {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity: number;
  unit: string;
  is_manual: boolean;
  sort_order: number;
}): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: Number(row.quantity),
    unit: row.unit,
    isManual: row.is_manual,
    sortOrder: row.sort_order,
  };
}

async function insertMealSlots(menuId: string, counts = DEFAULT_MEALS_PER_SLOT) {
  const client = sb();
  const rows = (["breakfast", "dinner", "supper"] as MealSlot[]).flatMap((slot) =>
    Array.from({ length: counts[slot] }, (_, position) => ({
      id: crypto.randomUUID(),
      menu_id: menuId,
      slot,
      position,
      ...emptyMealFields(),
    })),
  );

  if (!client) {
    const store = getMemoryStore();
    for (const row of rows) store.meals.set(row.id, row);
    return;
  }

  const { error } = await client.from("menu_meals").insert(rows);
  if (error) throw new Error(error.message);
}

async function createDraftMenu(userId: string): Promise<Menu> {
  const id = crypto.randomUUID();
  const now = nowIso();
  const row: MenuRow = {
    id,
    user_id: userId,
    status: "draft",
    portions: DEFAULT_PORTIONS,
    meals_per_slot: { ...DEFAULT_MEALS_PER_SLOT },
    diet_tags: [],
    approved_at: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
  };

  const client = sb();
  if (!client) {
    getMemoryStore().menus.set(id, row);
    await insertMealSlots(id);
    return toMenu(row);
  }

  const { error } = await client.from("menus").insert({
    id,
    user_id: userId,
    status: "draft",
    portions: DEFAULT_PORTIONS,
    meals_per_slot: DEFAULT_MEALS_PER_SLOT,
    diet_tags: [],
  });
  if (error) throw new Error(error.message);
  await insertMealSlots(id);
  return toMenu(row);
}

async function isBlankDraft(menu: MenuRow, userId: string) {
  if (menu.status !== "draft" || menu.archived_at) return false;
  const meals = await getMenuMeals(menu.id, userId);
  const named = meals.some((meal) => meal.displayName || meal.recipeName);
  if (named) return false;
  const list = await getShoppingList(menu.id);
  return !list || list.items.length === 0;
}

export async function ensureDraftMenu(userId = DEMO_USER_ID): Promise<Menu> {
  const existing = await getActiveMenuRow(userId);
  if (existing) return toMenu(existing);
  return createDraftMenu(userId);
}

export async function startNewMenu(
  userId = DEMO_USER_ID,
  fromMenuId?: string,
): Promise<Menu> {
  const current = fromMenuId
    ? await getMenuRow(fromMenuId, userId)
    : await getActiveMenuRow(userId);

  if (current && (await isBlankDraft(current, userId))) {
    return toMenu(current);
  }

  if (current && !current.archived_at) {
    await updateMenuRow(current.id, { archived_at: nowIso() });
  }

  return createDraftMenu(userId);
}

export async function getPlannerDTO(
  userId = DEMO_USER_ID,
  menuId?: string,
): Promise<PlannerDTO> {
  const requested = menuId ? await getMenuRow(menuId, userId) : null;
  const menu = requested ? toMenu(requested) : await ensureDraftMenu(userId);
  const [dietTags, favorites, meals, shoppingList, history] = await Promise.all([
    getDietTags(),
    getFavorites(userId),
    getMenuMeals(menu.id, userId),
    getShoppingList(menu.id),
    listMenuHistory(userId),
  ]);
  return {
    usingSupabase: Boolean(sb()),
    dietTags,
    favorites,
    menu,
    meals,
    shoppingList,
    history,
  };
}

export async function resizeMenuSlots(
  menuId: string,
  requested: ReturnType<typeof normalizeMealsPerSlot>,
) {
  const meals = await getMealRows(menuId);
  const client = sb();
  const nextCounts = { ...requested };

  for (const slot of ["breakfast", "dinner", "supper"] as MealSlot[]) {
    nextCounts[slot] = requiredFilledCount(slot, meals, requested[slot]);
    const inSlot = meals
      .filter((meal) => meal.slot === slot)
      .sort((a, b) => a.position - b.position);

    while (inSlot.length < nextCounts[slot]) {
      const position = inSlot.length;
      const row: MenuMealRow = {
        id: crypto.randomUUID(),
        menu_id: menuId,
        slot,
        position,
        ...emptyMealFields(),
      };
      inSlot.push(row);
      if (!client) getMemoryStore().meals.set(row.id, row);
      else {
        const { error } = await client.from("menu_meals").insert(row);
        if (error) throw new Error(error.message);
      }
    }

    const extras = inSlot.slice(nextCounts[slot]);
    for (const extra of extras) {
      if (extra.source !== "empty") continue;
      if (!client) getMemoryStore().meals.delete(extra.id);
      else {
        const { error } = await client.from("menu_meals").delete().eq("id", extra.id);
        if (error) throw new Error(error.message);
      }
    }
  }

  await updateMenuRow(menuId, { meals_per_slot: nextCounts });
  return nextCounts;
}

async function updateMenuRow(
  menuId: string,
  patch: Partial<MenuRow>,
) {
  const client = sb();
  if (!client) {
    const current = getMemoryStore().menus.get(menuId);
    if (!current) throw new Error("Menu not found");
    getMemoryStore().menus.set(menuId, {
      ...current,
      ...patch,
      updated_at: nowIso(),
    });
    return;
  }
  const { error } = await client
    .from("menus")
    .update(patch as never)
    .eq("id", menuId);
  if (error) throw new Error(error.message);
}

async function updateMealRow(mealId: string, patch: Partial<MenuMealRow>) {
  const client = sb();
  if (!client) {
    const current = getMemoryStore().meals.get(mealId);
    if (!current) throw new Error("Meal not found");
    getMemoryStore().meals.set(mealId, { ...current, ...patch });
    return;
  }
  const { error } = await client
    .from("menu_meals")
    .update(patch as never)
    .eq("id", mealId);
  if (error) throw new Error(error.message);
}

export async function saveMenuSettings(input: {
  menuId: string;
  portions: number;
  mealsPerSlot: ReturnType<typeof normalizeMealsPerSlot>;
  dietTags: string[];
}) {
  await updateMenuRow(input.menuId, {
    portions: Math.max(1, Math.round(input.portions)),
    diet_tags: input.dietTags,
  });
  return resizeMenuSlots(input.menuId, input.mealsPerSlot);
}

export async function assignFavoriteToSlot(input: {
  mealId: string;
  recipeId: string;
}) {
  const recipe = await getRecipe(input.recipeId);
  if (!recipe) throw new Error("Recipe not found");
  await updateMealRow(input.mealId, {
    recipe_id: recipe.id,
    display_name: recipe.name,
    source: "favorite",
    status: "ready",
    regenerate_note: null,
  });
}

export async function clearMealSlot(mealId: string) {
  await updateMealRow(mealId, emptyMealFields());
}

export async function renameMeal(input: { mealId: string; displayName: string }) {
  const name = input.displayName.trim();
  const client = sb();
  const meal = client
    ? (((
        await client.from("menu_meals").select("*").eq("id", input.mealId).single()
      ).data as MenuMealRow | null) ?? null)
    : (getMemoryStore().meals.get(input.mealId) ?? null);
  if (!meal) throw new Error("Meal not found");

  if (!name) {
    await clearMealSlot(input.mealId);
    return;
  }

  const recipe = await getRecipe(meal.recipe_id);
  const dirty = isNameDirty(name, recipe?.name ?? null);
  await updateMealRow(input.mealId, {
    display_name: name,
    recipe_id: dirty ? null : meal.recipe_id,
    source: dirty ? "manual" : meal.source === "empty" ? "manual" : meal.source,
    status: "ready",
  });
}

export async function createJob(input: {
  menuId: string;
  type: JobType;
  request: Record<string, unknown>;
}) {
  const id = crypto.randomUUID();
  const client = sb();
  if (!client) {
    getMemoryStore().jobs.set(id, {
      id,
      menu_id: input.menuId,
      type: input.type,
      status: "queued",
      request: input.request,
      error: null,
    });
    return id;
  }
  const { error } = await client.from("generation_jobs").insert({
    id,
    menu_id: input.menuId,
    type: input.type,
    status: "queued",
    request: input.request,
  });
  if (error) throw new Error(error.message);
  return id;
}

export async function setJobStatus(
  jobId: string,
  status: "queued" | "running" | "done" | "error",
  errorMessage?: string,
) {
  const client = sb();
  if (!client) {
    const current = getMemoryStore().jobs.get(jobId);
    if (!current) return;
    getMemoryStore().jobs.set(jobId, {
      ...current,
      status,
      error: errorMessage ?? null,
    });
    return;
  }
  const { error } = await client
    .from("generation_jobs")
    .update({ status, error: errorMessage ?? null })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
}

export async function setMenuStatus(
  menuId: string,
  status: Menu["status"],
  extra: Partial<MenuRow> = {},
) {
  await updateMenuRow(menuId, { status, ...extra });
}

export async function setMealsRegenerating(mealIds: string[]) {
  for (const id of mealIds) {
    await updateMealRow(id, { status: "regenerating" });
  }
}

export async function resetRegeneratingMeals(menuId: string) {
  const meals = await getMealRows(menuId);
  for (const meal of meals) {
    if (meal.status !== "regenerating") continue;
    await updateMealRow(meal.id, {
      status: meal.display_name ? "ready" : "empty",
    });
  }
}

export async function setShoppingListStatus(
  menuId: string,
  status: "generating" | "ready",
) {
  const client = sb();
  if (!client) {
    const list = [...getMemoryStore().shoppingLists.values()].find(
      (row) => row.menu_id === menuId,
    );
    if (!list) return;
    getMemoryStore().shoppingLists.set(list.id, { ...list, status });
    return;
  }
  const { error } = await client
    .from("shopping_lists")
    .update({ status })
    .eq("menu_id", menuId);
  if (error) throw new Error(error.message);
}

export async function recoverWaitingMenu(menuId: string) {
  await resetRegeneratingMeals(menuId);
  const meals = await getMenuMeals(menuId);
  const filled = meals.some((meal) => meal.displayName || meal.recipeName);
  const list = await getShoppingList(menuId);

  if (list?.status === "generating") {
    await setShoppingListStatus(menuId, "ready");
    await setMenuStatus(menuId, list.items.length > 0 ? "shopping" : filled ? "review" : "draft");
    return;
  }

  const menu = await getMenuRow(menuId);
  if (menu && (menu.status === "generating" || menu.status === "shopping")) {
    if (list?.items.length) {
      await setMenuStatus(menuId, "shopping");
      return;
    }
    await setMenuStatus(menuId, filled ? "review" : "draft");
  }
}

export async function getMenuSnapshot(menuId: string, userId = DEMO_USER_ID) {
  const client = sb();
  let menu: MenuRow | null = null;
  if (!client) menu = getMemoryStore().menus.get(menuId) ?? null;
  else {
    const { data, error } = await client.from("menus").select("*").eq("id", menuId).maybeSingle();
    if (error) throw new Error(error.message);
    menu = data as MenuRow | null;
  }
  if (!menu) throw new Error("Menu not found");
  const meals = await getMenuMeals(menuId, userId);
  return { menu: toMenu(menu), meals };
}

export async function upsertRecipeFromCatalog(
  meal: CatalogMeal,
  userId = DEMO_USER_ID,
): Promise<RecipeRow> {
  const existing = await getRecipeByName(meal.name);
  if (existing) {
    if (!existing.has_ingredients) {
      await replaceRecipeIngredients(existing.id, meal);
    }
    return (await getRecipe(existing.id)) ?? existing;
  }

  const id = crypto.randomUUID();
  const row: RecipeRow = {
    id,
    name: meal.name,
    description: meal.description,
    slot: meal.slot,
    diet_tags: meal.dietTags,
    has_ingredients: true,
    created_by: userId,
  };
  const client = sb();
  if (!client) getMemoryStore().recipes.set(id, row);
  else {
    const { error } = await client.from("recipes").insert({
      id,
      name: row.name,
      description: row.description,
      slot: row.slot,
      diet_tags: row.diet_tags,
      has_ingredients: true,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
  }
  await replaceRecipeIngredients(id, meal);
  return row;
}

async function ensureNamedRecipe(
  name: string,
  slot: MealSlot,
  userId = DEMO_USER_ID,
): Promise<RecipeRow> {
  const existing = await getRecipeByName(name);
  if (existing) return existing;

  const id = crypto.randomUUID();
  const row: RecipeRow = {
    id,
    name,
    description: "",
    slot,
    diet_tags: [],
    has_ingredients: false,
    created_by: userId,
  };
  const client = sb();
  if (!client) {
    getMemoryStore().recipes.set(id, row);
    return row;
  }
  const { error } = await client.from("recipes").insert({
    id,
    name: row.name,
    description: row.description,
    slot: row.slot,
    diet_tags: row.diet_tags,
    has_ingredients: false,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  return row;
}

async function upsertIngredient(input: {
  name: string;
  category: IngredientCategory;
  unit: string;
}) {
  const name = input.name.trim().toLowerCase();
  const client = sb();
  if (!client) {
    const store = getMemoryStore();
    const existing = [...store.ingredients.values()].find((row) => row.name === name);
    if (existing) return existing;
    const row = {
      id: crypto.randomUUID(),
      name,
      category: input.category,
      default_unit: input.unit,
    };
    store.ingredients.set(row.id, row);
    return row;
  }

  const { data: found, error: findError } = await client
    .from("ingredients")
    .select("*")
    .eq("name", name)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (found) return found;

  const id = crypto.randomUUID();
  const { error } = await client.from("ingredients").insert({
    id,
    name,
    category: input.category,
    default_unit: input.unit,
  });
  if (error) throw new Error(error.message);
  return {
    id,
    name,
    category: input.category,
    default_unit: input.unit,
    embedding: null,
    created_at: nowIso(),
  };
}

async function replaceRecipeIngredients(recipeId: string, meal: CatalogMeal) {
  const client = sb();
  if (!client) {
    const store = getMemoryStore();
    store.recipeIngredients = store.recipeIngredients.filter(
      (row) => row.recipe_id !== recipeId,
    );
  } else {
    const { error } = await client
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId);
    if (error) throw new Error(error.message);
  }

  for (const item of meal.ingredients) {
    const ingredient = await upsertIngredient({
      name: item.name,
      category: item.category,
      unit: item.unit,
    });
    if (!client) {
      getMemoryStore().recipeIngredients.push({
        recipe_id: recipeId,
        ingredient_id: ingredient.id,
        quantity: item.quantity,
        unit: item.unit,
      });
    } else {
      const { error } = await client.from("recipe_ingredients").insert({
        recipe_id: recipeId,
        ingredient_id: ingredient.id,
        quantity: item.quantity,
        unit: item.unit,
      });
      if (error) throw new Error(error.message);
    }
  }

  if (!client) {
    const recipe = getMemoryStore().recipes.get(recipeId);
    if (recipe) {
      getMemoryStore().recipes.set(recipeId, { ...recipe, has_ingredients: true });
    }
  } else {
    const { error } = await client
      .from("recipes")
      .update({ has_ingredients: true })
      .eq("id", recipeId);
    if (error) throw new Error(error.message);
  }
}

export async function fillGeneratedSlots(
  assignments: {
    mealId: string;
    catalogMeal: CatalogMeal;
  }[],
) {
  for (const assignment of assignments) {
    const recipe = await upsertRecipeFromCatalog(assignment.catalogMeal);
    await updateMealRow(assignment.mealId, {
      recipe_id: recipe.id,
      display_name: recipe.name,
      source: "generated",
      status: "ready",
      regenerate_note: null,
    });
  }
}

export async function ensureMealRecipeForShopping(meal: MenuMeal) {
  const name = meal.displayName ?? meal.recipeName;
  if (!name) return null;

  const catalog = findCatalogMeal(name);
  if (catalog) return upsertRecipeFromCatalog(catalog);

  if (meal.recipeId && meal.hasIngredients && !isNameDirty(name, meal.recipeName)) {
    return getRecipe(meal.recipeId);
  }

  const synthetic: CatalogMeal = {
    name,
    description: `User-edited meal: ${name}`,
    slot: meal.slot,
    dietTags: [],
    ingredients: [
      { name: name.toLowerCase(), quantity: 1, unit: "pcs", category: "other" },
    ],
  };
  const recipe = await upsertRecipeFromCatalog(synthetic);
  await updateMealRow(meal.id, {
    recipe_id: recipe.id,
    display_name: name,
    source: meal.source === "empty" ? "manual" : meal.source,
    status: "ready",
  });
  return recipe;
}

export async function getRecipeIngredients(recipeId: string) {
  const client = sb();
  if (!client) {
    const store = getMemoryStore();
    return store.recipeIngredients
      .filter((row) => row.recipe_id === recipeId)
      .map((row) => {
        const ingredient = store.ingredients.get(row.ingredient_id);
        return {
          name: ingredient?.name ?? "item",
          category: ingredient?.category ?? "other",
          quantity: row.quantity,
          unit: row.unit,
          ingredientId: row.ingredient_id,
        };
      });
  }

  const { data, error } = await client
    .from("recipe_ingredients")
    .select("quantity, unit, ingredient_id, ingredients(name, category)")
    .eq("recipe_id", recipeId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as {
    quantity: number;
    unit: string;
    ingredient_id: string;
    ingredients: { name: string; category: IngredientCategory } | null;
  }[]).map((row) => {
    const ingredient = row.ingredients;
    return {
      name: ingredient?.name ?? "item",
      category: ingredient?.category ?? "other",
      quantity: Number(row.quantity),
      unit: row.unit,
      ingredientId: row.ingredient_id,
    };
  });
}

export async function upsertShoppingListForMenu(input: {
  menuId: string;
  userId?: string;
  items: {
    name: string;
    category: IngredientCategory;
    quantity: number;
    unit: string;
    ingredientId: string | null;
  }[];
}) {
  const userId = input.userId ?? DEMO_USER_ID;
  const client = sb();
  let listId: string;

  if (!client) {
    const store = getMemoryStore();
    const existing = [...store.shoppingLists.values()].find(
      (row) => row.menu_id === input.menuId,
    );
    listId = existing?.id ?? crypto.randomUUID();
    store.shoppingLists.set(listId, {
      id: listId,
      menu_id: input.menuId,
      user_id: userId,
      status: "ready",
    });
    const manuals = [...store.shoppingItems.values()].filter(
      (item) => item.shopping_list_id === listId && item.is_manual,
    );
    for (const item of [...store.shoppingItems.values()]) {
      if (item.shopping_list_id === listId && !item.is_manual) {
        store.shoppingItems.delete(item.id);
      }
    }
    writeShoppingItems(listId, input.items, manuals);
    return listId;
  }

  const { data: existing, error } = await client
    .from("shopping_lists")
    .select("*")
    .eq("menu_id", input.menuId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (existing) {
    listId = existing.id;
    const { error: statusError } = await client
      .from("shopping_lists")
      .update({ status: "ready" })
      .eq("id", listId);
    if (statusError) throw new Error(statusError.message);
    const { error: deleteError } = await client
      .from("shopping_list_items")
      .delete()
      .eq("shopping_list_id", listId)
      .eq("is_manual", false);
    if (deleteError) throw new Error(deleteError.message);
    const { data: manuals } = await client
      .from("shopping_list_items")
      .select("*")
      .eq("shopping_list_id", listId)
      .eq("is_manual", true);
    await insertShoppingItems(
      listId,
      input.items,
      (manuals ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: Number(item.quantity),
        unit: item.unit,
      })),
    );
    return listId;
  }

  listId = crypto.randomUUID();
  const { error: insertError } = await client.from("shopping_lists").insert({
    id: listId,
    menu_id: input.menuId,
    user_id: userId,
    status: "ready",
  });
  if (insertError) throw new Error(insertError.message);
  await insertShoppingItems(listId, input.items, []);
  return listId;
}

function writeShoppingItems(
  listId: string,
  items: {
    name: string;
    category: IngredientCategory;
    quantity: number;
    unit: string;
    ingredientId: string | null;
  }[],
  manuals: {
    id: string;
    name: string;
    category: IngredientCategory;
    quantity: number;
    unit: string;
  }[],
) {
  const store = getMemoryStore();
  const sorted = [...items].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.name.localeCompare(b.name),
  );
  sorted.forEach((item, index) => {
    const id = crypto.randomUUID();
    store.shoppingItems.set(id, {
      id,
      shopping_list_id: listId,
      ingredient_id: item.ingredientId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      is_manual: false,
      sort_order: index,
    });
  });
  manuals.forEach((item, index) => {
    store.shoppingItems.set(item.id, {
      id: item.id,
      shopping_list_id: listId,
      ingredient_id: null,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      is_manual: true,
      sort_order: sorted.length + index,
    });
  });
}

async function insertShoppingItems(
  listId: string,
  items: {
    name: string;
    category: IngredientCategory;
    quantity: number;
    unit: string;
    ingredientId: string | null;
  }[],
  manuals: {
    id: string;
    name: string;
    category: IngredientCategory;
    quantity: number;
    unit: string;
  }[],
) {
  const client = sb();
  if (!client) {
    writeShoppingItems(listId, items, manuals);
    return;
  }
  const sorted = [...items].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.name.localeCompare(b.name),
  );
  const rows = [
    ...sorted.map((item, index) => ({
      id: crypto.randomUUID(),
      shopping_list_id: listId,
      ingredient_id: item.ingredientId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      is_manual: false,
      sort_order: index,
    })),
    ...manuals.map((item, index) => ({
      id: item.id,
      shopping_list_id: listId,
      ingredient_id: null,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      is_manual: true,
      sort_order: sorted.length + index,
    })),
  ];
  if (rows.length === 0) return;
  const { error } = await client.from("shopping_list_items").upsert(rows);
  if (error) throw new Error(error.message);
}

export async function markShoppingGenerating(menuId: string, userId = DEMO_USER_ID) {
  const client = sb();
  if (!client) {
    const store = getMemoryStore();
    const existing = [...store.shoppingLists.values()].find(
      (row) => row.menu_id === menuId,
    );
    const id = existing?.id ?? crypto.randomUUID();
    store.shoppingLists.set(id, {
      id,
      menu_id: menuId,
      user_id: userId,
      status: "generating",
    });
    return;
  }
  const { data } = await client
    .from("shopping_lists")
    .select("id")
    .eq("menu_id", menuId)
    .maybeSingle();
  if (data) {
    const { error } = await client
      .from("shopping_lists")
      .update({ status: "generating" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await client.from("shopping_lists").insert({
    menu_id: menuId,
    user_id: userId,
    status: "generating",
  });
  if (error) throw new Error(error.message);
}

export async function addManualShoppingItem(input: {
  shoppingListId: string;
  name: string;
  quantity: number;
  unit: string;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  const client = sb();
  const id = crypto.randomUUID();
  if (!client) {
    const store = getMemoryStore();
    const maxOrder = Math.max(
      0,
      ...[...store.shoppingItems.values()]
        .filter((item) => item.shopping_list_id === input.shoppingListId)
        .map((item) => item.sort_order),
    );
    store.shoppingItems.set(id, {
      id,
      shopping_list_id: input.shoppingListId,
      ingredient_id: null,
      name,
      category: "other",
      quantity: input.quantity,
      unit: input.unit || "pcs",
      is_manual: true,
      sort_order: maxOrder + 1,
    });
    return;
  }
  const { data: last } = await client
    .from("shopping_list_items")
    .select("sort_order")
    .eq("shopping_list_id", input.shoppingListId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await client.from("shopping_list_items").insert({
    id,
    shopping_list_id: input.shoppingListId,
    name,
    category: "other",
    quantity: input.quantity,
    unit: input.unit || "pcs",
    is_manual: true,
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
}

export async function updateShoppingItem(input: {
  itemId: string;
  name?: string;
  quantity?: number;
}) {
  const client = sb();
  const patch: { name?: string; quantity?: number } = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.quantity !== undefined) patch.quantity = input.quantity;
  if (!client) {
    const current = getMemoryStore().shoppingItems.get(input.itemId);
    if (!current) throw new Error("Item not found");
    getMemoryStore().shoppingItems.set(input.itemId, { ...current, ...patch });
    return;
  }
  const { error } = await client
    .from("shopping_list_items")
    .update(patch)
    .eq("id", input.itemId);
  if (error) throw new Error(error.message);
}

export async function toggleFavorite(input: {
  recipeId: string;
  slot: MealSlot | null;
  userId?: string;
}) {
  const userId = input.userId ?? DEMO_USER_ID;
  const client = sb();
  if (!client) {
    const store = getMemoryStore();
    const index = store.favorites.findIndex(
      (row) => row.user_id === userId && row.recipe_id === input.recipeId,
    );
    if (index >= 0) store.favorites.splice(index, 1);
    else {
      store.favorites.push({
        user_id: userId,
        recipe_id: input.recipeId,
        slot: input.slot,
      });
    }
    return;
  }
  const { data } = await client
    .from("user_favorites")
    .select("recipe_id")
    .eq("user_id", userId)
    .eq("recipe_id", input.recipeId)
    .maybeSingle();
  if (data) {
    const { error } = await client
      .from("user_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("recipe_id", input.recipeId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await client.from("user_favorites").insert({
    user_id: userId,
    recipe_id: input.recipeId,
    slot: input.slot,
  });
  if (error) throw new Error(error.message);
}

export async function toggleFavoriteForMeal(
  mealId: string,
  userId = DEMO_USER_ID,
) {
  const meal = await getMealById(mealId);
  if (!meal) throw new Error("Meal not found");
  const name = meal.display_name?.trim();
  if (!name) throw new Error("Name this meal first");

  let recipeId = meal.recipe_id;
  if (!recipeId) {
    const recipe = await ensureNamedRecipe(name, meal.slot, userId);
    recipeId = recipe.id;
    await updateMealRow(mealId, { recipe_id: recipe.id });
  }
  await toggleFavorite({ recipeId, slot: meal.slot, userId });
}

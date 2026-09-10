import type { IngredientCategory, MealSlot } from "@/lib/types";

export type CatalogIngredient = {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
};

export type CatalogMeal = {
  name: string;
  description: string;
  slot: MealSlot;
  dietTags: string[];
  ingredients: CatalogIngredient[];
};

export const CATALOG_MEALS: CatalogMeal[] = [
  {
    name: "Overnight oats",
    description: "Oats soaked with yogurt and berries.",
    slot: "breakfast",
    dietTags: ["vegetarian", "high_protein"],
    ingredients: [
      { name: "rolled oats", quantity: 80, unit: "g", category: "pantry" },
      { name: "greek yogurt", quantity: 120, unit: "g", category: "dairy" },
      { name: "blueberries", quantity: 80, unit: "g", category: "produce" },
      { name: "honey", quantity: 15, unit: "ml", category: "pantry" },
    ],
  },
  {
    name: "Veggie omelette",
    description: "Eggs folded with spinach and tomato.",
    slot: "breakfast",
    dietTags: ["vegetarian", "high_protein", "low_fat", "gluten_free"],
    ingredients: [
      { name: "eggs", quantity: 3, unit: "pcs", category: "dairy" },
      { name: "spinach", quantity: 60, unit: "g", category: "produce" },
      { name: "tomato", quantity: 1, unit: "pcs", category: "produce" },
    ],
  },
  {
    name: "Protein pancakes",
    description: "Skillet pancakes with cottage cheese.",
    slot: "breakfast",
    dietTags: ["vegetarian", "high_protein"],
    ingredients: [
      { name: "oat flour", quantity: 80, unit: "g", category: "pantry" },
      { name: "cottage cheese", quantity: 120, unit: "g", category: "dairy" },
      { name: "eggs", quantity: 2, unit: "pcs", category: "dairy" },
    ],
  },
  {
    name: "Avocado toast",
    description: "Sourdough with avocado and lemon.",
    slot: "breakfast",
    dietTags: ["vegetarian", "vegan"],
    ingredients: [
      { name: "sourdough bread", quantity: 2, unit: "pcs", category: "bakery" },
      { name: "avocado", quantity: 1, unit: "pcs", category: "produce" },
      { name: "lemon", quantity: 0.5, unit: "pcs", category: "produce" },
    ],
  },
  {
    name: "Greek yogurt bowl",
    description: "Yogurt with walnuts and honey.",
    slot: "breakfast",
    dietTags: ["vegetarian", "high_protein"],
    ingredients: [
      { name: "greek yogurt", quantity: 200, unit: "g", category: "dairy" },
      { name: "walnuts", quantity: 20, unit: "g", category: "pantry" },
      { name: "honey", quantity: 15, unit: "ml", category: "pantry" },
    ],
  },
  {
    name: "Cottage cheese parfait",
    description: "Cottage cheese layered with fruit.",
    slot: "breakfast",
    dietTags: ["vegetarian", "high_protein", "gluten_free", "low_fat"],
    ingredients: [
      { name: "cottage cheese", quantity: 180, unit: "g", category: "dairy" },
      { name: "strawberries", quantity: 100, unit: "g", category: "produce" },
    ],
  },
  {
    name: "Lentil stew",
    description: "Hearty red lentils with onion and carrot.",
    slot: "dinner",
    dietTags: ["vegetarian", "vegan", "low_fat", "high_protein"],
    ingredients: [
      { name: "red lentils", quantity: 180, unit: "g", category: "pantry" },
      { name: "onion", quantity: 1, unit: "pcs", category: "produce" },
      { name: "carrot", quantity: 2, unit: "pcs", category: "produce" },
      { name: "vegetable stock", quantity: 400, unit: "ml", category: "pantry" },
    ],
  },
  {
    name: "Chickpea curry",
    description: "Tomato chickpea curry with rice.",
    slot: "dinner",
    dietTags: ["vegetarian", "vegan", "high_protein"],
    ingredients: [
      { name: "chickpeas", quantity: 240, unit: "g", category: "pantry" },
      { name: "canned tomatoes", quantity: 400, unit: "g", category: "pantry" },
      { name: "rice", quantity: 150, unit: "g", category: "pantry" },
      { name: "curry powder", quantity: 8, unit: "g", category: "spices" },
    ],
  },
  {
    name: "Tofu stir fry",
    description: "Crisp tofu with mixed vegetables.",
    slot: "dinner",
    dietTags: ["vegetarian", "vegan", "high_protein", "low_fat"],
    ingredients: [
      { name: "tofu", quantity: 250, unit: "g", category: "other" },
      { name: "broccoli", quantity: 200, unit: "g", category: "produce" },
      { name: "soy sauce", quantity: 20, unit: "ml", category: "pantry" },
      { name: "rice", quantity: 150, unit: "g", category: "pantry" },
    ],
  },
  {
    name: "Quinoa salad",
    description: "Quinoa with cucumber, tomato, and herbs.",
    slot: "dinner",
    dietTags: ["vegetarian", "vegan", "gluten_free", "low_fat"],
    ingredients: [
      { name: "quinoa", quantity: 140, unit: "g", category: "pantry" },
      { name: "cucumber", quantity: 1, unit: "pcs", category: "produce" },
      { name: "tomato", quantity: 2, unit: "pcs", category: "produce" },
      { name: "olive oil", quantity: 15, unit: "ml", category: "pantry" },
    ],
  },
  {
    name: "Bean chili",
    description: "Smoky beans with peppers and spices.",
    slot: "dinner",
    dietTags: ["vegetarian", "vegan", "high_protein"],
    ingredients: [
      { name: "kidney beans", quantity: 240, unit: "g", category: "pantry" },
      { name: "bell pepper", quantity: 1, unit: "pcs", category: "produce" },
      { name: "onion", quantity: 1, unit: "pcs", category: "produce" },
      { name: "chili powder", quantity: 6, unit: "g", category: "spices" },
    ],
  },
  {
    name: "Baked salmon",
    description: "Salmon with lemon and green beans.",
    slot: "dinner",
    dietTags: ["high_protein", "low_fat", "gluten_free"],
    ingredients: [
      { name: "salmon fillet", quantity: 180, unit: "g", category: "meat" },
      { name: "green beans", quantity: 200, unit: "g", category: "produce" },
      { name: "lemon", quantity: 1, unit: "pcs", category: "produce" },
    ],
  },
  {
    name: "Tomato soup",
    description: "Simple tomato soup with garlic and olive oil.",
    slot: "supper",
    dietTags: ["vegetarian", "vegan", "low_fat"],
    ingredients: [
      { name: "canned tomatoes", quantity: 400, unit: "g", category: "pantry" },
      { name: "tomato", quantity: 2, unit: "pcs", category: "produce" },
      { name: "garlic", quantity: 2, unit: "pcs", category: "produce" },
      { name: "olive oil", quantity: 10, unit: "ml", category: "pantry" },
    ],
  },
  {
    name: "Hummus wrap",
    description: "Wholewheat wrap with hummus and greens.",
    slot: "supper",
    dietTags: ["vegetarian", "vegan"],
    ingredients: [
      { name: "tortilla wrap", quantity: 1, unit: "pcs", category: "bakery" },
      { name: "hummus", quantity: 80, unit: "g", category: "pantry" },
      { name: "lettuce", quantity: 40, unit: "g", category: "produce" },
    ],
  },
  {
    name: "Cottage cheese toast",
    description: "Rye toast with cottage cheese and cucumber.",
    slot: "supper",
    dietTags: ["vegetarian", "high_protein", "low_fat"],
    ingredients: [
      { name: "rye bread", quantity: 2, unit: "pcs", category: "bakery" },
      { name: "cottage cheese", quantity: 120, unit: "g", category: "dairy" },
      { name: "cucumber", quantity: 0.5, unit: "pcs", category: "produce" },
    ],
  },
  {
    name: "Veggie frittata",
    description: "Baked eggs with leftover vegetables.",
    slot: "supper",
    dietTags: ["vegetarian", "high_protein", "gluten_free"],
    ingredients: [
      { name: "eggs", quantity: 3, unit: "pcs", category: "dairy" },
      { name: "zucchini", quantity: 1, unit: "pcs", category: "produce" },
      { name: "cheese", quantity: 40, unit: "g", category: "dairy" },
    ],
  },
  {
    name: "Rice and beans",
    description: "Seasoned rice with black beans.",
    slot: "supper",
    dietTags: ["vegetarian", "vegan", "high_protein", "gluten_free"],
    ingredients: [
      { name: "rice", quantity: 150, unit: "g", category: "pantry" },
      { name: "black beans", quantity: 200, unit: "g", category: "pantry" },
      { name: "onion", quantity: 0.5, unit: "pcs", category: "produce" },
    ],
  },
  {
    name: "Grilled chicken salad",
    description: "Chicken over mixed leaves.",
    slot: "supper",
    dietTags: ["high_protein", "low_fat", "gluten_free"],
    ingredients: [
      { name: "chicken breast", quantity: 160, unit: "g", category: "meat" },
      { name: "mixed salad", quantity: 80, unit: "g", category: "produce" },
      { name: "olive oil", quantity: 10, unit: "ml", category: "pantry" },
    ],
  },
];

export function findCatalogMeal(name: string) {
  const needle = name.trim().toLowerCase();
  return CATALOG_MEALS.find((meal) => meal.name.toLowerCase() === needle);
}

export function pickCatalogMeals(options: {
  slot: MealSlot;
  count: number;
  excludeNames: string[];
  dietTags: string[];
  note?: string;
}) {
  const excluded = new Set(options.excludeNames.map((name) => name.toLowerCase()));
  const note = options.note?.toLowerCase() ?? "";

  let pool = CATALOG_MEALS.filter((meal) => meal.slot === options.slot);
  if (options.dietTags.length > 0) {
    const tagged = pool.filter((meal) =>
      options.dietTags.every((tag) => meal.dietTags.includes(tag)),
    );
    if (tagged.length > 0) pool = tagged;
  }

  if (note.includes("rice")) {
    pool = [...pool].sort((a, b) =>
      Number(b.name.toLowerCase().includes("rice")) -
      Number(a.name.toLowerCase().includes("rice")),
    );
  }
  if (note.includes("no broccoli") || note.includes("without broccoli")) {
    pool = pool.filter((meal) => !meal.name.toLowerCase().includes("tofu"));
  }

  const available = pool.filter((meal) => !excluded.has(meal.name.toLowerCase()));
  const fallback = CATALOG_MEALS.filter(
    (meal) => meal.slot === options.slot && !excluded.has(meal.name.toLowerCase()),
  );
  const source = available.length > 0 ? available : fallback;

  const picked: CatalogMeal[] = [];
  for (let i = 0; i < options.count; i += 1) {
    const meal = source[i % Math.max(source.length, 1)];
    if (meal) picked.push(meal);
  }
  return picked;
}

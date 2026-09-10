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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          created_at?: string;
        };
        Update: {
          display_name?: string;
        };
        Relationships: [];
      };
      diet_tags: {
        Row: { slug: string; label: string };
        Insert: { slug: string; label: string };
        Update: { label?: string };
        Relationships: [];
      };
      ingredients: {
        Row: {
          id: string;
          name: string;
          category: IngredientCategory;
          default_unit: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: IngredientCategory;
          default_unit?: string;
          embedding?: number[] | null;
        };
        Update: {
          name?: string;
          category?: IngredientCategory;
          default_unit?: string;
          embedding?: number[] | null;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          name: string;
          description: string;
          slot: MealSlot | null;
          diet_tags: string[];
          embedding: number[] | null;
          has_ingredients: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          slot?: MealSlot | null;
          diet_tags?: string[];
          embedding?: number[] | null;
          has_ingredients?: boolean;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          description?: string;
          slot?: MealSlot | null;
          diet_tags?: string[];
          embedding?: number[] | null;
          has_ingredients?: boolean;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit: string;
          notes: string | null;
        };
        Insert: {
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit?: string;
          notes?: string | null;
        };
        Update: {
          quantity?: number;
          unit?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      user_favorites: {
        Row: {
          user_id: string;
          recipe_id: string;
          slot: MealSlot | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          recipe_id: string;
          slot?: MealSlot | null;
        };
        Update: { slot?: MealSlot | null };
        Relationships: [];
      };
      menus: {
        Row: {
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
        Insert: {
          id?: string;
          user_id: string;
          status?: MenuStatus;
          portions?: number;
          meals_per_slot?: {
            breakfast: number;
            dinner: number;
            supper: number;
          };
          diet_tags?: string[];
          approved_at?: string | null;
          archived_at?: string | null;
        };
        Update: {
          status?: MenuStatus;
          portions?: number;
          meals_per_slot?: {
            breakfast: number;
            dinner: number;
            supper: number;
          };
          diet_tags?: string[];
          approved_at?: string | null;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      menu_meals: {
        Row: {
          id: string;
          menu_id: string;
          slot: MealSlot;
          position: number;
          recipe_id: string | null;
          display_name: string | null;
          source: MealSource;
          status: MealStatus;
          regenerate_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          menu_id: string;
          slot: MealSlot;
          position: number;
          recipe_id?: string | null;
          display_name?: string | null;
          source?: MealSource;
          status?: MealStatus;
          regenerate_note?: string | null;
        };
        Update: {
          recipe_id?: string | null;
          display_name?: string | null;
          source?: MealSource;
          status?: MealStatus;
          regenerate_note?: string | null;
        };
        Relationships: [];
      };
      shopping_lists: {
        Row: {
          id: string;
          menu_id: string;
          user_id: string;
          status: ShoppingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          menu_id: string;
          user_id: string;
          status?: ShoppingStatus;
        };
        Update: { status?: ShoppingStatus };
        Relationships: [];
      };
      shopping_list_items: {
        Row: {
          id: string;
          shopping_list_id: string;
          ingredient_id: string | null;
          name: string;
          category: IngredientCategory;
          quantity: number;
          unit: string;
          is_manual: boolean;
          sort_order: number;
          used_for: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          shopping_list_id: string;
          ingredient_id?: string | null;
          name: string;
          category?: IngredientCategory;
          quantity?: number;
          unit?: string;
          is_manual?: boolean;
          sort_order?: number;
          used_for?: string[];
        };
        Update: {
          name?: string;
          category?: IngredientCategory;
          quantity?: number;
          unit?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      generation_jobs: {
        Row: {
          id: string;
          menu_id: string;
          type: JobType;
          status: JobStatus;
          request: Record<string, unknown>;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          menu_id: string;
          type: JobType;
          status?: JobStatus;
          request?: Record<string, unknown>;
          error?: string | null;
        };
        Update: {
          status?: JobStatus;
          error?: string | null;
          request?: Record<string, unknown>;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      meal_slot: MealSlot;
      menu_status: MenuStatus;
      meal_source: MealSource;
      meal_status: MealStatus;
      job_type: JobType;
      job_status: JobStatus;
      shopping_status: ShoppingStatus;
      ingredient_category: IngredientCategory;
    };
    CompositeTypes: Record<string, never>;
  };
};

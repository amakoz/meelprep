-- MeelPrep initial schema
-- Demo user (no Auth UI in this slice). RLS falls back to this id when auth.uid() is null.

create extension if not exists vector;
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    auth.uid(),
    nullif(current_setting('app.demo_user_id', true), '')::uuid,
    '00000000-0000-4000-8000-000000000001'::uuid
  );
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'meal_slot') then
    create type public.meal_slot as enum ('breakfast', 'dinner', 'supper');
  end if;
  if not exists (select 1 from pg_type where typname = 'menu_status') then
    create type public.menu_status as enum (
      'draft',
      'generating',
      'review',
      'approved',
      'shopping'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'meal_source') then
    create type public.meal_source as enum ('empty', 'favorite', 'generated', 'manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'meal_status') then
    create type public.meal_status as enum ('empty', 'ready', 'regenerating');
  end if;
  if not exists (select 1 from pg_type where typname = 'job_type') then
    create type public.job_type as enum (
      'generate_menu',
      'regenerate_meals',
      'generate_shopping'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type public.job_status as enum ('queued', 'running', 'done', 'error');
  end if;
  if not exists (select 1 from pg_type where typname = 'shopping_status') then
    create type public.shopping_status as enum ('generating', 'ready');
  end if;
  if not exists (select 1 from pg_type where typname = 'ingredient_category') then
    create type public.ingredient_category as enum (
      'produce',
      'dairy',
      'meat',
      'bakery',
      'pantry',
      'frozen',
      'spices',
      'other'
    );
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key,
  display_name text not null default 'Chef',
  created_at timestamptz not null default now()
);

create table if not exists public.diet_tags (
  slug text primary key,
  label text not null
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category public.ingredient_category not null default 'other',
  default_unit text not null default 'g',
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  slot public.meal_slot,
  diet_tags text[] not null default '{}',
  embedding vector(1536),
  has_ingredients boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists recipes_name_lower_idx on public.recipes (lower(name));

create table if not exists public.recipe_ingredients (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  quantity numeric not null,
  unit text not null default 'g',
  notes text,
  primary key (recipe_id, ingredient_id)
);

create table if not exists public.user_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  slot public.meal_slot,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.menu_status not null default 'draft',
  portions int not null default 4 check (portions > 0),
  meals_per_slot jsonb not null default '{"breakfast": 1, "dinner": 1, "supper": 1}'::jsonb,
  diet_tags text[] not null default '{}',
  approved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_meals (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  slot public.meal_slot not null,
  position int not null check (position >= 0),
  recipe_id uuid references public.recipes (id) on delete set null,
  display_name text,
  source public.meal_source not null default 'empty',
  status public.meal_status not null default 'empty',
  regenerate_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (menu_id, slot, position)
);

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null unique references public.menus (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.shopping_status not null default 'generating',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists (id) on delete cascade,
  ingredient_id uuid references public.ingredients (id) on delete set null,
  name text not null,
  category public.ingredient_category not null default 'other',
  quantity numeric not null default 1,
  unit text not null default 'pcs',
  is_manual boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  type public.job_type not null,
  status public.job_status not null default 'queued',
  request jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menus_user_created_idx
  on public.menus (user_id, created_at desc);

create index if not exists menu_meals_menu_slot_idx
  on public.menu_meals (menu_id, slot, position);

create index if not exists shopping_list_items_list_idx
  on public.shopping_list_items (shopping_list_id, sort_order);

create index if not exists generation_jobs_menu_idx
  on public.generation_jobs (menu_id, created_at desc);

create index if not exists user_favorites_user_idx
  on public.user_favorites (user_id);

create index if not exists recipes_embedding_hnsw
  on public.recipes
  using hnsw (embedding vector_cosine_ops);

create index if not exists ingredients_embedding_hnsw
  on public.ingredients
  using hnsw (embedding vector_cosine_ops);

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

drop trigger if exists menus_set_updated_at on public.menus;
create trigger menus_set_updated_at
  before update on public.menus
  for each row execute function public.set_updated_at();

drop trigger if exists menu_meals_set_updated_at on public.menu_meals;
create trigger menu_meals_set_updated_at
  before update on public.menu_meals
  for each row execute function public.set_updated_at();

drop trigger if exists shopping_lists_set_updated_at on public.shopping_lists;
create trigger shopping_lists_set_updated_at
  before update on public.shopping_lists
  for each row execute function public.set_updated_at();

drop trigger if exists generation_jobs_set_updated_at on public.generation_jobs;
create trigger generation_jobs_set_updated_at
  before update on public.generation_jobs
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.diet_tags enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.user_favorites enable row level security;
alter table public.menus enable row level security;
alter table public.menu_meals enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.generation_jobs enable row level security;

drop policy if exists diet_tags_read on public.diet_tags;
create policy diet_tags_read on public.diet_tags for select using (true);

drop policy if exists ingredients_read on public.ingredients;
create policy ingredients_read on public.ingredients for select using (true);

drop policy if exists recipes_read on public.recipes;
create policy recipes_read on public.recipes for select using (true);

drop policy if exists recipe_ingredients_read on public.recipe_ingredients;
create policy recipe_ingredients_read on public.recipe_ingredients for select using (true);

drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles
  for all using (id = public.current_app_user_id())
  with check (id = public.current_app_user_id());

drop policy if exists user_favorites_own on public.user_favorites;
create policy user_favorites_own on public.user_favorites
  for all using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists menus_own on public.menus;
create policy menus_own on public.menus
  for all using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists menu_meals_own on public.menu_meals;
create policy menu_meals_own on public.menu_meals
  for all using (
    exists (
      select 1 from public.menus m
      where m.id = menu_id and m.user_id = public.current_app_user_id()
    )
  )
  with check (
    exists (
      select 1 from public.menus m
      where m.id = menu_id and m.user_id = public.current_app_user_id()
    )
  );

drop policy if exists shopping_lists_own on public.shopping_lists;
create policy shopping_lists_own on public.shopping_lists
  for all using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists shopping_list_items_own on public.shopping_list_items;
create policy shopping_list_items_own on public.shopping_list_items
  for all using (
    exists (
      select 1 from public.shopping_lists s
      where s.id = shopping_list_id and s.user_id = public.current_app_user_id()
    )
  )
  with check (
    exists (
      select 1 from public.shopping_lists s
      where s.id = shopping_list_id and s.user_id = public.current_app_user_id()
    )
  );

drop policy if exists generation_jobs_own on public.generation_jobs;
create policy generation_jobs_own on public.generation_jobs
  for all using (
    exists (
      select 1 from public.menus m
      where m.id = menu_id and m.user_id = public.current_app_user_id()
    )
  )
  with check (
    exists (
      select 1 from public.menus m
      where m.id = menu_id and m.user_id = public.current_app_user_id()
    )
  );

-- Realtime for HITL updates
do $$
begin
  begin
    alter publication supabase_realtime add table public.menus;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.menu_meals;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.shopping_lists;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.shopping_list_items;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.generation_jobs;
  exception when duplicate_object then null;
  end;
end
$$;

insert into public.diet_tags (slug, label) values
  ('vegetarian', 'Vegetarian'),
  ('vegan', 'Vegan'),
  ('low_fat', 'Low fat'),
  ('high_protein', 'High protein'),
  ('gluten_free', 'Gluten free'),
  ('dairy_free', 'Dairy free')
on conflict (slug) do nothing;

insert into public.profiles (id, display_name)
values ('00000000-0000-4000-8000-000000000001', 'Demo chef')
on conflict (id) do nothing;

-- Seed catalog so favorites picker and shopping cache are usable before n8n exists
insert into public.ingredients (id, name, category, default_unit) values
  ('10000000-0000-4000-8000-000000000001', 'rolled oats', 'pantry', 'g'),
  ('10000000-0000-4000-8000-000000000002', 'greek yogurt', 'dairy', 'g'),
  ('10000000-0000-4000-8000-000000000003', 'blueberries', 'produce', 'g'),
  ('10000000-0000-4000-8000-000000000004', 'honey', 'pantry', 'ml'),
  ('10000000-0000-4000-8000-000000000005', 'red lentils', 'pantry', 'g'),
  ('10000000-0000-4000-8000-000000000006', 'onion', 'produce', 'pcs'),
  ('10000000-0000-4000-8000-000000000007', 'carrot', 'produce', 'pcs'),
  ('10000000-0000-4000-8000-000000000008', 'vegetable stock', 'pantry', 'ml'),
  ('10000000-0000-4000-8000-000000000009', 'canned tomatoes', 'pantry', 'g'),
  ('10000000-0000-4000-8000-000000000010', 'tomato', 'produce', 'pcs'),
  ('10000000-0000-4000-8000-000000000011', 'garlic', 'produce', 'pcs'),
  ('10000000-0000-4000-8000-000000000012', 'olive oil', 'pantry', 'ml')
on conflict (name) do nothing;

insert into public.recipes (id, name, description, slot, diet_tags, has_ingredients, created_by) values
  (
    '20000000-0000-4000-8000-000000000001',
    'Overnight oats',
    'Oats soaked with yogurt and berries.',
    'breakfast',
    array['vegetarian', 'high_protein'],
    true,
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Lentil stew',
    'Hearty red lentils with onion and carrot.',
    'dinner',
    array['vegetarian', 'vegan', 'low_fat', 'high_protein'],
    true,
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'Tomato soup',
    'Simple tomato soup with garlic and olive oil.',
    'supper',
    array['vegetarian', 'vegan', 'low_fat'],
    true,
    '00000000-0000-4000-8000-000000000001'
  )
on conflict (id) do nothing;

insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 80, 'g'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 120, 'g'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 80, 'g'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 15, 'ml'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', 180, 'g'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', 1, 'pcs'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000007', 2, 'pcs'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000008', 400, 'ml'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000009', 400, 'g'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000010', 2, 'pcs'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000011', 2, 'pcs'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000012', 10, 'ml')
on conflict do nothing;

insert into public.user_favorites (user_id, recipe_id, slot) values
  ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'breakfast'),
  ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'dinner'),
  ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'supper')
on conflict do nothing;

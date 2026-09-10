-- Remember which meals each aggregated shopping item came from.

alter table public.shopping_list_items
  add column if not exists used_for text[] not null default '{}';

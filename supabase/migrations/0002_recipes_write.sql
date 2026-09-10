-- Allow the demo/app user to create name-only recipes so meals can be favorited
-- before ingredients exist.

drop policy if exists recipes_insert_own on public.recipes;
create policy recipes_insert_own on public.recipes
  for insert with check (created_by = public.current_app_user_id());

drop policy if exists recipes_update_own on public.recipes;
create policy recipes_update_own on public.recipes
  for update using (
    created_by is null or created_by = public.current_app_user_id()
  )
  with check (
    created_by is null or created_by = public.current_app_user_id()
  );

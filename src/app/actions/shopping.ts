"use server";

import { revalidatePath } from "next/cache";
import { addExtraShoppingItem, editShoppingItem } from "@/data/dal";

export async function addShoppingItemAction(input: {
  shoppingListId: string;
  name: string;
  quantity: number;
  unit: string;
}) {
  await addExtraShoppingItem(
    input.shoppingListId,
    input.name,
    input.quantity,
    input.unit,
  );
  revalidatePath("/");
}

export async function updateShoppingItemAction(input: {
  itemId: string;
  name?: string;
  quantity?: number;
}) {
  await editShoppingItem(input.itemId, input);
  revalidatePath("/");
}

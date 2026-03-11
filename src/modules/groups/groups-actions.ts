"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { cookieConst } from "@/constants/cookies";
import { safeAction } from "@/lib/safe-action";
import { groupsService } from "./groups-service";
import { groupFormSchema } from "./groups-types";

export const mutateGroupAction = safeAction.inputSchema(groupFormSchema).action(async ({ parsedInput }) => {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;
  const branchId = cookieStore.get(cookieConst.SELECTED_BRANCH)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  if (!branchId) {
    return { error: "Filial não selecionada" };
  }

  const payload = {
    name: parsedInput.name,
    description: parsedInput.description,
    branchId,
  };

  if (parsedInput.id) {
    const result = await groupsService().update(parsedInput.id, payload, loggedUserId);

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    revalidatePath("/gestao/grupos");
    revalidatePath(`/gestao/grupos/${parsedInput.id}`);
    return { success: true };
  }

  const result = await groupsService().create(payload, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/grupos");
  return { success: true };
});

export async function deleteGroupAction(id: string) {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const result = await groupsService().delete(id, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/grupos");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { cookieConst } from "@/constants/cookies";
import { safeAction } from "@/lib/safe-action";
import { regionsService } from "./regions-service";
import { regionFormSchema } from "./regions-types";

export const mutateRegionAction = safeAction.inputSchema(regionFormSchema).action(async ({ parsedInput }) => {
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
    const result = await regionsService().update(parsedInput.id, payload, loggedUserId);

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    revalidatePath("/gestao/regioes");
    revalidatePath(`/gestao/regioes/${parsedInput.id}`);
    return { success: true };
  }

  const result = await regionsService().create(payload, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/regioes");
  return { success: true };
});

export async function deleteRegionAction(id: string) {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const result = await regionsService().delete(id, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/regioes");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { cookieConst } from "@/constants/cookies";
import { safeAction } from "@/lib/safe-action";
import { clientBlocksService } from "./client-blocks-service";
import { clientBlockDeleteSchema, clientBlockMutateSchema } from "./client-blocks-types";

export const banDeliverymanAction = safeAction.inputSchema(clientBlockMutateSchema).action(async ({ parsedInput }) => {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const result = await clientBlocksService().ban(parsedInput, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/operacional/monitoramento/diario");
  revalidatePath("/operacional/monitoramento/semanal");
  revalidatePath(`/gestao/entregadores/${parsedInput.deliverymanId}`);
  return { success: true };
});

export const unbanDeliverymanAction = safeAction
  .inputSchema(clientBlockDeleteSchema)
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();
    const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

    if (!loggedUserId) {
      return { error: "Usuário não autenticado" };
    }

    const result = await clientBlocksService().unban(parsedInput, loggedUserId);

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    revalidatePath("/operacional/monitoramento/diario");
    revalidatePath("/operacional/monitoramento/semanal");
    revalidatePath(`/gestao/entregadores/${parsedInput.deliverymanId}`);
    return { success: true };
  });

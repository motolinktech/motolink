"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { cookieConst } from "@/constants/cookies";
import { safeAction } from "@/lib/safe-action";
import { workShiftSlotsService } from "./work-shift-slots-service";
import { workShiftSlotMutateSchema, workShiftSlotUpdateTimesSchema } from "./work-shift-slots-types";

const updateStatusInputSchema = z.object({
  id: z.string().uuid({ message: "ID do turno inválido" }),
  status: z.string().min(1, { message: "Status é obrigatório" }),
});

const mutateInputSchema = workShiftSlotMutateSchema.extend({
  id: z.string().uuid({ message: "ID do turno inválido" }).optional(),
});

export const updateWorkShiftSlotStatusAction = safeAction
  .inputSchema(updateStatusInputSchema)
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();
    const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

    if (!loggedUserId) {
      return { error: "Usuário não autenticado" };
    }

    const result = await workShiftSlotsService().updateStatus(parsedInput.id, parsedInput.status, loggedUserId);

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    revalidatePath("/operacional/monitoramento/diario");
    revalidatePath("/operacional/monitoramento/semanal");
    return { success: true };
  });

export const updateWorkShiftSlotTimesAction = safeAction
  .inputSchema(workShiftSlotUpdateTimesSchema)
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();
    const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

    if (!loggedUserId) {
      return { error: "Usuário não autenticado" };
    }

    const result = await workShiftSlotsService().updateTimes(parsedInput, loggedUserId);

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    revalidatePath("/operacional/monitoramento/diario");
    revalidatePath("/operacional/monitoramento/semanal");
    return { success: true };
  });

export const mutateWorkShiftSlotAction = safeAction.inputSchema(mutateInputSchema).action(async ({ parsedInput }) => {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const { id, ...body } = parsedInput;
  const result = await workShiftSlotsService().upsert(id, body, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/operacional/monitoramento/diario");
  return { success: true };
});

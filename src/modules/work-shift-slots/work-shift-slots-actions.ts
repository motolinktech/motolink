"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { cookieConst } from "@/constants/cookies";
import { historyTraceEntityConst } from "@/constants/history-trace";
import { db } from "@/lib/database";
import { safeAction } from "@/lib/safe-action";
import { historyTracesService } from "../history-traces/history-traces-service";
import { workShiftSlotsService } from "./work-shift-slots-service";
import {
  discountCancelSchema,
  discountMutateSchema,
  respondToInviteSchema,
  sendBulkInviteSchema,
  sendInviteSchema,
  workShiftSlotCopySchema,
  workShiftSlotMutateSchema,
  workShiftSlotToggleTrackingSchema,
  workShiftSlotUpdateTimesSchema,
} from "./work-shift-slots-types";

const updateStatusInputSchema = z.object({
  id: z.string().uuid({ message: "ID do turno inválido" }),
  status: z.string().min(1, { message: "Status é obrigatório" }),
  absentReason: z.string().optional(),
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

    if (parsedInput.status === "ABSENT" && !parsedInput.absentReason?.trim()) {
      return { error: "Motivo da ausência é obrigatório" };
    }

    const result = await workShiftSlotsService().updateStatus(
      parsedInput.id,
      parsedInput.status,
      loggedUserId,
      parsedInput.absentReason,
    );

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

export const createDiscountAction = safeAction.inputSchema(discountMutateSchema).action(async ({ parsedInput }) => {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const user = await db.user.findUnique({ where: { id: loggedUserId }, select: { id: true, name: true } });

  if (!user) {
    return { error: "Usuário não encontrado" };
  }

  const result = await workShiftSlotsService().createDiscount(parsedInput, user);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/operacional/monitoramento/diario");
  revalidatePath("/operacional/monitoramento/semanal");
  return { success: true };
});

export const cancelDiscountAction = safeAction.inputSchema(discountCancelSchema).action(async ({ parsedInput }) => {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const user = await db.user.findUnique({ where: { id: loggedUserId }, select: { id: true, name: true } });

  if (!user) {
    return { error: "Usuário não encontrado" };
  }

  const result = await workShiftSlotsService().cancelDiscount(parsedInput.id, user);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/operacional/monitoramento/diario");
  revalidatePath("/operacional/monitoramento/semanal");
  return { success: true };
});

export const copyWorkShiftSlotsAction = safeAction
  .inputSchema(workShiftSlotCopySchema)
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();
    const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

    if (!loggedUserId) {
      return { error: "Usuário não autenticado" };
    }

    const result = await workShiftSlotsService().copySlots(
      parsedInput.sourceDate,
      parsedInput.targetDate,
      parsedInput.clientId,
      loggedUserId,
    );

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    revalidatePath("/operacional/monitoramento/diario");
    revalidatePath("/operacional/monitoramento/semanal");
    return { success: true, degradedCount: result.value.degradedCount };
  });

export const sendInviteAction = safeAction.inputSchema(sendInviteSchema).action(async ({ parsedInput }) => {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const result = await workShiftSlotsService().sendInvite(parsedInput.workShiftSlotId, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/operacional/monitoramento/diario");
  revalidatePath("/operacional/monitoramento/semanal");
  return { success: true };
});

export const respondToInviteAction = safeAction.inputSchema(respondToInviteSchema).action(async ({ parsedInput }) => {
  const result = await workShiftSlotsService().respondToInvite(parsedInput.token, parsedInput.response);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  return { success: true };
});

export const sendBulkInviteAction = safeAction.inputSchema(sendBulkInviteSchema).action(async ({ parsedInput }) => {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const result = await workShiftSlotsService().sendBulkInvite(
    parsedInput.clientId,
    parsedInput.shiftDate,
    loggedUserId,
  );

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/operacional/monitoramento/diario");
  revalidatePath("/operacional/monitoramento/semanal");
  return { success: true, sentCount: result.value.sentCount };
});

export const toggleTrackingConnectedAction = safeAction
  .inputSchema(workShiftSlotToggleTrackingSchema)
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();
    const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

    if (!loggedUserId) {
      return { error: "Usuário não autenticado" };
    }

    const slot = await db.workShiftSlot.findUnique({
      where: { id: parsedInput.id },
      select: { id: true, trackingConnected: true },
    });

    if (!slot) {
      return { error: "Turno não encontrado" };
    }

    const newValue = !slot.trackingConnected;
    const updated = await db.workShiftSlot.update({
      where: { id: parsedInput.id },
      data: {
        trackingConnected: newValue,
        trackingConnectedAt: newValue ? new Date() : null,
      },
    });

    historyTracesService()
      .create({
        userId: loggedUserId,
        action: "UPDATED",
        entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
        entityId: updated.id,
        oldObject: { trackingConnected: slot.trackingConnected },
        newObject: { trackingConnected: updated.trackingConnected },
      })
      .catch(() => {});

    revalidatePath("/operacional/monitoramento/diario");
    revalidatePath("/operacional/monitoramento/semanal");
    return { success: true };
  });

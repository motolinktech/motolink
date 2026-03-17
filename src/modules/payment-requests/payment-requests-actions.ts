"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { cookieConst } from "@/constants/cookies";
import { safeAction } from "@/lib/safe-action";
import { usersService } from "@/modules/users/users-service";
import { paymentRequestsService } from "./payment-requests-service";
import { paymentRequestListQuerySchema, paymentRequestUpdateSchema } from "./payment-requests-types";

export const listPaymentRequestsAction = safeAction
  .inputSchema(paymentRequestListQuerySchema)
  .action(async ({ parsedInput }) => {
    const result = await paymentRequestsService().listAll(parsedInput);

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    return { success: true, ...result.value };
  });

const getByIdInputSchema = z.object({
  id: z.string().uuid({ message: "ID inválido" }),
});

export const getPaymentRequestByIdAction = safeAction
  .inputSchema(getByIdInputSchema)
  .action(async ({ parsedInput }) => {
    const result = await paymentRequestsService().getById(parsedInput.id);

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    return { success: true, data: result.value };
  });

const updateInputSchema = paymentRequestUpdateSchema.extend({
  id: z.string().uuid({ message: "ID inválido" }),
});

export const updatePaymentRequestAction = safeAction.inputSchema(updateInputSchema).action(async ({ parsedInput }) => {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const { id, ...body } = parsedInput;
  const result = await paymentRequestsService().update(id, body, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/financeiro/freelancer");
  revalidatePath("/financeiro/colaborador-independente");
  return { success: true };
});

const updateStatusInputSchema = z.object({
  id: z.string().uuid({ message: "ID inválido" }),
  status: z.string().min(1, { message: "Status é obrigatório" }),
  additionalKm: z.coerce.number().int().nonnegative().optional(),
});

export const updatePaymentRequestStatusAction = safeAction
  .inputSchema(updateStatusInputSchema)
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();
    const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

    if (!loggedUserId) {
      return { error: "Usuário não autenticado" };
    }

    const [userResult, prResult] = await Promise.all([
      usersService().getById(loggedUserId),
      paymentRequestsService().getById(parsedInput.id),
    ]);

    if (prResult.isErr()) {
      return { error: prResult.error.reason };
    }

    if (prResult.value.status === "EDITED" && (userResult.isErr() || userResult.value?.role !== "ADMIN")) {
      return { error: "Apenas administradores podem alterar o status de solicitações editadas" };
    }

    const result = await paymentRequestsService().updateStatus(
      parsedInput.id,
      parsedInput.status,
      loggedUserId,
      parsedInput.additionalKm,
    );

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    revalidatePath("/financeiro/freelancer");
    revalidatePath("/financeiro/colaborador-independente");
    return { success: true };
  });

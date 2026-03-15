"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { cookieConst } from "@/constants/cookies";
import { safeAction } from "@/lib/safe-action";
import { paymentRequestService } from "./payment-request-service";
import { paymentRequestMutateSchema, paymentRequestUpdateSchema } from "./payment-request-types";

export const createPaymentRequestAction = safeAction
  .inputSchema(paymentRequestMutateSchema)
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();
    const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value ?? "";

    const res = await paymentRequestService().create(parsedInput, loggedUserId);

    if (res.isErr()) {
      return { error: res.error.reason };
    }

    revalidatePath("/gestao/solicitacoes-pagamento");
    return { success: true };
  });

export const updatePaymentRequestAction = safeAction
  .inputSchema(paymentRequestUpdateSchema.extend({ id: z.string().uuid({ message: "ID inválido" }) }))
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();
    const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value ?? "";

    const { id, ...body } = parsedInput;

    const res = await paymentRequestService().update(id, body, loggedUserId);

    if (res.isErr()) {
      return { error: res.error.reason };
    }

    revalidatePath("/gestao/solicitacoes-pagamento");
    return { success: true };
  });

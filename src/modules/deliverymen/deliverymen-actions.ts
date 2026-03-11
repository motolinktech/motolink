"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { cookieConst } from "@/constants/cookies";
import { safeAction } from "@/lib/safe-action";
import { cleanMask } from "@/utils/masks/clean-mask";
import { deliverymenService } from "./deliverymen-service";
import { deliverymanFormSchema } from "./deliverymen-types";

function normalizeOptional(value?: string) {
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const mutateDeliverymanAction = safeAction.inputSchema(deliverymanFormSchema).action(async ({ parsedInput }) => {
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
    name: parsedInput.name.trim(),
    document: cleanMask(parsedInput.document),
    phone: cleanMask(parsedInput.phone),
    contractType: parsedInput.contractType,
    mainPixKey: parsedInput.mainPixKey.trim(),
    secondPixKey: normalizeOptional(parsedInput.secondPixKey),
    thridPixKey: normalizeOptional(parsedInput.thridPixKey),
    agency: normalizeOptional(parsedInput.agency),
    account: normalizeOptional(parsedInput.account),
    vehicleModel: normalizeOptional(parsedInput.vehicleModel),
    vehiclePlate: normalizeOptional(parsedInput.vehiclePlate),
    vehicleColor: normalizeOptional(parsedInput.vehicleColor),
    files: parsedInput.files,
    branchId,
    regionId: normalizeOptional(parsedInput.regionId),
  };

  if (parsedInput.id) {
    const result = await deliverymenService().update(parsedInput.id, payload, loggedUserId);

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    revalidatePath("/gestao/entregadores");
    revalidatePath(`/gestao/entregadores/${parsedInput.id}`);
    return { success: true, id: parsedInput.id };
  }

  const result = await deliverymenService().create(payload, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/entregadores");
  revalidatePath(`/gestao/entregadores/${result.value.id}`);
  return { success: true, id: result.value.id };
});

export async function deleteDeliverymanAction(id: string) {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const result = await deliverymenService().delete(id, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/entregadores");
  return { success: true };
}

export async function toggleBlockDeliverymanAction(id: string) {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const result = await deliverymenService().toggleBlock(id, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/entregadores");
  revalidatePath(`/gestao/entregadores/${id}`);
  return { success: true, isBlocked: result.value.isBlocked };
}

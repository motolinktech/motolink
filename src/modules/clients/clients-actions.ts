"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { cookieConst } from "@/constants/cookies";
import { safeAction } from "@/lib/safe-action";
import { cleanMask } from "@/utils/masks/clean-mask";
import { clientsService } from "./clients-service";
import { clientFormSchema } from "./clients-types";

function normalizeOptional(value?: string) {
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const mutateClientAction = safeAction.inputSchema(clientFormSchema).action(async ({ parsedInput }) => {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;
  const branchId = cookieStore.get(cookieConst.SELECTED_BRANCH)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  if (!branchId) {
    return { error: "Filial não selecionada" };
  }

  const clientData = {
    name: parsedInput.name.trim(),
    cnpj: cleanMask(parsedInput.cnpj),
    cep: cleanMask(parsedInput.cep),
    street: parsedInput.street.trim(),
    number: parsedInput.number.trim(),
    complement: normalizeOptional(parsedInput.complement),
    city: parsedInput.city.trim(),
    neighborhood: parsedInput.neighborhood.trim(),
    uf: parsedInput.uf,
    observations: parsedInput.observations ?? "",
    regionId: normalizeOptional(parsedInput.regionId),
    groupId: normalizeOptional(parsedInput.groupId),
    contactName: parsedInput.contactName.trim(),
    contactPhone: cleanMask(parsedInput.contactPhone),
    provideMeal: parsedInput.provideMeal,
    branchId,
  };

  const commData = {
    bagsStatus: parsedInput.bagsStatus,
    bagsAllocated: parsedInput.bagsAllocated,
    paymentForm: parsedInput.paymentForm,
    dailyPeriods: parsedInput.dailyPeriods,
    guaranteedPeriods: parsedInput.guaranteedPeriods,
    deliveryAreaKm: parsedInput.deliveryAreaKm,
    isMotolinkCovered: parsedInput.isMotolinkCovered,
    rainTax: parsedInput.hasRainTax ? parsedInput.rainTax : 0,
    clientDailyDay: parsedInput.clientDailyDay,
    clientDailyNight: parsedInput.clientDailyNight,
    clientDailyDayWknd: parsedInput.clientDailyDayWknd,
    clientDailyNightWknd: parsedInput.clientDailyNightWknd,
    deliverymanDailyDay: parsedInput.deliverymanDailyDay,
    deliverymanDailyNight: parsedInput.deliverymanDailyNight,
    deliverymanDailyDayWknd: parsedInput.deliverymanDailyDayWknd,
    deliverymanDailyNightWknd: parsedInput.deliverymanDailyNightWknd,
    clientPerDelivery: parsedInput.clientPerDelivery,
    clientAdditionalKm: parsedInput.clientAdditionalKm,
    deliverymanPerDelivery: parsedInput.deliverymanPerDelivery,
    deliverymanAdditionalKm: parsedInput.deliverymanAdditionalKm,
    guaranteedDay: parsedInput.guaranteedDay,
    guaranteedNight: parsedInput.guaranteedNight,
    guaranteedDayWeekend: parsedInput.guaranteedDayWeekend,
    guaranteedNightWeekend: parsedInput.guaranteedNightWeekend,
    guaranteedDayTax: parsedInput.guaranteedDayTax,
    guaranteedNightTax: parsedInput.guaranteedNightTax,
    guaranteedDayWeekendTax: parsedInput.guaranteedDayWeekendTax,
    guaranteedNightWeekendTax: parsedInput.guaranteedNightWeekendTax,
  };

  if (parsedInput.id) {
    const result = await clientsService().update(parsedInput.id, { ...clientData, ...commData }, loggedUserId);

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    revalidatePath("/gestao/clientes");
    revalidatePath(`/gestao/clientes/${parsedInput.id}`);
    return { success: true, id: parsedInput.id };
  }

  const result = await clientsService().create(clientData, loggedUserId, commData);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/clientes");
  revalidatePath(`/gestao/clientes/${result.value.id}`);
  return { success: true, id: result.value.id };
});

export async function deleteClientAction(id: string) {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const result = await clientsService().delete(id, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/clientes");
  return { success: true };
}

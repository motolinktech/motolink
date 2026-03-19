"use server";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { cookieConst } from "@/constants/cookies";
import { safeAction } from "@/lib/safe-action";
import { cleanMask } from "@/utils/masks/clean-mask";
import { usersService } from "./users-service";
import { changePasswordSchema, forgotPasswordSchema, newPasswordSchema, userMutateSchema } from "./users-types";

dayjs.extend(customParseFormat);

export const mutateUserAction = safeAction.inputSchema(userMutateSchema).action(async ({ parsedInput }) => {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const payload = {
    name: parsedInput.name,
    email: parsedInput.email,
    phone: parsedInput.phone ? cleanMask(parsedInput.phone) : undefined,
    document: parsedInput.document ? cleanMask(parsedInput.document) : undefined,
    birthDate: parsedInput.birthDate ? dayjs(parsedInput.birthDate, "DD/MM/YYYY").toISOString() : undefined,
    branches: parsedInput.branches,
    role: parsedInput.role,
    permissions: parsedInput.permissions,
    files: parsedInput.files,
  };

  if (parsedInput.id) {
    const result = await usersService().update(parsedInput.id, payload, loggedUserId);

    if (result.isErr()) {
      return { error: result.error.reason };
    }

    revalidatePath("/gestao/colaboradores");
    revalidatePath(`/gestao/colaboradores/${parsedInput.id}`);
    return { success: true };
  }

  const result = await usersService().create(payload, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/colaboradores");
  return { success: true };
});

export const newPasswordAction = safeAction.inputSchema(newPasswordSchema).action(async ({ parsedInput }) => {
  const result = await usersService().setPassword(parsedInput.token, parsedInput.userId, parsedInput.password);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  return { success: true };
});

export const changePasswordAction = safeAction.inputSchema(changePasswordSchema).action(async ({ parsedInput }) => {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  if (loggedUserId !== parsedInput.userId) {
    return { error: "Você só pode alterar sua própria senha" };
  }

  const result = await usersService().changePassword(
    parsedInput.userId,
    parsedInput.oldPassword,
    parsedInput.newPassword,
  );

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  return { success: true };
});

export async function toggleBlockUserAction(id: string) {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const result = await usersService().toggleBlock(id, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/colaboradores");
  revalidatePath(`/gestao/colaboradores/${id}`);
  return { success: true, isBlocked: result.value.status === "BLOCKED" };
}

export async function deleteUserAction(id: string) {
  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!loggedUserId) {
    return { error: "Usuário não autenticado" };
  }

  const result = await usersService().delete(id, loggedUserId);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  revalidatePath("/gestao/colaboradores");
  return { success: true };
}

export const forgotPasswordAction = safeAction.inputSchema(forgotPasswordSchema).action(async ({ parsedInput }) => {
  const result = await usersService().forgotPassword(parsedInput.email);

  if (result.isErr()) {
    return { error: result.error.reason };
  }

  return { success: true };
});

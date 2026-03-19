import z from "zod";
import { passwordRegex } from "@/utils/password-regex";

export const userMutateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.email("E-mail inválido"),
  password: z
    .string()
    .min(8, {
      message: "A senha deve ter no mínimo 8 caracteres",
    })
    .regex(passwordRegex, {
      message:
        "A senha deve conter ao menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial",
    })
    .optional(),
  phone: z.string().optional(),
  document: z.string().min(9, "Documento inválido").max(14).optional(),
  role: z.string().min(1, "Cargo é obrigatório"),
  permissions: z.array(z.string()).default([]),
  branches: z.array(z.string()).min(1, "Selecione pelo menos uma filial"),
  birthDate: z.string().optional(),
  files: z.array(z.string()).optional(),
});

export type UserMutateDTO = z.infer<typeof userMutateSchema>;
export type UserMutateInput = z.input<typeof userMutateSchema>;

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  branchId: z.string().optional(),
  status: z.string().optional(),
});

export type UserListQueryDTO = z.infer<typeof userListQuerySchema>;

export const newPasswordFormSchema = z
  .object({
    token: z.string().min(1, "Token é obrigatório"),
    userId: z.string().min(1, "ID do usuário é obrigatório"),
    password: z.string().min(8, { message: "A senha deve ter no mínimo 8 caracteres" }).regex(passwordRegex, {
      message:
        "A senha deve conter ao menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type NewPasswordFormSchema = z.infer<typeof newPasswordFormSchema>;

export const newPasswordSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  userId: z.string().min(1, "ID do usuário é obrigatório"),
  password: z.string().min(8, { message: "A senha deve ter no mínimo 8 caracteres" }).regex(passwordRegex, {
    message: "A senha deve conter ao menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial",
  }),
});

export type NewPasswordDTO = z.infer<typeof newPasswordSchema>;

export const changePasswordFormSchema = z
  .object({
    userId: z.string().min(1, "ID do usuário é obrigatório"),
    oldPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z.string().min(8, { message: "A senha deve ter no mínimo 8 caracteres" }).regex(passwordRegex, {
      message:
        "A senha deve conter ao menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial",
    }),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "As senhas não coincidem",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormSchema = z.infer<typeof changePasswordFormSchema>;

export const changePasswordSchema = z.object({
  userId: z.string().min(1, "ID do usuário é obrigatório"),
  oldPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(8, { message: "A senha deve ter no mínimo 8 caracteres" }).regex(passwordRegex, {
    message: "A senha deve conter ao menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial",
  }),
});

export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("E-mail inválido"),
});

export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;

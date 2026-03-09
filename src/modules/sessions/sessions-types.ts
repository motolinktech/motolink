import { z } from "zod";
import { passwordRegex } from "@/utils/password-regex";

export const createSessionSchema = z.object({
  email: z.email({
    error: "E-mail inválido",
  }),
  password: z
    .string()
    .min(8, {
      message: "A senha deve ter no mínimo 8 caracteres",
    })
    .regex(passwordRegex, {
      message:
        "A senha deve conter ao menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial",
    }),
});

export type CreateSessionDTO = z.infer<typeof createSessionSchema>;

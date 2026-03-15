import dayjs from "dayjs";
import { z } from "zod";

function normalizeDateOnlyValue(value: unknown) {
  if (value instanceof Date) {
    const parsedDate = dayjs(value);
    return parsedDate.isValid() ? parsedDate.format("YYYY-MM-DD") : value;
  }

  if (typeof value === "string") {
    const parsedDate = dayjs(value);
    return parsedDate.isValid() ? parsedDate.format("YYYY-MM-DD") : value;
  }

  return value;
}

const dateOnlySchema = z.preprocess(
  normalizeDateOnlyValue,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data inválida" }),
);

export const monitoringQuerySchema = z
  .object({
    clientId: z.string().uuid({ message: "ID do cliente inválido" }).optional(),
    groupId: z.string().uuid({ message: "ID do grupo inválido" }).optional(),
    targetDate: dateOnlySchema,
    branchId: z.string().uuid({ message: "ID da filial inválido" }).optional(),
  })
  .superRefine((data, ctx) => {
    const hasClientId = Boolean(data.clientId);
    const hasGroupId = Boolean(data.groupId);

    if (!hasClientId && !hasGroupId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe clientId ou groupId",
        path: ["clientId"],
      });
    }

    if (hasClientId && hasGroupId) {
      const message = "Informe apenas um entre clientId e groupId";

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["clientId"],
      });

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["groupId"],
      });
    }
  });

export type MonitoringQueryDTO = z.infer<typeof monitoringQuerySchema>;

export const monitoringWeeklyQuerySchema = z
  .object({
    clientId: z.string().uuid({ message: "ID do cliente inválido" }).optional(),
    groupId: z.string().uuid({ message: "ID do grupo inválido" }).optional(),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    branchId: z.string().uuid({ message: "ID da filial inválido" }).optional(),
  })
  .superRefine((data, ctx) => {
    const hasClientId = Boolean(data.clientId);
    const hasGroupId = Boolean(data.groupId);

    if (!hasClientId && !hasGroupId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe clientId ou groupId",
        path: ["clientId"],
      });
    }

    if (hasClientId && hasGroupId) {
      const message = "Informe apenas um entre clientId e groupId";

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["clientId"],
      });

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["groupId"],
      });
    }
  });

export type MonitoringWeeklyQueryDTO = z.infer<typeof monitoringWeeklyQuerySchema>;

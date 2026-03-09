import z from "zod";
import { historyTraceActionsArr, historyTraceEntitiesArr } from "@/constants/history-trace";

export const createTraceSchema = z.object({
  userId: z.string().min(1, "userId é obrigatório"),
  action: z.enum(historyTraceActionsArr as [string, ...string[]]),
  entityType: z.enum(historyTraceEntitiesArr as [string, ...string[]]),
  entityId: z.string().min(1, "entityId é obrigatório"),
  newObject: z.record(z.string(), z.any()),
  oldObject: z.record(z.string(), z.any()).optional(),
});

export type CreateTraceDTO = z.infer<typeof createTraceSchema>;

export const historyTraceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  entityType: z.enum(historyTraceEntitiesArr as [string, ...string[]]).optional(),
  userId: z.string().optional(),
  entityId: z.string().optional(),
  action: z.enum(historyTraceActionsArr as [string, ...string[]]).optional(),
});

export type HistoryTraceListQueryDTO = z.infer<typeof historyTraceListQuerySchema>;

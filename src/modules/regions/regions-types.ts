import { z } from "zod";

export const regionMutateSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
  description: z.string().optional(),
  branchId: z.uuid(),
});

export type RegionMutateDTO = z.infer<typeof regionMutateSchema>;

export const regionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  branchId: z.uuid().optional(),
});

export type RegionListQueryDTO = z.infer<typeof regionListQuerySchema>;

import { z } from "zod";

export const paymentRequestMutateSchema = z.object({
  workShiftSlotId: z.string().uuid({ message: "ID do turno é obrigatório" }),
  deliverymanId: z.string().uuid({ message: "ID do entregador é obrigatório" }),
  amount: z.coerce.number().min(0, { message: "Valor deve ser maior ou igual a zero" }),
  status: z.string().min(1, { message: "Status é obrigatório" }).default("NEW"),
  logs: z.array(z.record(z.string(), z.unknown())).default([]),
});

export type PaymentRequestMutateDTO = z.infer<typeof paymentRequestMutateSchema>;

export const paymentRequestUpdateSchema = paymentRequestMutateSchema.partial().extend({
  status: z.string().min(1, { message: "Status é obrigatório" }).optional(),
});

export type PaymentRequestUpdateDTO = z.infer<typeof paymentRequestUpdateSchema>;

export const paymentRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  deliverymanId: z.string().uuid().optional(),
  workShiftSlotId: z.string().uuid().optional(),
  status: z.string().optional(),
});

export type PaymentRequestListQueryDTO = z.infer<typeof paymentRequestListQuerySchema>;

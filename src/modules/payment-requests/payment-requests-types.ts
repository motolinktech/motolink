import { z } from "zod";

export const paymentRequestStatusConst = {
  NEW: "NEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  PAID: "PAID",
  EDITED: "EDITED",
} as const;

export const paymentRequestStatusArr = Object.values(paymentRequestStatusConst);

export const paymentRequestMutateSchema = z.object({
  workShiftSlotId: z.uuid({ message: "ID do turno é obrigatório" }),
  deliverymanId: z.uuid({ message: "ID do entregador é obrigatório" }),
  amount: z.number().positive({ message: "Valor deve ser positivo" }),
  status: z.enum(paymentRequestStatusArr).default("NEW"),
});

export type PaymentRequestMutateDTO = z.infer<typeof paymentRequestMutateSchema>;

export const paymentRequestUpdateSchema = z.object({
  amount: z.number().positive({ message: "Valor deve ser positivo" }).optional(),
  status: z.enum(paymentRequestStatusArr).optional(),
});

export type PaymentRequestUpdateDTO = z.infer<typeof paymentRequestUpdateSchema>;

export const paymentRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  deliverymanId: z.uuid().optional(),
  workShiftSlotId: z.uuid().optional(),
  status: z.enum(paymentRequestStatusArr).optional(),
});

export type PaymentRequestListQueryDTO = z.infer<typeof paymentRequestListQuerySchema>;

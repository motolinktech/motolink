import { z } from "zod";

export const paymentRequestStatusConst = {
  NEW: "NEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  PAID: "PAID",
  EDITED: "EDITED",
  EDITION_APPROVED: "EDITION_APPROVED",
} as const;

export const paymentRequestStatusArr = Object.values(paymentRequestStatusConst);

export const paymentRequestMutateSchema = z.object({
  workShiftSlotId: z.uuid({ message: "ID do turno é obrigatório" }),
  deliverymanId: z.uuid({ message: "ID do entregador é obrigatório" }),
  amount: z.number().finite({ message: "Valor inválido" }),
  discount: z.number().nonnegative({ message: "Desconto não pode ser negativo" }).default(0),
  discountReason: z.string().trim().optional(),
  additionalTax: z.number().nonnegative({ message: "Taxa adicional não pode ser negativa" }).default(0),
  taxReason: z.string().trim().optional(),
  status: z.enum(paymentRequestStatusArr).default("NEW"),
});

export type PaymentRequestMutateDTO = z.infer<typeof paymentRequestMutateSchema>;

export const paymentRequestUpdateSchema = z.object({
  amount: z.number().finite({ message: "Valor inválido" }).optional(),
  discount: z.number().nonnegative({ message: "Desconto não pode ser negativo" }).optional(),
  discountReason: z.string().trim().nullable().optional(),
  additionalTax: z.number().nonnegative({ message: "Taxa adicional não pode ser negativa" }).optional(),
  taxReason: z.string().trim().nullable().optional(),
  status: z.enum(paymentRequestStatusArr).optional(),
});

export type PaymentRequestUpdateDTO = z.infer<typeof paymentRequestUpdateSchema>;

export const paymentRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  deliverymanId: z.uuid().optional(),
  workShiftSlotId: z.uuid().optional(),
  status: z.enum(paymentRequestStatusArr).optional(),
  date: z.string().date().optional(),
  contractType: z.string().optional(),
  clientId: z.uuid().optional(),
  branchId: z.uuid().optional(),
});

export type PaymentRequestListQueryDTO = z.infer<typeof paymentRequestListQuerySchema>;

export type PaymentRequestDashboardSummary = {
  byStatus: { status: string; count: number; amount: number }[];
  totalAmount: number;
  pendingCount: number;
};

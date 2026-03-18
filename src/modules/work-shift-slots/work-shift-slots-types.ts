import { z } from "zod";
import { isDateKey, isTimeString, normalizeTimeString } from "@/utils/date-time";

const dateKeySchema = z.string().refine(isDateKey, { message: "Data inválida" });
const timeStringSchema = z.string().refine(isTimeString, { message: "Hora inválida" }).transform(normalizeTimeString);

export const workShiftSlotMutateSchema = z.object({
  deliverymanId: z.string().uuid({ message: "ID do entregador inválido" }).optional(),
  clientId: z.string().uuid({ message: "ID do cliente é obrigatório" }),
  status: z.string().min(1, { message: "Status é obrigatório" }),
  contractType: z.string().min(1, { message: "Tipo de contrato é obrigatório" }),
  shiftDate: dateKeySchema,
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  period: z.array(z.string()).default(["daytime"]),
  auditStatus: z.string().min(1, { message: "Status de auditoria é obrigatório" }),
  isFreelancer: z.boolean().default(false),
  trackingConnected: z.boolean().default(false),
  deliverymanAmountDay: z.coerce.number().default(0),
  deliverymanAmountNight: z.coerce.number().default(0),
  deliverymanPaymentType: z.string().default(""),
  deliverymenPaymentValue: z.string().default(""),
  paymentForm: z.string().default("DAILY"),
  guaranteedQuantityDay: z.coerce.number().int().default(0),
  guaranteedQuantityNight: z.coerce.number().int().default(0),
  deliverymanPerDeliveryDay: z.coerce.number().default(0),
  deliverymanPerDeliveryNight: z.coerce.number().default(0),
  isWeekendRate: z.boolean().default(false),
  additionalTax: z.coerce.number().default(0),
  additionalTaxReason: z.string().optional(),
  rainTax: z.coerce.number().default(0),
});

export type WorkShiftSlotMutateDTO = z.infer<typeof workShiftSlotMutateSchema>;

export const workShiftSlotListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  clientId: z.string().optional(),
  deliverymanId: z.string().optional(),
  status: z.string().optional(),
  shiftDate: dateKeySchema.optional(),
  groupId: z.string().uuid().optional(),
});

export type WorkShiftSlotListQueryDTO = z.infer<typeof workShiftSlotListQuerySchema>;

export const workShiftSlotUpdateTimesSchema = z.object({
  id: z.string().uuid({ message: "ID do turno inválido" }),
  checkInAt: z.string().nullable(),
  checkOutAt: z.string().nullable(),
});

export type WorkShiftSlotUpdateTimesDTO = z.infer<typeof workShiftSlotUpdateTimesSchema>;

export const discountStatusConst = {
  ACTIVE: "ACTIVE",
  CANCELLED: "CANCELLED",
} as const;

export const discountMutateSchema = z.object({
  workShiftSlotId: z.string().uuid({ message: "ID do turno inválido" }),
  amount: z.coerce.number().positive({ message: "Valor deve ser maior que zero" }),
  reason: z.string().min(1, { message: "Motivo é obrigatório" }),
});

export type DiscountMutateDTO = z.infer<typeof discountMutateSchema>;

export const discountCancelSchema = z.object({
  id: z.string().uuid({ message: "ID do desconto inválido" }),
});

export type DiscountCancelDTO = z.infer<typeof discountCancelSchema>;

export const workShiftSlotCopySchema = z.object({
  sourceDate: dateKeySchema,
  targetDate: dateKeySchema,
  clientId: z.string().uuid({ message: "ID do cliente inválido" }),
});
export type WorkShiftSlotCopyDTO = z.infer<typeof workShiftSlotCopySchema>;

export const sendInviteSchema = z.object({
  workShiftSlotId: z.string().uuid({ message: "ID do turno inválido" }),
});

export type SendInviteDTO = z.infer<typeof sendInviteSchema>;

export const sendBulkInviteSchema = z.object({
  clientId: z.string().uuid({ message: "ID do cliente inválido" }),
  shiftDate: dateKeySchema,
});

export type SendBulkInviteDTO = z.infer<typeof sendBulkInviteSchema>;

export const respondToInviteSchema = z.object({
  token: z.string().min(1, { message: "Token é obrigatório" }),
  response: z.enum(["ACCEPTED", "REJECTED"], { message: "Resposta inválida" }),
});

export type RespondToInviteDTO = z.infer<typeof respondToInviteSchema>;

export const workShiftSlotToggleTrackingSchema = z.object({
  id: z.string().uuid({ message: "ID do turno inválido" }),
});

export type WorkShiftSlotToggleTrackingDTO = z.infer<typeof workShiftSlotToggleTrackingSchema>;

export type WorkShiftSlotDashboardSummary = {
  byStatus: { status: string; count: number }[];
  total: number;
  confirmedCount: number;
  byContractType: {
    freelancer: number;
    independentCollaborator: number;
  };
};

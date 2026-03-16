import { z } from "zod";

export const workShiftSlotMutateSchema = z.object({
  deliverymanId: z.string().uuid({ message: "ID do entregador inválido" }).optional(),
  clientId: z.string().uuid({ message: "ID do cliente é obrigatório" }),
  status: z.string().min(1, { message: "Status é obrigatório" }),
  contractType: z.string().min(1, { message: "Tipo de contrato é obrigatório" }),
  shiftDate: z.coerce.date({ message: "Data do turno é obrigatória" }),
  startTime: z.coerce.date({ message: "Hora de início é obrigatória" }),
  endTime: z.coerce.date({ message: "Hora de término é obrigatória" }),
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
});

export type WorkShiftSlotMutateDTO = z.infer<typeof workShiftSlotMutateSchema>;

export const workShiftSlotListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  clientId: z.string().optional(),
  deliverymanId: z.string().optional(),
  status: z.string().optional(),
  shiftDate: z.coerce.date().optional(),
  groupId: z.string().uuid().optional(),
});

export type WorkShiftSlotListQueryDTO = z.infer<typeof workShiftSlotListQuerySchema>;

export const workShiftSlotUpdateTimesSchema = z.object({
  id: z.string().uuid({ message: "ID do turno inválido" }),
  checkInAt: z.string().nullable(),
  checkOutAt: z.string().nullable(),
});

export type WorkShiftSlotUpdateTimesDTO = z.infer<typeof workShiftSlotUpdateTimesSchema>;

import { z } from "zod";

export const clientMutateSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
  cnpj: z.string().min(1, { message: "CNPJ é obrigatório" }),
  cep: z.string().min(1, { message: "CEP é obrigatório" }),
  street: z.string().min(1, { message: "Rua é obrigatória" }),
  number: z.string().min(1, { message: "Número é obrigatório" }),
  complement: z.string().optional(),
  city: z.string().min(1, { message: "Cidade é obrigatória" }),
  neighborhood: z.string().min(1, { message: "Bairro é obrigatório" }),
  uf: z.string().min(2, { message: "UF deve ter 2 caracteres" }).max(2, { message: "UF deve ter 2 caracteres" }),
  observations: z.string().default(""),
  regionId: z.string().uuid({ message: "ID da região inválido" }).optional(),
  groupId: z.string().uuid({ message: "ID do grupo inválido" }).optional(),
  contactName: z.string().min(1, { message: "Nome do contato é obrigatório" }),
  contactPhone: z.string().default(""),
  provideMeal: z.boolean().default(false),
  branchId: z.string().uuid({ message: "ID da filial inválido" }),
});

export type ClientMutateDTO = z.infer<typeof clientMutateSchema>;

export const clientCommercialConditionSchema = z.object({
  bagsStatus: z.string().optional(),
  bagsAllocated: z.coerce.number().int().optional(),
  paymentForm: z.array(z.string()).optional(),
  dailyPeriods: z.array(z.string()).optional(),
  guaranteedPeriods: z.array(z.string()).optional(),
  deliveryAreaKm: z.coerce.number().optional(),
  isMotolinkCovered: z.boolean().optional(),
  rainTax: z.coerce.number().optional(),
  guaranteedDay: z.coerce.number().int().optional(),
  guaranteedDayWeekend: z.coerce.number().int().optional(),
  guaranteedNight: z.coerce.number().int().optional(),
  guaranteedNightWeekend: z.coerce.number().int().optional(),
  guaranteedDayTax: z.coerce.number().optional(),
  guaranteedNightTax: z.coerce.number().optional(),
  guaranteedDayWeekendTax: z.coerce.number().optional(),
  guaranteedNightWeekendTax: z.coerce.number().optional(),
  clientDailyDay: z.coerce.number().optional(),
  clientDailyDayWknd: z.coerce.number().optional(),
  clientDailyNight: z.coerce.number().optional(),
  clientDailyNightWknd: z.coerce.number().optional(),
  clientPerDelivery: z.coerce.number().optional(),
  clientAdditionalKm: z.coerce.number().optional(),
  deliverymanDailyDay: z.coerce.number().optional(),
  deliverymanDailyDayWknd: z.coerce.number().optional(),
  deliverymanDailyNight: z.coerce.number().optional(),
  deliverymanDailyNightWknd: z.coerce.number().optional(),
  deliverymanPerDelivery: z.coerce.number().optional(),
  deliverymanAdditionalKm: z.coerce.number().optional(),
});

export const clientUpdateSchema = clientMutateSchema.merge(clientCommercialConditionSchema);

export type ClientUpdateDTO = z.infer<typeof clientUpdateSchema>;

export const clientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  groupId: z.string().optional(),
  regionId: z.string().optional(),
  branchId: z.string().optional(),
});

export type ClientListQueryDTO = z.infer<typeof clientListQuerySchema>;

export const clientFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  cnpj: z.string().min(1, "CNPJ é obrigatório"),
  contactName: z.string().min(1, "Nome do contato é obrigatório"),
  contactPhone: z.string().default(""),
  observations: z.string().default(""),
  cep: z.string().min(1, "CEP é obrigatório"),
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  uf: z.string().min(2, "UF é obrigatória").max(2),
  regionId: z.string().optional(),
  groupId: z.string().optional(),
  provideMeal: z.boolean().default(false),
  bagsStatus: z.string().default("UNKNOWN"),
  bagsAllocated: z.coerce.number().int().default(0),
  hasRainTax: z.boolean().default(false),
  rainTax: z.coerce.number().default(0),
  deliveryAreaKm: z.coerce.number().default(0),
  isMotolinkCovered: z.boolean().default(false),
  paymentForm: z.array(z.string()).default([]),
  dailyPeriods: z.array(z.string()).default([]),
  guaranteedPeriods: z.array(z.string()).default([]),
  clientDailyDay: z.coerce.number().default(0),
  clientDailyNight: z.coerce.number().default(0),
  clientDailyDayWknd: z.coerce.number().default(0),
  clientDailyNightWknd: z.coerce.number().default(0),
  deliverymanDailyDay: z.coerce.number().default(0),
  deliverymanDailyNight: z.coerce.number().default(0),
  deliverymanDailyDayWknd: z.coerce.number().default(0),
  deliverymanDailyNightWknd: z.coerce.number().default(0),
  clientPerDelivery: z.coerce.number().default(0),
  clientAdditionalKm: z.coerce.number().default(0),
  deliverymanPerDelivery: z.coerce.number().default(0),
  deliverymanAdditionalKm: z.coerce.number().default(0),
  guaranteedDay: z.coerce.number().int().default(0),
  guaranteedNight: z.coerce.number().int().default(0),
  guaranteedDayWeekend: z.coerce.number().int().default(0),
  guaranteedNightWeekend: z.coerce.number().int().default(0),
  guaranteedDayTax: z.coerce.number().default(0),
  guaranteedNightTax: z.coerce.number().default(0),
  guaranteedDayWeekendTax: z.coerce.number().default(0),
  guaranteedNightWeekendTax: z.coerce.number().default(0),
});

export type ClientFormInput = z.infer<typeof clientFormSchema>;
export type ClientFormValues = z.input<typeof clientFormSchema>;

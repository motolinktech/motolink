import { z } from "zod";

export const deliverymanFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  document: z.string().min(1, "Documento é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  contractType: z.string().min(1, "Tipo de contrato é obrigatório"),
  mainPixKey: z.string().min(1, "Chave Pix principal é obrigatória"),
  secondPixKey: z.string().optional(),
  thridPixKey: z.string().optional(),
  agency: z.string().optional(),
  account: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehiclePlate: z.string().optional(),
  vehicleColor: z.string().optional(),
  files: z.array(z.string()).default([]),
  regionId: z.string().optional(),
});

export type DeliverymanFormInput = z.infer<typeof deliverymanFormSchema>;
export type DeliverymanFormValues = z.input<typeof deliverymanFormSchema>;

export const deliverymanMutateSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
  document: z.string().min(1, { message: "Documento é obrigatório" }),
  phone: z.string().min(1, { message: "Telefone é obrigatório" }),
  contractType: z.string().min(1, { message: "Tipo de contrato é obrigatório" }),
  mainPixKey: z.string().min(1, { message: "Chave Pix principal é obrigatória" }),
  secondPixKey: z.string().optional(),
  thridPixKey: z.string().optional(),
  agency: z.string().optional(),
  account: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehiclePlate: z.string().optional(),
  vehicleColor: z.string().optional(),
  files: z.array(z.string()).default([]),
  branchId: z.uuid(),
  regionId: z.uuid().optional(),
});

export type DeliverymanMutateDTO = z.infer<typeof deliverymanMutateSchema>;

export const deliverymanListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  branchId: z.uuid().optional(),
  regionId: z.uuid().optional(),
  excludeClientId: z.string().uuid().optional(),
  excludeBlocked: z.coerce.boolean().optional(),
});

export type DeliverymanListQueryDTO = z.infer<typeof deliverymanListQuerySchema>;

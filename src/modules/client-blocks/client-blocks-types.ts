import { z } from "zod";

export const clientBlockMutateSchema = z.object({
  deliverymanId: z.string().uuid({ message: "ID do entregador inválido" }),
  clientId: z.string().uuid({ message: "ID do cliente inválido" }),
  reason: z.string().min(1, { message: "Motivo é obrigatório" }),
});

export type ClientBlockMutateDTO = z.infer<typeof clientBlockMutateSchema>;

export const clientBlockDeleteSchema = z.object({
  deliverymanId: z.string().uuid({ message: "ID do entregador inválido" }),
  clientId: z.string().uuid({ message: "ID do cliente inválido" }),
});

export type ClientBlockDeleteDTO = z.infer<typeof clientBlockDeleteSchema>;

export interface DeliverymanBanHistoryItem {
  id: string;
  clientId: string;
  clientName: string;
  reason: string | null;
  createdAt: Date;
  removedAt: Date | null;
  isActive: boolean;
}

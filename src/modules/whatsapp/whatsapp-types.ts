import type { WhatsappMessageType } from "@/constants/whatsapp";

export type SendInviteDTO = {
  phone: string;
  branchId: string;
  type: WhatsappMessageType;
  content: Record<string, unknown>;
};

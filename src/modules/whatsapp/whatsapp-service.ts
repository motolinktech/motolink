import { errAsync, okAsync } from "neverthrow";
import type { WhatsappMessageType } from "@/constants/whatsapp";
import { db } from "../../lib/database";
import type { SendInviteDTO } from "./whatsapp-types";

// TODO: migrate the msg template to the real one
const MESSAGE_TEMPLATES: Record<WhatsappMessageType, (content: Record<string, unknown>) => string> = {
  WORK_SHIFT: (content) => `[Turno de Trabalho] ${JSON.stringify(content)}`,
  INTERNAL: (content) => `[Interno] ${JSON.stringify(content)}`,
};

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `${withCountry}@c.us`;
}

export function whatsappService() {
  return {
    async sendInvite({ phone, branchId, type, content }: SendInviteDTO) {
      try {
        const branch = await db.branch.findUnique({ where: { id: branchId } });

        if (!branch) {
          return errAsync({ reason: "Filial não encontrada", statusCode: 404 });
        }

        if (!branch.whatsappUrl || !branch.whatsappApiKey) {
          return errAsync({
            reason: "Filial não possui WhatsApp configurado",
            statusCode: 422,
          });
        }

        const chatId = formatPhone(phone);
        const text = MESSAGE_TEMPLATES[type](content);

        const response = await fetch(`${branch.whatsappUrl}/api/sendText`, {
          method: "POST",
          headers: {
            "X-Api-Key": branch.whatsappApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chatId, text }),
        });

        if (!response.ok) {
          return errAsync({
            reason: "Não foi possível enviar a mensagem pelo WhatsApp",
            statusCode: 502,
          });
        }

        return okAsync(null);
      } catch (error) {
        console.error("Error sending WhatsApp invite:", error);
        return errAsync({
          reason: "Não foi possível enviar a mensagem pelo WhatsApp",
          statusCode: 502,
        });
      }
    },
  };
}

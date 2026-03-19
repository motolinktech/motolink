import { errAsync, okAsync } from "neverthrow";
import type { WhatsappMessageType } from "@/constants/whatsapp";
import { db } from "../../lib/database";
import type { SendInviteDTO } from "./whatsapp-types";

// TODO: migrate the msg template to the real one
const MESSAGE_TEMPLATES: Record<WhatsappMessageType, (content: Record<string, unknown>) => string> = {
  WORK_SHIFT: (content) => `👋🏻 Olá, ${content.deliverymanName}. Tudo bem? \n
Você está convidado, de forma eventual e facultativa, a manifestar interesse em uma prestação de serviço autônoma, na modalidade entrega, na data abaixo descrita.
A participação não é obrigatória, não gera exclusividade, subordinação, habitualidade ou qualquer tipo de vínculo empregatício, tratando-se de atividade pontual, conforme sua disponibilidade e livre escolha.\n\n
📄 Informações da Prestação de Serviço:
Data: ${content.shiftDate}
Cliente: ${content.clientName}
Prestador: ${content.deliverymanName}
Local de apoio: ${content.clientAddress}
Período estimado: ${content.startTime} - ${content.endTime}\n\n
Caso tenha interesse, você poderá aceitar ou recusar livremente por meio do link abaixo:\n\n
👉 ${process.env.NEXT_PUBLIC_APP_URL}/confirmar-escala?token=${content.token}`,
  FORGOT_PASSWORD: (content) =>
    `🔐 Olá, ${content.name}. Recebemos uma solicitação para redefinir sua senha no Sistema Motolink.\n\nAcesse o link abaixo para criar uma nova senha:\n\n👉 ${process.env.NEXT_PUBLIC_APP_URL}/trocar-senha?token=${content.token}&userId=${content.userId}\n\nSe você não solicitou essa alteração, entre em contato com o administrador.`,
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

        const requestBody = {
          chatId: `${chatId}`,
          text: text,
          session: "default",
        };
        const url = `${branch.whatsappUrl}/api/sendText`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": branch.whatsappApiKey || "",
          },
          body: JSON.stringify(requestBody),
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

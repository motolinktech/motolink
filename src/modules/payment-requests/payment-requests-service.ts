import { errAsync, okAsync } from "neverthrow";
import { historyTraceActionConst, historyTraceEntityConst } from "@/constants/history-trace";
import { db } from "@/lib/database";
import { convertDecimals } from "@/utils/convert-decimals";
import { historyTracesService } from "../history-traces/history-traces-service";
import type {
  PaymentRequestListQueryDTO,
  PaymentRequestMutateDTO,
  PaymentRequestUpdateDTO,
} from "./payment-requests-types";

export function paymentRequestsService() {
  return {
    async create(body: PaymentRequestMutateDTO, loggedUserId: string) {
      try {
        const paymentRequest = await db.paymentRequest.create({ data: body });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.CREATED,
            entityType: historyTraceEntityConst.PAYMENT_REQUEST,
            entityId: paymentRequest.id,
            newObject: paymentRequest,
          })
          .catch(() => {});

        return okAsync(convertDecimals(paymentRequest));
      } catch (error) {
        console.error("Error creating payment request:", error);
        return errAsync({ reason: "Não foi possível criar a solicitação de pagamento", statusCode: 500 });
      }
    },

    async update(id: string, body: PaymentRequestUpdateDTO, loggedUserId: string) {
      try {
        const existing = await db.paymentRequest.findUnique({ where: { id } });

        if (!existing) {
          return errAsync({ reason: "Solicitação de pagamento não encontrada", statusCode: 404 });
        }

        const updated = await db.paymentRequest.update({ where: { id }, data: body });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.PAYMENT_REQUEST,
            entityId: updated.id,
            oldObject: existing,
            newObject: updated,
          })
          .catch(() => {});

        return okAsync(convertDecimals(updated));
      } catch (error) {
        console.error("Error updating payment request:", error);
        return errAsync({ reason: "Não foi possível atualizar a solicitação de pagamento", statusCode: 500 });
      }
    },

    async getById(id: string) {
      try {
        const paymentRequest = await db.paymentRequest.findUnique({
          where: { id },
          include: { deliveryman: true, workShiftSlot: true },
        });

        if (!paymentRequest) {
          return errAsync({ reason: "Solicitação de pagamento não encontrada", statusCode: 404 });
        }

        return okAsync(convertDecimals(paymentRequest));
      } catch (error) {
        console.error("Error fetching payment request:", error);
        return errAsync({ reason: "Não foi possível buscar a solicitação de pagamento", statusCode: 500 });
      }
    },

    async updateStatus(id: string, status: string, loggedUserId: string) {
      try {
        const existing = await db.paymentRequest.findUnique({ where: { id } });

        if (!existing) {
          return errAsync({ reason: "Solicitação de pagamento não encontrada", statusCode: 404 });
        }

        const updated = await db.paymentRequest.update({ where: { id }, data: { status } });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.PAYMENT_REQUEST,
            entityId: updated.id,
            oldObject: existing,
            newObject: updated,
          })
          .catch(() => {});

        return okAsync(convertDecimals(updated));
      } catch (error) {
        console.error("Error updating payment request status:", error);
        return errAsync({ reason: "Não foi possível atualizar o status da solicitação de pagamento", statusCode: 500 });
      }
    },

    async listAll(query: PaymentRequestListQueryDTO) {
      try {
        const { page, pageSize, deliverymanId, workShiftSlotId, status } = query;
        const skip = (page - 1) * pageSize;

        const where = {
          ...(deliverymanId && { deliverymanId }),
          ...(workShiftSlotId && { workShiftSlotId }),
          ...(status && { status }),
        };

        const [total, data] = await Promise.all([
          db.paymentRequest.count({ where }),
          db.paymentRequest.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
          }),
        ]);

        return okAsync({
          data: data.map(convertDecimals),
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        });
      } catch (error) {
        console.error("Error listing payment requests:", error);
        return errAsync({ reason: "Não foi possível listar as solicitações de pagamento", statusCode: 500 });
      }
    },
  };
}

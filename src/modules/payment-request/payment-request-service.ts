import { errAsync, okAsync } from "neverthrow";
import type { Prisma } from "@/../generated/prisma/client";
import { historyTraceActionConst, historyTraceEntityConst } from "@/constants/history-trace";
import { db } from "@/lib/database";
import { historyTracesService } from "../history-traces/history-traces-service";
import type {
  PaymentRequestListQueryDTO,
  PaymentRequestMutateDTO,
  PaymentRequestUpdateDTO,
} from "./payment-request-types";

export function paymentRequestService() {
  return {
    async create(body: PaymentRequestMutateDTO, loggedUserId: string) {
      try {
        const paymentRequest = await db.paymentRequest.create({
          data: {
            workShiftSlotId: body.workShiftSlotId,
            deliverymanId: body.deliverymanId,
            amount: body.amount,
            status: body.status,
            logs: body.logs as Prisma.InputJsonValue[],
          },
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.CREATED,
            entityType: historyTraceEntityConst.PAYMENT_REQUEST,
            entityId: paymentRequest.id,
            newObject: paymentRequest,
          })
          .catch(() => {});

        return okAsync(paymentRequest);
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

        const updateData: Prisma.PaymentRequestUncheckedUpdateInput = {
          ...(body.workShiftSlotId !== undefined && { workShiftSlotId: body.workShiftSlotId }),
          ...(body.deliverymanId !== undefined && { deliverymanId: body.deliverymanId }),
          ...(body.amount !== undefined && { amount: body.amount }),
          ...(body.status !== undefined && { status: body.status }),
          ...(body.logs !== undefined && { logs: body.logs as Prisma.InputJsonValue[] }),
        };

        const updated = await db.paymentRequest.update({
          where: { id },
          data: updateData,
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.PAYMENT_REQUEST,
            entityId: updated.id,
            newObject: updated,
            oldObject: existing,
          })
          .catch(() => {});

        return okAsync(updated);
      } catch (error) {
        console.error("Error updating payment request:", error);
        return errAsync({ reason: "Não foi possível atualizar a solicitação de pagamento", statusCode: 500 });
      }
    },

    async getById(id: string) {
      try {
        const paymentRequest = await db.paymentRequest.findUnique({
          where: { id },
          include: {
            deliveryman: true,
            workShiftSlot: true,
          },
        });

        if (!paymentRequest) {
          return errAsync({ reason: "Solicitação de pagamento não encontrada", statusCode: 404 });
        }

        return okAsync(paymentRequest);
      } catch (error) {
        console.error("Error fetching payment request:", error);
        return errAsync({ reason: "Não foi possível buscar a solicitação de pagamento", statusCode: 500 });
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
            include: {
              deliveryman: true,
              workShiftSlot: true,
            },
          }),
        ]);

        return okAsync({
          data,
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

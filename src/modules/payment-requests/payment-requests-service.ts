import { errAsync, okAsync } from "neverthrow";
import type { Discount, PaymentRequest, Prisma, WorkShiftSlot } from "@/../generated/prisma/client";
import { historyTraceActionConst, historyTraceEntityConst } from "@/constants/history-trace";
import { db } from "@/lib/database";
import { convertDecimals } from "@/utils/convert-decimals";
import { historyTracesService } from "../history-traces/history-traces-service";
import type {
  PaymentRequestListQueryDTO,
  PaymentRequestMutateDTO,
  PaymentRequestUpdateDTO,
} from "./payment-requests-types";

export type PaymentRequestSyncResult = {
  action: "CREATED" | "UPDATED" | "UNCHANGED";
  paymentRequest: PaymentRequest;
  previousPaymentRequest?: PaymentRequest;
};

type PaymentRequestDbClient = Prisma.TransactionClient | typeof db;

type CompletedSlotForPaymentRequest = WorkShiftSlot & {
  discounts: Pick<Discount, "amount">[];
};

function calculateOperationalAmount(slot: CompletedSlotForPaymentRequest) {
  const activeDiscounts = slot.discounts.reduce((sum, discount) => sum + Number(discount.amount), 0);

  const baseAmount =
    slot.paymentForm === "GUARANTEED"
      ? slot.guaranteedQuantityDay * Number(slot.deliverymanPerDeliveryDay) +
        slot.guaranteedQuantityNight * Number(slot.deliverymanPerDeliveryNight)
      : Number(slot.deliverymanAmountDay) + Number(slot.deliverymanAmountNight);

  return baseAmount + Number(slot.additionalTax) + Number(slot.rainTax) - activeDiscounts;
}

async function loadCompletedSlotForPaymentRequest(tx: PaymentRequestDbClient, workShiftSlotId: string) {
  return tx.workShiftSlot.findUnique({
    where: { id: workShiftSlotId },
    include: {
      discounts: {
        where: { status: "ACTIVE" },
        select: { amount: true },
      },
    },
  });
}

export async function syncPaymentRequestFromCompletedWorkShiftSlot(
  tx: PaymentRequestDbClient,
  workShiftSlotId: string,
): Promise<PaymentRequestSyncResult> {
  const slot = await loadCompletedSlotForPaymentRequest(tx, workShiftSlotId);

  if (!slot) {
    throw new Error("Turno de trabalho não encontrado");
  }

  if (slot.status !== "COMPLETED") {
    throw new Error("A solicitação de pagamento só pode ser sincronizada para turnos concluídos");
  }

  if (!slot.deliverymanId) {
    throw new Error("Turnos concluídos devem possuir um entregador vinculado");
  }

  const amount = calculateOperationalAmount(slot);
  const existing = await tx.paymentRequest.findFirst({
    where: { workShiftSlotId },
  });

  if (!existing) {
    const paymentRequest = await tx.paymentRequest.create({
      data: {
        workShiftSlotId,
        deliverymanId: slot.deliverymanId,
        contractType: slot.contractType,
        amount,
        discount: 0,
        additionalTax: 0,
        status: "NEW",
      },
    });

    return { action: "CREATED", paymentRequest };
  }

  const shouldUpdate =
    existing.deliverymanId !== slot.deliverymanId ||
    Number(existing.amount) !== amount ||
    existing.contractType !== slot.contractType;

  if (!shouldUpdate) {
    return { action: "UNCHANGED", paymentRequest: existing, previousPaymentRequest: existing };
  }

  const paymentRequest = await tx.paymentRequest.update({
    where: { id: existing.id },
    data: {
      deliverymanId: slot.deliverymanId,
      contractType: slot.contractType,
      amount,
    },
  });

  return {
    action: "UPDATED",
    paymentRequest,
    previousPaymentRequest: existing,
  };
}

export function paymentRequestsService() {
  return {
    async create(body: PaymentRequestMutateDTO, loggedUserId: string) {
      try {
        const paymentRequest = await db.paymentRequest.create({
          data: {
            ...body,
            discount: body.discount ?? 0,
            additionalTax: body.additionalTax ?? 0,
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

        const terminalStatuses = new Set(["PAID", "REJECTED", "CANCELLED"]);
        const financialFields = ["amount", "discount", "additionalTax", "discountReason", "taxReason"] as const;
        const hasFinancialChange = financialFields.some((field) => field in body && body[field] !== undefined);

        const updateData = { ...body };
        if (hasFinancialChange && !terminalStatuses.has(existing.status)) {
          if (existing.status !== "EDITED") {
            updateData.status = "EDITED";
          }
        }

        const updated = await db.paymentRequest.update({ where: { id }, data: updateData });

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
        const { page, pageSize, deliverymanId, workShiftSlotId, status, date, contractType, clientId } = query;
        const skip = (page - 1) * pageSize;

        const workShiftSlotFilter = {
          ...(date && { shiftDate: new Date(date) }),
          ...(clientId && { clientId }),
        };

        const where = {
          ...(deliverymanId && { deliverymanId }),
          ...(workShiftSlotId && { workShiftSlotId }),
          ...(status && { status }),
          ...(contractType && { contractType }),
          ...(Object.keys(workShiftSlotFilter).length > 0 && { workShiftSlot: workShiftSlotFilter }),
        };

        const [total, data] = await Promise.all([
          db.paymentRequest.count({ where }),
          db.paymentRequest.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            include: {
              deliveryman: { select: { id: true, name: true } },
              workShiftSlot: { select: { id: true, shiftDate: true } },
            },
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

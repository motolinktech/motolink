import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { errAsync, okAsync } from "neverthrow";
import type { Prisma } from "@/../generated/prisma/client";
import { historyTraceActionConst, historyTraceEntityConst } from "@/constants/history-trace";
import { type WorkShiftSlotStatus, workShiftSlotStatusTransitions } from "@/constants/work-shift-slot-status";
import { db } from "@/lib/database";
import { convertDecimals } from "@/utils/convert-decimals";
import { historyTracesService } from "../history-traces/history-traces-service";
import {
  type PaymentRequestSyncResult,
  syncPaymentRequestFromCompletedWorkShiftSlot,
} from "../payment-requests/payment-requests-service";
import { whatsappService } from "../whatsapp/whatsapp-service";
import type {
  DiscountMutateDTO,
  WorkShiftSlotListQueryDTO,
  WorkShiftSlotMutateDTO,
  WorkShiftSlotUpdateTimesDTO,
} from "./work-shift-slots-types";

dayjs.extend(utc);

function logPaymentRequestSyncHistory(sync: PaymentRequestSyncResult | null, userId: string) {
  if (!sync || sync.action === "UNCHANGED") return;
  historyTracesService()
    .create({
      userId,
      action: sync.action,
      entityType: historyTraceEntityConst.PAYMENT_REQUEST,
      entityId: sync.paymentRequest.id,
      oldObject: sync.previousPaymentRequest,
      newObject: sync.paymentRequest,
    })
    .catch(() => {});
}

function calculateTotalValueToPay(body: WorkShiftSlotMutateDTO): number {
  const { paymentForm, additionalTax, rainTax } = body;

  if (paymentForm === "GUARANTEED") {
    return (
      body.guaranteedQuantityDay * body.deliverymanPerDeliveryDay +
      body.guaranteedQuantityNight * body.deliverymanPerDeliveryNight +
      additionalTax +
      rainTax
    );
  }

  return body.deliverymanAmountDay + body.deliverymanAmountNight + additionalTax + rainTax;
}

function validateAssignedDeliverymanForStatus(status: string, deliverymanId?: string | null) {
  if (status !== "OPEN" && !deliverymanId) {
    return {
      reason: "É necessário atribuir um entregador antes de alterar o status do turno",
      statusCode: 400,
    };
  }

  return null;
}

const TERMINAL_STATUSES = ["CANCELLED", "ABSENT", "REJECTED", "UNANSWERED"];

function getTodayDateKey() {
  return dayjs().format("YYYY-MM-DD");
}

function getStoredDateKey(date: Date) {
  return dayjs.utc(date).format("YYYY-MM-DD");
}

function isCurrentShiftDate(date: Date) {
  return getStoredDateKey(date) === getTodayDateKey();
}

function isBannedAssignedSlotLocked(date: Date) {
  return !isCurrentShiftDate(date);
}

async function findOverlappingSlots(params: {
  deliverymanId: string;
  shiftDate: Date;
  startTime: Date;
  endTime: Date;
  excludeSlotId?: string;
}): Promise<{ id: string }[]> {
  return db.workShiftSlot.findMany({
    where: {
      deliverymanId: params.deliverymanId,
      shiftDate: params.shiftDate,
      status: { notIn: TERMINAL_STATUSES },
      startTime: { lt: params.endTime },
      endTime: { gt: params.startTime },
      ...(params.excludeSlotId && { id: { not: params.excludeSlotId } }),
    },
    select: { id: true },
  });
}

async function findClientBlock(clientId: string, deliverymanId: string) {
  return db.clientBlock.findUnique({
    where: { clientId_deliverymanId: { clientId, deliverymanId } },
  });
}

function hasOverlapInList(
  intervals: Array<{ startTime: Date; endTime: Date }>,
  startTime: Date,
  endTime: Date,
): boolean {
  return intervals.some((i) => i.startTime < endTime && i.endTime > startTime);
}

function toWorkShiftSlotCreateData(body: WorkShiftSlotMutateDTO): Prisma.WorkShiftSlotUncheckedCreateInput {
  const { isFreelancer: _isFreelancer, ...data } = body;
  return { ...data, totalValueToPay: calculateTotalValueToPay(body) };
}

function toWorkShiftSlotUpdateData(body: WorkShiftSlotMutateDTO): Prisma.WorkShiftSlotUncheckedUpdateInput {
  const { isFreelancer: _isFreelancer, ...data } = body;
  return { ...data, totalValueToPay: calculateTotalValueToPay(body) };
}

export function workShiftSlotsService() {
  return {
    async upsert(id: string | undefined, body: WorkShiftSlotMutateDTO, loggedUserId: string) {
      try {
        const include = {
          client: { select: { id: true, name: true } },
          deliveryman: { select: { id: true, name: true } },
        } as const;

        if (id) {
          const existing = await db.workShiftSlot.findUnique({ where: { id } });

          if (!existing) {
            return errAsync({ reason: "Turno de trabalho não encontrado", statusCode: 404 });
          }

          const nextDeliverymanId = body.deliverymanId ?? existing.deliverymanId;
          const invalidUpdatedStatusAssignment = validateAssignedDeliverymanForStatus(body.status, nextDeliverymanId);
          if (invalidUpdatedStatusAssignment) {
            return errAsync(invalidUpdatedStatusAssignment);
          }

          if (existing.deliverymanId) {
            const existingBan = await findClientBlock(existing.clientId, existing.deliverymanId);
            if (existingBan && isBannedAssignedSlotLocked(existing.shiftDate)) {
              return errAsync({
                reason: "Este turno não pode ser editado porque o entregador está banido para este cliente",
                statusCode: 400,
              });
            }
          }

          if (nextDeliverymanId) {
            const overlaps = await findOverlappingSlots({
              deliverymanId: nextDeliverymanId,
              shiftDate: body.shiftDate,
              startTime: body.startTime,
              endTime: body.endTime,
              excludeSlotId: id,
            });
            if (overlaps.length > 0) {
              return errAsync({
                reason: "Este entregador já possui um turno com horário conflitante nesta data",
                statusCode: 400,
              });
            }

            const ban = await findClientBlock(body.clientId, nextDeliverymanId);
            const isKeepingCurrentBannedAssignment =
              !!ban &&
              existing.deliverymanId === nextDeliverymanId &&
              existing.clientId === body.clientId &&
              isCurrentShiftDate(existing.shiftDate);

            if (ban && !isKeepingCurrentBannedAssignment) {
              return errAsync({ reason: "Este entregador está banido para este cliente", statusCode: 400 });
            }
          }

          const { slot: updated, paymentRequestSync } = await db.$transaction(async (tx) => {
            const nextSlot = await tx.workShiftSlot.update({
              where: { id },
              data: toWorkShiftSlotUpdateData(body),
              include,
            });

            let sync: PaymentRequestSyncResult | null = null;
            if (nextSlot.status === "COMPLETED") {
              sync = await syncPaymentRequestFromCompletedWorkShiftSlot(tx, nextSlot.id);
            }

            return { slot: nextSlot, paymentRequestSync: sync };
          });

          historyTracesService()
            .create({
              userId: loggedUserId,
              action: historyTraceActionConst.UPDATED,
              entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
              entityId: updated.id,
              oldObject: existing,
              newObject: updated,
            })
            .catch(() => {});

          logPaymentRequestSyncHistory(paymentRequestSync, loggedUserId);

          return okAsync(convertDecimals(updated));
        }

        const invalidStatusAssignment = validateAssignedDeliverymanForStatus(body.status, body.deliverymanId);
        if (invalidStatusAssignment) {
          return errAsync(invalidStatusAssignment);
        }

        if (body.deliverymanId) {
          const overlaps = await findOverlappingSlots({
            deliverymanId: body.deliverymanId,
            shiftDate: body.shiftDate,
            startTime: body.startTime,
            endTime: body.endTime,
          });
          if (overlaps.length > 0) {
            return errAsync({
              reason: "Este entregador já possui um turno com horário conflitante nesta data",
              statusCode: 400,
            });
          }

          const ban = await findClientBlock(body.clientId, body.deliverymanId);
          if (ban) {
            return errAsync({ reason: "Este entregador está banido para este cliente", statusCode: 400 });
          }
        }

        const { slot, paymentRequestSync } = await db.$transaction(async (tx) => {
          const createdSlot = await tx.workShiftSlot.create({
            data: toWorkShiftSlotCreateData(body),
            include,
          });

          let sync: PaymentRequestSyncResult | null = null;
          if (createdSlot.status === "COMPLETED") {
            sync = await syncPaymentRequestFromCompletedWorkShiftSlot(tx, createdSlot.id);
          }

          return { slot: createdSlot, paymentRequestSync: sync };
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.CREATED,
            entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
            entityId: slot.id,
            newObject: slot,
          })
          .catch(() => {});

        logPaymentRequestSyncHistory(paymentRequestSync, loggedUserId);

        return okAsync(convertDecimals(slot));
      } catch (error) {
        console.error("Error saving work shift slot:", error);
        return errAsync({ reason: "Não foi possível salvar o turno de trabalho", statusCode: 500 });
      }
    },

    async getById(id: string) {
      try {
        const slot = await db.workShiftSlot.findUnique({
          where: { id },
          include: {
            client: { select: { id: true, name: true } },
            deliveryman: { select: { id: true, name: true } },
            discounts: { orderBy: { createdAt: "desc" } },
          },
        });

        if (!slot) {
          return errAsync({ reason: "Turno de trabalho não encontrado", statusCode: 404 });
        }

        return okAsync(convertDecimals(slot));
      } catch (error) {
        console.error("Error fetching work shift slot:", error);
        return errAsync({ reason: "Não foi possível buscar o turno de trabalho", statusCode: 500 });
      }
    },

    async listAll(query: WorkShiftSlotListQueryDTO) {
      try {
        const { page, pageSize, search, clientId, deliverymanId, status, shiftDate, groupId } = query;
        const skip = (page - 1) * pageSize;

        const where = {
          ...(clientId && { clientId }),
          ...(deliverymanId && { deliverymanId }),
          ...(status && { status }),
          ...(shiftDate && { shiftDate }),
          ...(groupId && { client: { groupId } }),
          ...(search && {
            OR: [
              { client: { name: { contains: search, mode: "insensitive" as const } } },
              { deliveryman: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }),
        };

        const [total, data] = await Promise.all([
          db.workShiftSlot.count({ where }),
          db.workShiftSlot.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            include: {
              client: { select: { id: true, name: true } },
              deliveryman: { select: { id: true, name: true } },
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
        console.error("Error listing work shift slots:", error);
        return errAsync({ reason: "Não foi possível listar os turnos de trabalho", statusCode: 500 });
      }
    },

    async updateStatus(id: string, status: string, loggedUserId: string, absentReason?: string) {
      try {
        const include = {
          client: { select: { id: true, name: true } },
          deliveryman: { select: { id: true, name: true } },
        } as const;

        const existing = await db.workShiftSlot.findUnique({ where: { id } });

        if (!existing) {
          return errAsync({ reason: "Turno de trabalho não encontrado", statusCode: 404 });
        }

        const allowedTransitions = workShiftSlotStatusTransitions[existing.status as WorkShiftSlotStatus];
        if (!allowedTransitions?.includes(status as WorkShiftSlotStatus)) {
          return errAsync({ reason: "Transição de status inválida", statusCode: 400 });
        }

        const invalidStatusAssignment = validateAssignedDeliverymanForStatus(status, existing.deliverymanId);
        if (invalidStatusAssignment) {
          return errAsync(invalidStatusAssignment);
        }

        const data: Record<string, unknown> = { status };

        if (status === "ABSENT") {
          data.absentReason = absentReason;
        }

        if (status === "CHECKED_IN" && !existing.checkInAt) {
          data.checkInAt = new Date();
        }

        if (status === "PENDING_COMPLETION" && !existing.checkOutAt) {
          data.checkOutAt = new Date();
        }

        const { slot: updated, paymentRequestSync } = await db.$transaction(async (tx) => {
          const nextSlot = await tx.workShiftSlot.update({ where: { id }, data, include });

          let sync: PaymentRequestSyncResult | null = null;
          if (status === "COMPLETED") {
            sync = await syncPaymentRequestFromCompletedWorkShiftSlot(tx, nextSlot.id);
          }

          return { slot: nextSlot, paymentRequestSync: sync };
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
            entityId: updated.id,
            oldObject: existing,
            newObject: updated,
          })
          .catch(() => {});

        logPaymentRequestSyncHistory(paymentRequestSync, loggedUserId);

        return okAsync(convertDecimals(updated));
      } catch (error) {
        console.error("Error updating work shift slot status:", error);
        return errAsync({ reason: "Não foi possível atualizar o status do turno de trabalho", statusCode: 500 });
      }
    },

    async updateTimes(input: WorkShiftSlotUpdateTimesDTO, loggedUserId: string) {
      try {
        const include = {
          client: { select: { id: true, name: true } },
          deliveryman: { select: { id: true, name: true } },
        } as const;

        const existing = await db.workShiftSlot.findUnique({ where: { id: input.id } });

        if (!existing) {
          return errAsync({ reason: "Turno de trabalho não encontrado", statusCode: 404 });
        }

        const terminalStatuses = ["ABSENT", "CANCELLED", "REJECTED", "UNANSWERED", "COMPLETED"];
        if (terminalStatuses.includes(existing.status)) {
          return errAsync({ reason: "Não é possível editar horários de um turno finalizado", statusCode: 400 });
        }

        if (existing.deliverymanId) {
          const existingBan = await findClientBlock(existing.clientId, existing.deliverymanId);
          if (existingBan && isBannedAssignedSlotLocked(existing.shiftDate)) {
            return errAsync({
              reason: "Este turno não pode ser editado porque o entregador está banido para este cliente",
              statusCode: 400,
            });
          }
        }

        const parseTime = (value: string | null): Date | null => {
          if (!value) return null;
          return new Date(`1970-01-01T${value}:00.000Z`);
        };

        const checkInAt = parseTime(input.checkInAt);
        const checkOutAt = parseTime(input.checkOutAt);

        const updated = await db.workShiftSlot.update({
          where: { id: input.id },
          data: { checkInAt, checkOutAt },
          include,
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
            entityId: updated.id,
            oldObject: existing,
            newObject: updated,
          })
          .catch(() => {});

        return okAsync(convertDecimals(updated));
      } catch (error) {
        console.error("Error updating work shift slot times:", error);
        return errAsync({ reason: "Não foi possível atualizar os horários do turno", statusCode: 500 });
      }
    },

    async copySlots(sourceDate: Date, targetDate: Date, clientId: string, loggedUserId: string) {
      try {
        const sourceSlots = await db.workShiftSlot.findMany({
          where: { clientId, shiftDate: sourceDate },
        });

        if (sourceSlots.length === 0) {
          return errAsync({ reason: "Nenhum turno de trabalho encontrado na data de origem", statusCode: 404 });
        }

        const include = {
          client: { select: { id: true, name: true } },
          deliveryman: { select: { id: true, name: true } },
        } as const;

        // Build overlap tracker from existing slots on target date
        const deliverymanIds = [...new Set(sourceSlots.map((s) => s.deliverymanId).filter(Boolean))] as string[];
        const existingTargetSlots =
          deliverymanIds.length > 0
            ? await db.workShiftSlot.findMany({
                where: {
                  deliverymanId: { in: deliverymanIds },
                  shiftDate: targetDate,
                  status: { notIn: TERMINAL_STATUSES },
                },
                select: { deliverymanId: true, startTime: true, endTime: true },
              })
            : [];

        const overlapTracker = new Map<string, Array<{ startTime: Date; endTime: Date }>>();
        for (const slot of existingTargetSlots) {
          if (!slot.deliverymanId) continue;
          const list = overlapTracker.get(slot.deliverymanId) ?? [];
          list.push({ startTime: slot.startTime, endTime: slot.endTime });
          overlapTracker.set(slot.deliverymanId, list);
        }

        // Batch-fetch banned deliverymen for this client
        const bannedBlocks =
          deliverymanIds.length > 0
            ? await db.clientBlock.findMany({
                where: { clientId, deliverymanId: { in: deliverymanIds } },
                select: { deliverymanId: true },
              })
            : [];
        const bannedSet = new Set(bannedBlocks.map((b) => b.deliverymanId));

        let degradedCount = 0;
        const createdSlots = [];

        for (const slot of sourceSlots) {
          let assignDeliveryman = slot.deliverymanId;
          let status: string = slot.deliverymanId ? "INVITED" : "OPEN";

          if (assignDeliveryman) {
            if (bannedSet.has(assignDeliveryman)) {
              assignDeliveryman = null;
              status = "OPEN";
              degradedCount++;
            } else {
              const tracked = overlapTracker.get(assignDeliveryman) ?? [];
              if (hasOverlapInList(tracked, slot.startTime, slot.endTime)) {
                assignDeliveryman = null;
                status = "OPEN";
                degradedCount++;
              } else {
                tracked.push({ startTime: slot.startTime, endTime: slot.endTime });
                overlapTracker.set(assignDeliveryman, tracked);
              }
            }
          }

          const slotData: Prisma.WorkShiftSlotUncheckedCreateInput = {
            deliverymanId: assignDeliveryman,
            clientId: slot.clientId,
            contractType: slot.contractType,
            shiftDate: targetDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            period: slot.period,
            auditStatus: slot.auditStatus,
            checkInAt: slot.checkInAt,
            checkOutAt: slot.checkOutAt,
            inviteSentAt: slot.inviteSentAt,
            inviteToken: slot.inviteToken,
            inviteExpiresAt: slot.inviteExpiresAt,
            trackingConnected: slot.trackingConnected,
            trackingConnectedAt: slot.trackingConnectedAt,
            additionalTax: slot.additionalTax,
            additionalTaxReason: slot.additionalTaxReason,
            deliverymanAmountDay: slot.deliverymanAmountDay,
            deliverymanAmountNight: slot.deliverymanAmountNight,
            deliverymanPaymentType: slot.deliverymanPaymentType,
            deliverymenPaymentValue: slot.deliverymenPaymentValue,
            paymentForm: slot.paymentForm,
            guaranteedQuantityDay: slot.guaranteedQuantityDay,
            guaranteedDayTax: slot.guaranteedDayTax,
            guaranteedQuantityNight: slot.guaranteedQuantityNight,
            guaranteedNightTax: slot.guaranteedNightTax,
            deliverymanPerDeliveryDay: slot.deliverymanPerDeliveryDay,
            deliverymanPerDeliveryNight: slot.deliverymanPerDeliveryNight,
            isWeekendRate: slot.isWeekendRate,
            totalValueToPay: slot.totalValueToPay,
            status,
          };

          const created = await db.workShiftSlot.create({ data: slotData, include });
          createdSlots.push(created);

          historyTracesService()
            .create({
              userId: loggedUserId,
              action: historyTraceActionConst.COPIED,
              entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
              entityId: created.id,
              newObject: created,
            })
            .catch(() => {});
        }

        return okAsync({ slots: createdSlots.map(convertDecimals), degradedCount });
      } catch (error) {
        console.error("Error copying work shift slots:", error);
        return errAsync({ reason: "Não foi possível copiar os turnos de trabalho", statusCode: 500 });
      }
    },

    async delete(id: string, loggedUserId: string) {
      try {
        const existing = await db.workShiftSlot.findUnique({ where: { id } });

        if (!existing) {
          return errAsync({ reason: "Turno de trabalho não encontrado", statusCode: 404 });
        }

        await db.workShiftSlot.delete({ where: { id } });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.DELETED,
            entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
            entityId: id,
            oldObject: existing,
            newObject: existing,
          })
          .catch(() => {});

        return okAsync({ id });
      } catch (error) {
        console.error("Error deleting work shift slot:", error);
        return errAsync({ reason: "Não foi possível excluir o turno de trabalho", statusCode: 500 });
      }
    },

    async createDiscount(body: DiscountMutateDTO, loggedUser: { id: string; name: string }) {
      try {
        const slot = await db.workShiftSlot.findUnique({ where: { id: body.workShiftSlotId } });

        if (!slot) {
          return errAsync({ reason: "Turno de trabalho não encontrado", statusCode: 404 });
        }

        const { discount, paymentRequestSync } = await db.$transaction(async (tx) => {
          const createdDiscount = await tx.discount.create({
            data: {
              workShiftSlotId: body.workShiftSlotId,
              amount: body.amount,
              reason: body.reason,
              createdById: loggedUser.id,
              createdByName: loggedUser.name,
            },
          });

          let sync: PaymentRequestSyncResult | null = null;
          if (slot.status === "COMPLETED") {
            sync = await syncPaymentRequestFromCompletedWorkShiftSlot(tx, body.workShiftSlotId);
          }

          return { discount: createdDiscount, paymentRequestSync: sync };
        });

        historyTracesService()
          .create({
            userId: loggedUser.id,
            action: historyTraceActionConst.CREATED,
            entityType: historyTraceEntityConst.DISCOUNT,
            entityId: discount.id,
            newObject: discount,
          })
          .catch(() => {});

        logPaymentRequestSyncHistory(paymentRequestSync, loggedUser.id);

        return okAsync(convertDecimals(discount));
      } catch (error) {
        console.error("Error creating discount:", error);
        return errAsync({ reason: "Não foi possível criar o desconto", statusCode: 500 });
      }
    },

    async cancelDiscount(id: string, loggedUser: { id: string; name: string }) {
      try {
        const existing = await db.discount.findUnique({ where: { id } });

        if (!existing) {
          return errAsync({ reason: "Desconto não encontrado", statusCode: 404 });
        }

        if (existing.status === "CANCELLED") {
          return errAsync({ reason: "Desconto já está cancelado", statusCode: 400 });
        }

        const slot = await db.workShiftSlot.findUnique({ where: { id: existing.workShiftSlotId } });

        const { discount: updated, paymentRequestSync } = await db.$transaction(async (tx) => {
          const nextDiscount = await tx.discount.update({
            where: { id },
            data: { status: "CANCELLED" },
          });

          let sync: PaymentRequestSyncResult | null = null;
          if (slot?.status === "COMPLETED") {
            sync = await syncPaymentRequestFromCompletedWorkShiftSlot(tx, existing.workShiftSlotId);
          }

          return { discount: nextDiscount, paymentRequestSync: sync };
        });

        historyTracesService()
          .create({
            userId: loggedUser.id,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.DISCOUNT,
            entityId: updated.id,
            oldObject: existing,
            newObject: updated,
          })
          .catch(() => {});

        logPaymentRequestSyncHistory(paymentRequestSync, loggedUser.id);

        return okAsync(convertDecimals(updated));
      } catch (error) {
        console.error("Error cancelling discount:", error);
        return errAsync({ reason: "Não foi possível cancelar o desconto", statusCode: 500 });
      }
    },

    async sendInvite(workShiftSlotId: string, loggedUserId: string) {
      try {
        const slot = await db.workShiftSlot.findUnique({
          where: { id: workShiftSlotId },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                street: true,
                number: true,
                complement: true,
                city: true,
                neighborhood: true,
                uf: true,
                branchId: true,
              },
            },
            deliveryman: { select: { id: true, name: true, phone: true } },
          },
        });

        if (!slot) {
          return errAsync({ reason: "Turno de trabalho não encontrado", statusCode: 404 });
        }

        if (!slot.deliveryman) {
          return errAsync({ reason: "Turno não possui entregador atribuído", statusCode: 400 });
        }

        if (!slot.deliveryman.phone) {
          return errAsync({ reason: "Entregador não possui telefone cadastrado", statusCode: 400 });
        }

        if (TERMINAL_STATUSES.includes(slot.status)) {
          return errAsync({ reason: "Não é possível enviar convite para um turno finalizado", statusCode: 400 });
        }

        const deliveryman = slot.deliveryman;
        const token = crypto.randomUUID();
        const expiresAt = dayjs().add(24, "hour").toDate();

        const addressParts = [slot.client.street, slot.client.number].filter(Boolean).join(", ");
        const addressSuffix = [
          slot.client.complement,
          slot.client.neighborhood,
          `${slot.client.city}/${slot.client.uf}`,
        ]
          .filter(Boolean)
          .join(" - ");
        const clientAddress = [addressParts, addressSuffix].filter(Boolean).join(" - ");

        const invite = await db.$transaction(async (tx) => {
          const createdInvite = await tx.invite.create({
            data: {
              token,
              workShiftSlotId: slot.id,
              deliverymanId: deliveryman.id,
              clientId: slot.client.id,
              clientName: slot.client.name,
              clientAddress,
              shiftDate: slot.shiftDate,
              startTime: slot.startTime,
              endTime: slot.endTime,
              expiresAt,
            },
          });

          const updateData: Record<string, unknown> = {
            inviteSentAt: new Date(),
            inviteToken: token,
            inviteExpiresAt: expiresAt,
          };

          if (slot.status === "OPEN") {
            updateData.status = "INVITED";
          }

          await tx.workShiftSlot.update({ where: { id: slot.id }, data: updateData });

          return createdInvite;
        });

        whatsappService()
          .sendInvite({
            phone: deliveryman.phone,
            branchId: slot.client.branchId,
            type: "WORK_SHIFT",
            content: {
              deliverymanName: deliveryman.name,
              clientName: slot.client.name,
              clientAddress,
              shiftDate: dayjs.utc(slot.shiftDate).format("DD/MM/YYYY"),
              startTime: dayjs(slot.startTime).format("HH:mm"),
              endTime: dayjs(slot.endTime).format("HH:mm"),
              token,
            },
          })
          .catch(() => {});

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
            entityId: slot.id,
            newObject: { inviteSentAt: new Date(), inviteToken: token },
          })
          .catch(() => {});

        return okAsync({ invite });
      } catch (error) {
        console.error("Error sending invite:", error);
        return errAsync({ reason: "Não foi possível enviar o convite", statusCode: 500 });
      }
    },

    async sendBulkInvite(clientId: string, shiftDate: Date, loggedUserId: string) {
      try {
        const slots = await db.workShiftSlot.findMany({
          where: {
            clientId,
            shiftDate,
            status: "INVITED",
            deliverymanId: { not: null },
          },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                street: true,
                number: true,
                complement: true,
                city: true,
                neighborhood: true,
                uf: true,
                branchId: true,
              },
            },
            deliveryman: { select: { id: true, name: true, phone: true } },
          },
        });

        if (slots.length === 0) {
          return errAsync({ reason: "Nenhum turno com status convidado encontrado", statusCode: 404 });
        }

        let sentCount = 0;

        for (const slot of slots) {
          const slotDeliveryman = slot.deliveryman;
          if (!slotDeliveryman?.phone) continue;

          const token = crypto.randomUUID();
          const expiresAt = dayjs().add(24, "hour").toDate();

          const addressParts = [slot.client.street, slot.client.number].filter(Boolean).join(", ");
          const addressSuffix = [
            slot.client.complement,
            slot.client.neighborhood,
            `${slot.client.city}/${slot.client.uf}`,
          ]
            .filter(Boolean)
            .join(" - ");
          const clientAddress = [addressParts, addressSuffix].filter(Boolean).join(" - ");

          await db.$transaction(async (tx) => {
            await tx.invite.create({
              data: {
                token,
                workShiftSlotId: slot.id,
                deliverymanId: slotDeliveryman.id,
                clientId: slot.client.id,
                clientName: slot.client.name,
                clientAddress,
                shiftDate: slot.shiftDate,
                startTime: slot.startTime,
                endTime: slot.endTime,
                expiresAt,
              },
            });

            await tx.workShiftSlot.update({
              where: { id: slot.id },
              data: { inviteSentAt: new Date(), inviteToken: token, inviteExpiresAt: expiresAt },
            });
          });

          whatsappService()
            .sendInvite({
              phone: slotDeliveryman.phone,
              branchId: slot.client.branchId,
              type: "WORK_SHIFT",
              content: {
                deliverymanName: slotDeliveryman.name,
                clientName: slot.client.name,
                clientAddress,
                shiftDate: dayjs.utc(slot.shiftDate).format("DD/MM/YYYY"),
                startTime: dayjs(slot.startTime).format("HH:mm"),
                endTime: dayjs(slot.endTime).format("HH:mm"),
                token,
              },
            })
            .catch(() => {});

          historyTracesService()
            .create({
              userId: loggedUserId,
              action: historyTraceActionConst.UPDATED,
              entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
              entityId: slot.id,
              newObject: { inviteSentAt: new Date(), inviteToken: token },
            })
            .catch(() => {});

          sentCount++;
        }

        return okAsync({ sentCount });
      } catch (error) {
        console.error("Error sending bulk invites:", error);
        return errAsync({ reason: "Não foi possível enviar os convites em massa", statusCode: 500 });
      }
    },

    async listDiscountsBySlot(workShiftSlotId: string) {
      try {
        const discounts = await db.discount.findMany({
          where: { workShiftSlotId },
          orderBy: { createdAt: "desc" },
        });

        return okAsync(discounts.map(convertDecimals));
      } catch (error) {
        console.error("Error listing discounts:", error);
        return errAsync({ reason: "Não foi possível listar os descontos", statusCode: 500 });
      }
    },
  };
}

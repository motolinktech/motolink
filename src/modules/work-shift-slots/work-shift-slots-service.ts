import { errAsync, okAsync } from "neverthrow";
import { historyTraceActionConst, historyTraceEntityConst } from "@/constants/history-trace";
import { type WorkShiftSlotStatus, workShiftSlotStatusTransitions } from "@/constants/work-shift-slot-status";
import { db } from "@/lib/database";
import { convertDecimals } from "@/utils/convert-decimals";
import { historyTracesService } from "../history-traces/history-traces-service";
import type { WorkShiftSlotListQueryDTO, WorkShiftSlotMutateDTO } from "./work-shift-slots-types";

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

          const updated = await db.workShiftSlot.update({ where: { id }, data: body, include });

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
        }

        const slot = await db.workShiftSlot.create({ data: body, include });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.CREATED,
            entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
            entityId: slot.id,
            newObject: slot,
          })
          .catch(() => {});

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
        const { page, pageSize, search, clientId, deliverymanId, status, shiftDate } = query;
        const skip = (page - 1) * pageSize;

        const where = {
          ...(clientId && { clientId }),
          ...(deliverymanId && { deliverymanId }),
          ...(status && { status }),
          ...(shiftDate && { shiftDate }),
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

    async updateStatus(id: string, status: string, loggedUserId: string) {
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

        const updated = await db.workShiftSlot.update({ where: { id }, data: { status }, include });

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
        console.error("Error updating work shift slot status:", error);
        return errAsync({ reason: "Não foi possível atualizar o status do turno de trabalho", statusCode: 500 });
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

        const createdSlots = await Promise.all(
          sourceSlots.map((slot) => {
            const { id, createdAt, updatedAt, logs, ...rest } = slot;
            return db.workShiftSlot.create({
              data: {
                ...rest,
                shiftDate: targetDate,
                status: slot.deliverymanId ? "INVITED" : "OPEN",
              },
              include,
            });
          }),
        );

        for (const created of createdSlots) {
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

        return okAsync(createdSlots.map(convertDecimals));
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
  };
}

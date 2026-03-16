import { errAsync, okAsync } from "neverthrow";
import type { Prisma } from "@/../generated/prisma/client";
import { historyTraceActionConst, historyTraceEntityConst } from "@/constants/history-trace";
import { db } from "@/lib/database";
import { historyTracesService } from "../history-traces/history-traces-service";
import type { DeliverymanListQueryDTO, DeliverymanMutateDTO } from "./deliverymen-types";

export function deliverymenService() {
  return {
    async create(body: DeliverymanMutateDTO, loggedUserId: string) {
      try {
        const deliveryman = await db.deliveryman.create({ data: body });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.CREATED,
            entityType: historyTraceEntityConst.DELIVERYMAN,
            entityId: deliveryman.id,
            newObject: deliveryman,
          })
          .catch(() => {});

        return okAsync(deliveryman);
      } catch (error) {
        console.error("Error creating deliveryman:", error);
        return errAsync({ reason: "Não foi possível criar o entregador", statusCode: 500 });
      }
    },

    async update(id: string, body: DeliverymanMutateDTO, loggedUserId: string) {
      try {
        const existing = await db.deliveryman.findUnique({ where: { id, isDeleted: false } });

        if (!existing) {
          return errAsync({ reason: "Entregador não encontrado", statusCode: 404 });
        }

        const updated = await db.deliveryman.update({ where: { id }, data: body });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.DELIVERYMAN,
            entityId: updated.id,
            oldObject: existing,
            newObject: updated,
          })
          .catch(() => {});

        return okAsync(updated);
      } catch (error) {
        console.error("Error updating deliveryman:", error);
        return errAsync({ reason: "Não foi possível atualizar o entregador", statusCode: 500 });
      }
    },

    async getById(id: string) {
      try {
        const deliveryman = await db.deliveryman.findUnique({ where: { id } });

        if (!deliveryman || deliveryman.isDeleted) {
          return errAsync({ reason: "Entregador não encontrado", statusCode: 404 });
        }

        return okAsync(deliveryman);
      } catch (error) {
        console.error("Error fetching deliveryman:", error);
        return errAsync({ reason: "Não foi possível buscar o entregador", statusCode: 500 });
      }
    },

    async listAll(query: DeliverymanListQueryDTO) {
      try {
        const { page, pageSize, search, branchId, regionId, excludeClientId, excludeBlocked } = query;
        const skip = (page - 1) * pageSize;

        const where: Prisma.DeliverymanWhereInput = {
          isDeleted: false,
          ...(excludeBlocked && { isBlocked: false }),
          ...(branchId && { branchId }),
          ...(regionId && { regionId }),
          ...(excludeClientId && { blocks: { none: { clientId: excludeClientId } } }),
          ...(search && {
            OR: [{ name: { contains: search, mode: "insensitive" as const } }, { phone: { contains: search } }],
          }),
        };

        const [total, data] = await Promise.all([
          db.deliveryman.count({ where }),
          db.deliveryman.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
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
        console.error("Error listing deliverymen:", error);
        return errAsync({ reason: "Não foi possível listar os entregadores", statusCode: 500 });
      }
    },

    async delete(id: string, loggedUserId: string) {
      try {
        const existing = await db.deliveryman.findUnique({ where: { id, isDeleted: false } });

        if (!existing) {
          return errAsync({ reason: "Entregador não encontrado", statusCode: 404 });
        }

        await db.deliveryman.update({ where: { id }, data: { isDeleted: true } });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.DELETED,
            entityType: historyTraceEntityConst.DELIVERYMAN,
            entityId: id,
            oldObject: existing,
            newObject: existing,
          })
          .catch(() => {});

        return okAsync({ id });
      } catch (error) {
        console.error("Error deleting deliveryman:", error);
        return errAsync({ reason: "Não foi possível excluir o entregador", statusCode: 500 });
      }
    },

    async toggleBlock(id: string, loggedUserId: string) {
      try {
        const existing = await db.deliveryman.findUnique({ where: { id, isDeleted: false } });

        if (!existing) {
          return errAsync({ reason: "Entregador não encontrado", statusCode: 404 });
        }

        const updated = await db.deliveryman.update({
          where: { id },
          data: { isBlocked: !existing.isBlocked },
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.DELIVERYMAN,
            entityId: id,
            oldObject: existing,
            newObject: updated,
          })
          .catch(() => {});

        return okAsync(updated);
      } catch (error) {
        console.error("Error toggling deliveryman block status:", error);
        return errAsync({ reason: "Não foi possível alterar o bloqueio do entregador", statusCode: 500 });
      }
    },
  };
}

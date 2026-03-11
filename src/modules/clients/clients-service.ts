import { errAsync, okAsync } from "neverthrow";
import { historyTraceActionConst, historyTraceEntityConst } from "@/constants/history-trace";
import { db } from "@/lib/database";
import { historyTracesService } from "../history-traces/history-traces-service";
import type { ClientListQueryDTO, ClientMutateDTO, ClientUpdateDTO } from "./clients-types";

export function clientsService() {
  return {
    async create(body: ClientMutateDTO, loggedUserId: string, commercialConditionData?: Record<string, unknown>) {
      try {
        const client = await db.client.create({
          data: {
            ...body,
            commercialCondition: { create: commercialConditionData ?? {} },
          },
          include: { commercialCondition: true },
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.CREATED,
            entityType: historyTraceEntityConst.CLIENT,
            entityId: client.id,
            newObject: client,
          })
          .catch(() => {});

        return okAsync(client);
      } catch (error) {
        console.error("Error creating client:", error);
        return errAsync({ reason: "Não foi possível criar o cliente", statusCode: 500 });
      }
    },

    async update(id: string, body: ClientUpdateDTO, loggedUserId: string) {
      try {
        const existing = await db.client.findUnique({ where: { id, isDeleted: false } });

        if (!existing) {
          return errAsync({ reason: "Cliente não encontrado", statusCode: 404 });
        }

        const {
          bagsStatus,
          bagsAllocated,
          paymentForm,
          dailyPeriods,
          guaranteedPeriods,
          deliveryAreaKm,
          isMotolinkCovered,
          rainTax,
          guaranteedDay,
          guaranteedDayWeekend,
          guaranteedNight,
          guaranteedNightWeekend,
          guaranteedDayTax,
          guaranteedNightTax,
          guaranteedDayWeekendTax,
          guaranteedNightWeekendTax,
          clientDailyDay,
          clientDailyDayWknd,
          clientDailyNight,
          clientDailyNightWknd,
          clientPerDelivery,
          clientAdditionalKm,
          deliverymanDailyDay,
          deliverymanDailyDayWknd,
          deliverymanDailyNight,
          deliverymanDailyNightWknd,
          deliverymanPerDelivery,
          deliverymanAdditionalKm,
          ...clientData
        } = body;

        const commData = Object.fromEntries(
          Object.entries({
            bagsStatus,
            bagsAllocated,
            paymentForm,
            dailyPeriods,
            guaranteedPeriods,
            deliveryAreaKm,
            isMotolinkCovered,
            rainTax,
            guaranteedDay,
            guaranteedDayWeekend,
            guaranteedNight,
            guaranteedNightWeekend,
            guaranteedDayTax,
            guaranteedNightTax,
            guaranteedDayWeekendTax,
            guaranteedNightWeekendTax,
            clientDailyDay,
            clientDailyDayWknd,
            clientDailyNight,
            clientDailyNightWknd,
            clientPerDelivery,
            clientAdditionalKm,
            deliverymanDailyDay,
            deliverymanDailyDayWknd,
            deliverymanDailyNight,
            deliverymanDailyNightWknd,
            deliverymanPerDelivery,
            deliverymanAdditionalKm,
          }).filter(([, v]) => v !== undefined),
        );

        const updated = await db.client.update({
          where: { id },
          data: {
            ...clientData,
            ...(Object.keys(commData).length > 0 && {
              commercialCondition: { update: commData },
            }),
          },
          include: { commercialCondition: true },
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.CLIENT,
            entityId: updated.id,
            oldObject: existing,
            newObject: updated,
          })
          .catch(() => {});

        return okAsync(updated);
      } catch (error) {
        console.error("Error updating client:", error);
        return errAsync({ reason: "Não foi possível atualizar o cliente", statusCode: 500 });
      }
    },

    async getById(id: string) {
      try {
        const client = await db.client.findUnique({
          where: { id },
          include: { commercialCondition: true },
        });

        if (!client || client.isDeleted) {
          return errAsync({ reason: "Cliente não encontrado", statusCode: 404 });
        }

        return okAsync(client);
      } catch (error) {
        console.error("Error fetching client:", error);
        return errAsync({ reason: "Não foi possível buscar o cliente", statusCode: 500 });
      }
    },

    async listAll(query: ClientListQueryDTO) {
      try {
        const { page, pageSize, search, branchId, groupId, regionId } = query;
        const skip = (page - 1) * pageSize;

        const where = {
          isDeleted: false,
          ...(branchId && { branchId }),
          ...(groupId && { groupId }),
          ...(regionId && { regionId }),
          ...(search && {
            OR: [{ name: { contains: search, mode: "insensitive" as const } }, { cnpj: { contains: search } }],
          }),
        };

        const [total, data] = await Promise.all([
          db.client.count({ where }),
          db.client.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            include: {
              branch: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
              region: { select: { id: true, name: true } },
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
        console.error("Error listing clients:", error);
        return errAsync({ reason: "Não foi possível listar os clientes", statusCode: 500 });
      }
    },

    async delete(id: string, loggedUserId: string) {
      try {
        const existing = await db.client.findUnique({ where: { id, isDeleted: false } });

        if (!existing) {
          return errAsync({ reason: "Cliente não encontrado", statusCode: 404 });
        }

        await db.client.update({ where: { id }, data: { isDeleted: true } });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.DELETED,
            entityType: historyTraceEntityConst.CLIENT,
            entityId: id,
            oldObject: existing,
            newObject: existing,
          })
          .catch(() => {});

        return okAsync({ id });
      } catch (error) {
        console.error("Error deleting client:", error);
        return errAsync({ reason: "Não foi possível excluir o cliente", statusCode: 500 });
      }
    },

    async listAllSmall(query: ClientListQueryDTO) {
      try {
        const { page, pageSize, search, branchId, groupId, regionId } = query;
        const skip = (page - 1) * pageSize;

        const where = {
          isDeleted: false,
          ...(branchId && { branchId }),
          ...(groupId && { groupId }),
          ...(regionId && { regionId }),
          ...(search && {
            OR: [{ name: { contains: search, mode: "insensitive" as const } }, { cnpj: { contains: search } }],
          }),
        };

        const [total, data] = await Promise.all([
          db.client.count({ where }),
          db.client.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true, cnpj: true },
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
        console.error("Error listing clients:", error);
        return errAsync({ reason: "Não foi possível listar os clientes", statusCode: 500 });
      }
    },
  };
}

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { errAsync, okAsync } from "neverthrow";
import { historyTraceActionConst, historyTraceEntityConst } from "@/constants/history-trace";
import { db } from "@/lib/database";
import { historyTracesService } from "../history-traces/history-traces-service";
import { planningTransformer } from "./planning-transformer";
import type { PlanningListQueryDTO, PlanningUpsertDTO } from "./planning-types";

dayjs.extend(utc);

export function planningService() {
  return {
    async upsert(body: PlanningUpsertDTO, loggedUserId: string) {
      try {
        const today = dayjs().format("YYYY-MM-DD");
        const plannedDate = body.plannedDate;
        const plannedDateTime = dayjs.utc(plannedDate).toISOString();

        if (plannedDate < today) {
          return errAsync({
            reason: "Não é possível criar ou editar planejamentos para datas anteriores ao dia atual",
            statusCode: 422,
          });
        }

        const { clientId, branchId, plannedCount, period } = body;

        const planning = await db.planning.upsert({
          where: { clientId_plannedDate_period: { clientId, plannedDate: plannedDateTime, period } },
          create: { clientId, branchId, plannedDate: plannedDateTime, plannedCount, period },
          update: { branchId, plannedDate: plannedDateTime, plannedCount, period },
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.CREATED,
            entityType: historyTraceEntityConst.PLANNING,
            entityId: planning.id,
            newObject: planning,
          })
          .catch(() => {});

        return okAsync(planningTransformer(planning));
      } catch (error) {
        console.error("Error upserting planning:", error);
        return errAsync({ reason: "Não foi possível salvar o planejamento", statusCode: 500 });
      }
    },

    async listAll(query: PlanningListQueryDTO) {
      try {
        const { branchId, groupId, regionId, clientId, startAt, endAt } = query;
        const startAtDateTime = startAt ? dayjs.utc(startAt).toISOString() : undefined;
        const endAtDateTime = endAt ? dayjs.utc(endAt).toISOString() : undefined;

        const where = {
          ...(branchId && { branchId }),
          ...(clientId && { clientId }),
          ...((groupId || regionId) && {
            client: {
              ...(groupId && { groupId }),
              ...(regionId && { regionId }),
            },
          }),
          ...((startAt || endAt) && {
            plannedDate: {
              ...(startAtDateTime && { gte: startAtDateTime }),
              ...(endAtDateTime && { lte: endAtDateTime }),
            },
          }),
        };

        const data = (
          await db.planning.findMany({
            where,
            orderBy: { plannedDate: "desc" },
          })
        ).map((record) => planningTransformer(record));

        return okAsync({
          data,
        });
      } catch (error) {
        console.error("Error listing plannings:", error);
        return errAsync({ reason: "Não foi possível listar os planejamentos", statusCode: 500 });
      }
    },

    async getById(id: string) {
      try {
        const planning = await db.planning.findUnique({ where: { id } });

        if (!planning) {
          return errAsync({ reason: "Planejamento não encontrado", statusCode: 404 });
        }

        return okAsync(planningTransformer(planning));
      } catch (error) {
        console.error("Error fetching planning:", error);
        return errAsync({ reason: "Não foi possível buscar o planejamento", statusCode: 500 });
      }
    },
  };
}

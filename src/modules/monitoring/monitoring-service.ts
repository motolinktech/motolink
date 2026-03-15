import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { errAsync, okAsync } from "neverthrow";

dayjs.extend(utc);

import { db } from "@/lib/database";
import { convertDecimals } from "@/utils/convert-decimals";
import type { MonitoringQueryDTO, MonitoringWeeklyQueryDTO } from "./monitoring-types";

const monitoringClientInclude = {
  branch: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
  region: { select: { id: true, name: true } },
  commercialCondition: true,
} as const;

const monitoringWorkShiftInclude = {
  deliveryman: { select: { id: true, name: true } },
} as const;

export function monitoringService() {
  return {
    async getDaily(query: MonitoringQueryDTO) {
      try {
        const { branchId, clientId, groupId, targetDate } = query;
        const targetDateTime = dayjs(targetDate).toISOString();

        const clients = await db.client.findMany({
          where: {
            isDeleted: false,
            ...(branchId && { branchId }),
            ...(clientId && { id: clientId }),
            ...(groupId && { groupId }),
          },
          orderBy: { createdAt: "desc" },
          include: monitoringClientInclude,
        });

        if (clients.length === 0) {
          return okAsync({ clients: [] });
        }

        const clientIds = clients.map((client) => client.id);

        const [planned, workShifts] = await Promise.all([
          db.planning.findMany({
            where: {
              ...(branchId && { branchId }),
              clientId: { in: clientIds },
              plannedDate: targetDateTime,
            },
            orderBy: [{ clientId: "asc" }, { period: "asc" }],
          }),
          db.workShiftSlot.findMany({
            where: {
              clientId: { in: clientIds },
              shiftDate: targetDateTime,
            },
            orderBy: [{ clientId: "asc" }, { createdAt: "desc" }],
            include: monitoringWorkShiftInclude,
          }),
        ]);

        const plannedByClientId = new Map<string, typeof planned>();
        for (const planning of planned) {
          const clientPlannings = plannedByClientId.get(planning.clientId) ?? [];
          clientPlannings.push(planning);
          plannedByClientId.set(planning.clientId, clientPlannings);
        }

        const workShiftsByClientId = new Map<string, typeof workShifts>();
        for (const workShift of workShifts) {
          const clientWorkShifts = workShiftsByClientId.get(workShift.clientId) ?? [];
          clientWorkShifts.push(workShift);
          workShiftsByClientId.set(workShift.clientId, clientWorkShifts);
        }

        return okAsync({
          clients: clients.map((client) =>
            convertDecimals({
              ...client,
              planned: plannedByClientId.get(client.id) ?? [],
              workShifts: workShiftsByClientId.get(client.id) ?? [],
            }),
          ),
        });
      } catch (error) {
        console.error("Error fetching daily monitoring:", error);
        return errAsync({ reason: "Não foi possível buscar os dados de monitoramento", statusCode: 500 });
      }
    },

    async getWeekly(query: MonitoringWeeklyQueryDTO) {
      try {
        const { branchId, clientId, groupId, startDate, endDate } = query;
        const startDateTime = dayjs.utc(startDate).toISOString();
        const endDateTime = dayjs.utc(endDate).toISOString();

        const clients = await db.client.findMany({
          where: {
            isDeleted: false,
            ...(branchId && { branchId }),
            ...(clientId && { id: clientId }),
            ...(groupId && { groupId }),
          },
          orderBy: { createdAt: "desc" },
          include: monitoringClientInclude,
        });

        if (clients.length === 0) {
          return okAsync({ clients: [] });
        }

        const clientIds = clients.map((client) => client.id);

        const [planned, workShifts] = await Promise.all([
          db.planning.findMany({
            where: {
              ...(branchId && { branchId }),
              clientId: { in: clientIds },
              plannedDate: { gte: startDateTime, lte: endDateTime },
            },
            orderBy: [{ clientId: "asc" }, { plannedDate: "asc" }, { period: "asc" }],
          }),
          db.workShiftSlot.findMany({
            where: {
              clientId: { in: clientIds },
              shiftDate: { gte: startDateTime, lte: endDateTime },
            },
            orderBy: [{ clientId: "asc" }, { shiftDate: "asc" }, { createdAt: "desc" }],
            include: monitoringWorkShiftInclude,
          }),
        ]);

        const plannedByClientDate = new Map<string, Map<string, typeof planned>>();
        for (const planning of planned) {
          const dateStr = dayjs.utc(planning.plannedDate).format("YYYY-MM-DD");
          if (!plannedByClientDate.has(planning.clientId)) {
            plannedByClientDate.set(planning.clientId, new Map());
          }
          const dateMap = plannedByClientDate.get(planning.clientId)!;
          const datePlannings = dateMap.get(dateStr) ?? [];
          datePlannings.push(planning);
          dateMap.set(dateStr, datePlannings);
        }

        const workShiftsByClientDate = new Map<string, Map<string, typeof workShifts>>();
        for (const workShift of workShifts) {
          const dateStr = dayjs.utc(workShift.shiftDate).format("YYYY-MM-DD");
          if (!workShiftsByClientDate.has(workShift.clientId)) {
            workShiftsByClientDate.set(workShift.clientId, new Map());
          }
          const dateMap = workShiftsByClientDate.get(workShift.clientId)!;
          const dateShifts = dateMap.get(dateStr) ?? [];
          dateShifts.push(workShift);
          dateMap.set(dateStr, dateShifts);
        }

        const numDays = dayjs(endDate).diff(dayjs(startDate), "day") + 1;
        const dateKeys = Array.from({ length: numDays }, (_, i) => dayjs(startDate).add(i, "day").format("YYYY-MM-DD"));

        return okAsync({
          clients: clients.map((client) => {
            const days: Record<string, { planned: typeof planned; workShifts: typeof workShifts }> = {};
            const clientPlannedMap = plannedByClientDate.get(client.id);
            const clientShiftsMap = workShiftsByClientDate.get(client.id);

            for (const dateKey of dateKeys) {
              days[dateKey] = {
                planned: clientPlannedMap?.get(dateKey) ?? [],
                workShifts: clientShiftsMap?.get(dateKey) ?? [],
              };
            }

            return convertDecimals({ ...client, days });
          }),
        });
      } catch (error) {
        console.error("Error fetching weekly monitoring:", error);
        return errAsync({ reason: "Não foi possível buscar os dados de monitoramento semanal", statusCode: 500 });
      }
    },
  };
}

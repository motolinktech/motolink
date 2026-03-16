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
  discounts: { orderBy: { createdAt: "desc" as const } },
} as const;

function createClientBanLookup(blocks: Array<{ clientId: string; deliverymanId: string }>) {
  return new Set(blocks.map((block) => `${block.clientId}:${block.deliverymanId}`));
}

function withClientBanState<T extends { clientId: string; deliverymanId: string | null }>(
  workShifts: T[],
  banLookup: Set<string>,
) {
  return workShifts.map((workShift) => ({
    ...workShift,
    isDeliverymanBannedForClient: workShift.deliverymanId
      ? banLookup.has(`${workShift.clientId}:${workShift.deliverymanId}`)
      : false,
  }));
}

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

        const deliverymanIds = [
          ...new Set(workShifts.map((workShift) => workShift.deliverymanId).filter(Boolean)),
        ] as string[];
        const clientBlocks =
          deliverymanIds.length > 0
            ? await db.clientBlock.findMany({
                where: {
                  clientId: { in: clientIds },
                  deliverymanId: { in: deliverymanIds },
                },
                select: { clientId: true, deliverymanId: true },
              })
            : [];
        const banLookup = createClientBanLookup(clientBlocks);
        const workShiftsWithBanState = withClientBanState(workShifts, banLookup);

        const plannedByClientId = new Map<string, typeof planned>();
        for (const planning of planned) {
          const clientPlannings = plannedByClientId.get(planning.clientId) ?? [];
          clientPlannings.push(planning);
          plannedByClientId.set(planning.clientId, clientPlannings);
        }

        const workShiftsByClientId = new Map<string, typeof workShiftsWithBanState>();
        for (const workShift of workShiftsWithBanState) {
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

        const deliverymanIds = [
          ...new Set(workShifts.map((workShift) => workShift.deliverymanId).filter(Boolean)),
        ] as string[];
        const clientBlocks =
          deliverymanIds.length > 0
            ? await db.clientBlock.findMany({
                where: {
                  clientId: { in: clientIds },
                  deliverymanId: { in: deliverymanIds },
                },
                select: { clientId: true, deliverymanId: true },
              })
            : [];
        const banLookup = createClientBanLookup(clientBlocks);
        const workShiftsWithBanState = withClientBanState(workShifts, banLookup);

        const plannedByClientDate = new Map<string, Map<string, typeof planned>>();
        for (const planning of planned) {
          const dateStr = dayjs.utc(planning.plannedDate).format("YYYY-MM-DD");
          let dateMap = plannedByClientDate.get(planning.clientId);
          if (!dateMap) {
            dateMap = new Map();
            plannedByClientDate.set(planning.clientId, dateMap);
          }
          const datePlannings = dateMap.get(dateStr) ?? [];
          datePlannings.push(planning);
          dateMap.set(dateStr, datePlannings);
        }

        const workShiftsByClientDate = new Map<string, Map<string, typeof workShiftsWithBanState>>();
        for (const workShift of workShiftsWithBanState) {
          const dateStr = dayjs.utc(workShift.shiftDate).format("YYYY-MM-DD");
          let dateMap = workShiftsByClientDate.get(workShift.clientId);
          if (!dateMap) {
            dateMap = new Map();
            workShiftsByClientDate.set(workShift.clientId, dateMap);
          }
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

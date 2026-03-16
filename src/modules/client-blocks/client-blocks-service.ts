import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { errAsync, okAsync } from "neverthrow";
import { historyTraceActionConst, historyTraceEntityConst } from "@/constants/history-trace";
import { db } from "@/lib/database";
import { historyTracesService } from "../history-traces/history-traces-service";
import type { ClientBlockDeleteDTO, ClientBlockMutateDTO, DeliverymanBanHistoryItem } from "./client-blocks-types";

dayjs.extend(utc);

interface ClientBlockCreatedTraceRow {
  entityId: string;
  createdAt: Date;
  clientId: string | null;
  reason: string | null;
}

const CLIENT_ALREADY_BANNED_ERROR = "CLIENT_ALREADY_BANNED";

function getTodayDateKey() {
  return dayjs().format("YYYY-MM-DD");
}

function toStoredDate(dateKey: string) {
  return dayjs.utc(dateKey).toDate();
}

export function clientBlocksService() {
  return {
    async ban(body: ClientBlockMutateDTO, loggedUserId: string) {
      try {
        const { block } = await db.$transaction(async (tx) => {
          const existing = await tx.clientBlock.findUnique({
            where: { clientId_deliverymanId: { clientId: body.clientId, deliverymanId: body.deliverymanId } },
          });

          if (existing) {
            throw new Error(CLIENT_ALREADY_BANNED_ERROR);
          }

          const block = await tx.clientBlock.create({
            data: {
              clientId: body.clientId,
              deliverymanId: body.deliverymanId,
              reason: body.reason,
            },
          });

          const futureSlots = await tx.workShiftSlot.findMany({
            where: {
              clientId: body.clientId,
              deliverymanId: body.deliverymanId,
              shiftDate: { gt: toStoredDate(getTodayDateKey()) },
            },
            select: { id: true },
          });

          if (futureSlots.length > 0) {
            await tx.workShiftSlot.updateMany({
              where: { id: { in: futureSlots.map((slot) => slot.id) } },
              data: {
                deliverymanId: null,
                status: "OPEN",
                inviteSentAt: null,
                inviteToken: null,
                inviteExpiresAt: null,
              },
            });
          }

          return { block };
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.CREATED,
            entityType: historyTraceEntityConst.CLIENT_BLOCK,
            entityId: block.id,
            newObject: block,
          })
          .catch(() => {});

        return okAsync(block);
      } catch (error) {
        if (error instanceof Error && error.message === CLIENT_ALREADY_BANNED_ERROR) {
          return errAsync({ reason: "Este entregador já está banido para este cliente", statusCode: 409 });
        }

        console.error("Error banning deliveryman:", error);
        return errAsync({ reason: "Não foi possível banir o entregador", statusCode: 500 });
      }
    },

    async unban(body: ClientBlockDeleteDTO, loggedUserId: string) {
      try {
        const existing = await db.clientBlock.findUnique({
          where: { clientId_deliverymanId: { clientId: body.clientId, deliverymanId: body.deliverymanId } },
        });

        if (!existing) {
          return errAsync({ reason: "Banimento não encontrado", statusCode: 404 });
        }

        await db.clientBlock.delete({
          where: { clientId_deliverymanId: { clientId: body.clientId, deliverymanId: body.deliverymanId } },
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.DELETED,
            entityType: historyTraceEntityConst.CLIENT_BLOCK,
            entityId: existing.id,
            oldObject: existing,
            newObject: existing,
          })
          .catch(() => {});

        return okAsync({ id: existing.id });
      } catch (error) {
        console.error("Error unbanning deliveryman:", error);
        return errAsync({ reason: "Não foi possível remover o banimento do entregador", statusCode: 500 });
      }
    },

    async isBanned(deliverymanId: string, clientId: string) {
      try {
        const block = await db.clientBlock.findUnique({
          where: { clientId_deliverymanId: { clientId, deliverymanId } },
        });
        return okAsync(!!block);
      } catch (error) {
        console.error("Error checking ban status:", error);
        return errAsync({ reason: "Não foi possível verificar o banimento", statusCode: 500 });
      }
    },

    async listHistoryByDeliveryman(deliverymanId: string) {
      try {
        const [activeBlocks, createdTraces] = await Promise.all([
          db.clientBlock.findMany({
            where: { deliverymanId },
            select: {
              id: true,
              clientId: true,
              reason: true,
              createdAt: true,
              client: {
                select: {
                  name: true,
                },
              },
            },
          }),
          db.$queryRaw<ClientBlockCreatedTraceRow[]>`
            SELECT
              "entityId" AS "entityId",
              "createdAt" AS "createdAt",
              changes->'clientId'->>'new' AS "clientId",
              changes->'reason'->>'new' AS "reason"
            FROM "history_traces"
            WHERE "entityType" = ${historyTraceEntityConst.CLIENT_BLOCK}
              AND action = ${historyTraceActionConst.CREATED}
              AND changes->'deliverymanId'->>'new' = ${deliverymanId}
            ORDER BY "createdAt" DESC
          `,
        ]);

        const createdTraceIds = createdTraces.map((trace) => trace.entityId);

        const deletedTraces =
          createdTraceIds.length > 0
            ? await db.historyTrace.findMany({
                where: {
                  entityType: historyTraceEntityConst.CLIENT_BLOCK,
                  action: historyTraceActionConst.DELETED,
                  entityId: { in: createdTraceIds },
                },
                select: {
                  entityId: true,
                  createdAt: true,
                },
              })
            : [];

        const activeMap = new Map(
          activeBlocks.map((block) => [
            block.id,
            {
              clientId: block.clientId,
              clientName: block.client.name,
              reason: block.reason,
              createdAt: block.createdAt,
            },
          ]),
        );

        const deletedMap = new Map(deletedTraces.map((trace) => [trace.entityId, trace.createdAt]));
        const historicalClientIds = createdTraces
          .map((trace) => trace.clientId)
          .filter((clientId): clientId is string => !!clientId);
        const missingClientIds = Array.from(
          new Set(historicalClientIds.filter((clientId) => !activeBlocks.some((block) => block.clientId === clientId))),
        );

        const historicalClients =
          missingClientIds.length > 0
            ? await db.client.findMany({
                where: { id: { in: missingClientIds } },
                select: { id: true, name: true },
              })
            : [];

        const clientNameMap = new Map(historicalClients.map((client) => [client.id, client.name]));

        const history = createdTraces.map<DeliverymanBanHistoryItem>((trace) => {
          const activeBlock = activeMap.get(trace.entityId);
          const clientId = activeBlock?.clientId ?? trace.clientId ?? "";
          const removedAt = deletedMap.get(trace.entityId) ?? null;

          return {
            id: trace.entityId,
            clientId,
            clientName: activeBlock?.clientName ?? clientNameMap.get(clientId) ?? "Cliente removido",
            reason: activeBlock?.reason ?? trace.reason,
            createdAt: activeBlock?.createdAt ?? trace.createdAt,
            removedAt,
            isActive: !removedAt,
          };
        });

        const activeOnlyWithoutTrace = activeBlocks
          .filter((block) => !createdTraceIds.includes(block.id))
          .map<DeliverymanBanHistoryItem>((block) => ({
            id: block.id,
            clientId: block.clientId,
            clientName: block.client.name,
            reason: block.reason,
            createdAt: block.createdAt,
            removedAt: null,
            isActive: true,
          }));

        const combinedHistory = [...history, ...activeOnlyWithoutTrace].sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        );

        return okAsync(combinedHistory);
      } catch (error) {
        console.error("Error listing deliveryman ban history:", error);
        return errAsync({ reason: "Não foi possível listar o histórico de banimentos", statusCode: 500 });
      }
    },
  };
}

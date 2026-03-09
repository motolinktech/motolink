import { errAsync, okAsync } from "neverthrow";
import type { Prisma } from "@/../generated/prisma/client";
import { db } from "@/lib/database";
import type { CreateTraceDTO, HistoryTraceListQueryDTO } from "./history-traces-types";

function computeChanges(
  newObject: Record<string, unknown>,
  oldObject?: Record<string, unknown>,
): Prisma.InputJsonValue {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(newObject), ...(oldObject ? Object.keys(oldObject) : [])]);

  for (const key of allKeys) {
    const oldVal = oldObject?.[key] ?? null;
    const newVal = newObject[key] ?? null;

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }

  return changes as Prisma.InputJsonValue;
}

export function historyTracesService() {
  return {
    async create(body: CreateTraceDTO) {
      try {
        const user = await db.user.findUnique({
          where: { id: body.userId },
          select: { id: true, name: true, email: true, role: true },
        });

        if (!user) {
          return errAsync({ reason: "Usuário não encontrado", statusCode: 404 });
        }

        const changes = computeChanges(body.newObject, body.oldObject);

        const trace = await db.historyTrace.create({
          data: {
            userId: body.userId,
            user,
            action: body.action,
            entityType: body.entityType,
            entityId: body.entityId,
            changes,
          },
        });

        return okAsync(trace);
      } catch (error) {
        console.error("Error creating history trace:", error);
        return errAsync({ reason: "Não foi possível criar o registro", statusCode: 500 });
      }
    },

    async listAll(query: HistoryTraceListQueryDTO) {
      try {
        const { page, pageSize, entityType, userId, entityId, action } = query;
        const skip = (page - 1) * pageSize;

        const where = {
          ...(entityType && { entityType }),
          ...(userId && { userId }),
          ...(entityId && { entityId }),
          ...(action && { action }),
        };

        const [total, data] = await Promise.all([
          db.historyTrace.count({ where }),
          db.historyTrace.findMany({
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
        console.error("Error listing history traces:", error);
        return errAsync({ reason: "Não foi possível listar os registros", statusCode: 500 });
      }
    },

    async getById(id: string) {
      try {
        const trace = await db.historyTrace.findUnique({
          where: { id },
        });

        if (!trace) {
          return errAsync({ reason: "Registro não encontrado", statusCode: 404 });
        }

        return okAsync(trace);
      } catch (error) {
        console.error("Error fetching history trace:", error);
        return errAsync({ reason: "Não foi possível buscar o registro", statusCode: 500 });
      }
    },
  };
}

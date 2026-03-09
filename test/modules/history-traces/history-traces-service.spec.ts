import { beforeEach, describe, expect, it } from "vitest";

import { historyTraceActionConst, historyTraceEntityConst } from "../../../src/constants/history-trace";
import { db } from "../../../src/lib/database";
import { historyTracesService } from "../../../src/modules/history-traces/history-traces-service";
import { cleanDatabase } from "../../helpers/clean-database";

async function createTestUser() {
  return db.user.create({
    data: {
      name: "Test User",
      email: "test@example.com",
      status: "ACTIVE",
    },
  });
}

async function createTestTrace(
  userId: string,
  overrides: {
    action?: string;
    entityType?: string;
    entityId?: string;
    newObject?: Record<string, unknown>;
    oldObject?: Record<string, unknown>;
  } = {},
) {
  const service = historyTracesService();
  return service.create({
    userId,
    action: overrides.action ?? historyTraceActionConst.CREATED,
    entityType: overrides.entityType ?? historyTraceEntityConst.USER,
    entityId: overrides.entityId ?? crypto.randomUUID(),
    newObject: overrides.newObject ?? {
      name: "Test User",
      email: "test@example.com",
      role: "OPERATOR",
      status: "ACTIVE",
    },
    oldObject: overrides.oldObject,
  });
}

describe("History Traces Service", () => {
  const service = historyTracesService();

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe(".create", () => {
    it("should create a trace for a new user (CREATED)", async () => {
      const actor = await createTestUser();

      const result = await service.create({
        userId: actor.id,
        action: historyTraceActionConst.CREATED,
        entityType: historyTraceEntityConst.USER,
        entityId: actor.id,
        newObject: {
          name: "New User",
          email: "new@example.com",
          role: "OPERATOR",
          status: "ACTIVE",
        },
      });

      expect(result.isOk()).toBe(true);
      const trace = result._unsafeUnwrap();
      expect(trace.id).toBeDefined();
      expect(trace.userId).toBe(actor.id);
      expect(trace.action).toBe(historyTraceActionConst.CREATED);
      expect(trace.entityType).toBe(historyTraceEntityConst.USER);
      expect(trace.changes).toMatchObject({
        name: { old: null, new: "New User" },
        email: { old: null, new: "new@example.com" },
        role: { old: null, new: "OPERATOR" },
        status: { old: null, new: "ACTIVE" },
      });
    });

    it("should compute changes for a user status update (UPDATED)", async () => {
      const actor = await createTestUser();

      const result = await service.create({
        userId: actor.id,
        action: historyTraceActionConst.UPDATED,
        entityType: historyTraceEntityConst.USER,
        entityId: actor.id,
        oldObject: { name: "Test User", email: "test@example.com", status: "PENDING" },
        newObject: { name: "Test User", email: "test@example.com", status: "ACTIVE" },
      });

      expect(result.isOk()).toBe(true);
      const trace = result._unsafeUnwrap();
      expect(trace.changes).toMatchObject({
        status: { old: "PENDING", new: "ACTIVE" },
      });
      expect(trace.changes as Record<string, unknown>).not.toHaveProperty("name");
      expect(trace.changes as Record<string, unknown>).not.toHaveProperty("email");
    });

    it("should return 404 error when user does not exist", async () => {
      const result = await service.create({
        userId: "non-existent-user-id",
        action: historyTraceActionConst.CREATED,
        entityType: historyTraceEntityConst.USER,
        entityId: crypto.randomUUID(),
        newObject: { name: "Ghost", email: "ghost@example.com", status: "ACTIVE" },
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });

  describe(".listAll", () => {
    it("should return paginated results", async () => {
      const user = await createTestUser();
      await createTestTrace(user.id);
      await createTestTrace(user.id);

      const result = await service.listAll({ page: 1, pageSize: 1 });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(pagination.total).toBe(2);
      expect(pagination.totalPages).toBe(2);
      expect(pagination.page).toBe(1);
      expect(pagination.pageSize).toBe(1);
    });

    it("should filter by entityType", async () => {
      const user = await createTestUser();
      await createTestTrace(user.id, { entityType: historyTraceEntityConst.USER });
      await createTestTrace(user.id, {
        entityType: historyTraceEntityConst.SESSION,
        newObject: { token: crypto.randomUUID(), expiresAt: new Date().toISOString() },
      });

      const result = await service.listAll({
        page: 1,
        pageSize: 10,
        entityType: historyTraceEntityConst.USER,
      });

      expect(result.isOk()).toBe(true);
      const entityResult = result._unsafeUnwrap();
      expect(entityResult.data).toHaveLength(1);
      expect(entityResult.data[0].entityType).toBe(historyTraceEntityConst.USER);
    });

    it("should filter by action", async () => {
      const user = await createTestUser();
      await createTestTrace(user.id, { action: historyTraceActionConst.CREATED });
      await createTestTrace(user.id, {
        action: historyTraceActionConst.DELETED,
        oldObject: { name: "Test User", email: "test@example.com", status: "ACTIVE" },
        newObject: {},
      });

      const result = await service.listAll({
        page: 1,
        pageSize: 10,
        action: historyTraceActionConst.DELETED,
      });

      expect(result.isOk()).toBe(true);
      const actionResult = result._unsafeUnwrap();
      expect(actionResult.data).toHaveLength(1);
      expect(actionResult.data[0].action).toBe(historyTraceActionConst.DELETED);
    });

    it("should return empty data when no traces exist", async () => {
      const result = await service.listAll({ page: 1, pageSize: 10 });

      expect(result.isOk()).toBe(true);
      const emptyResult = result._unsafeUnwrap();
      expect(emptyResult.data).toHaveLength(0);
      expect(emptyResult.pagination.total).toBe(0);
      expect(emptyResult.pagination.totalPages).toBe(0);
    });
  });

  describe(".getById", () => {
    it("should return a trace by id", async () => {
      const user = await createTestUser();
      const created = await createTestTrace(user.id);
      const trace = created._unsafeUnwrap();

      const result = await service.getById(trace.id);

      expect(result.isOk()).toBe(true);
      const found = result._unsafeUnwrap();
      expect(found.id).toBe(trace.id);
    });

    it("should return 404 error when id does not exist", async () => {
      const result = await service.getById("non-existent-id");

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });
});

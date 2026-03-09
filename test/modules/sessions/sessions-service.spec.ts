import { beforeEach, describe, expect, it } from "vitest";

process.env.AUTH_SECRET ??= "test-secret";

import { db } from "../../../src/lib/database";
import { hash } from "../../../src/lib/hash";
import { sessionsService } from "../../../src/modules/sessions/sessions-service";
import { cleanDatabase } from "../../helpers/clean-database";

const TEST_PASSWORD = "Test@1234";

async function createTestUser(overrides: { status?: string; password?: string | null } = {}) {
  const hashedPassword = overrides.password === null ? null : await hash().create(overrides.password ?? TEST_PASSWORD);

  return db.user.create({
    data: {
      name: "Test User",
      email: "test@example.com",
      password: hashedPassword,
      status: overrides.status ?? "ACTIVE",
    },
  });
}

describe("Sessions Service", () => {
  const service = sessionsService();

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe(".create", () => {
    it("should create a session for valid credentials", async () => {
      const user = await createTestUser();

      const result = await service.create({
        email: user.email,
        password: TEST_PASSWORD,
      });

      expect(result.isOk()).toBe(true);

      const value = result._unsafeUnwrap();
      expect(value.session.token).toBeDefined();
      expect(value.session.expiresAt).toBeInstanceOf(Date);
      expect(value.user).not.toHaveProperty("password");
      expect(value.user.id).toBe(user.id);
    });

    it("should return 401 when user is not found", async () => {
      const result = await service.create({
        email: "unknown@example.com",
        password: TEST_PASSWORD,
      });

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error.statusCode).toBe(401);
    });

    it("should return 401 when user has no password", async () => {
      const user = await createTestUser({ password: null });

      const result = await service.create({
        email: user.email,
        password: TEST_PASSWORD,
      });

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error.statusCode).toBe(401);
    });

    it("should return 403 when user is not active", async () => {
      const user = await createTestUser({ status: "PENDING" });

      const result = await service.create({
        email: user.email,
        password: TEST_PASSWORD,
      });

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error.statusCode).toBe(403);
    });

    it("should return 401 when password is wrong", async () => {
      const user = await createTestUser();

      const result = await service.create({
        email: user.email,
        password: "Wrong@1234",
      });

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error.statusCode).toBe(401);
    });
  });

  describe(".validate", () => {
    it("should return the session for a valid token", async () => {
      const user = await createTestUser();

      const createResult = await service.create({
        email: user.email,
        password: TEST_PASSWORD,
      });

      const { session } = createResult._unsafeUnwrap();

      const result = await service.validate(session.token);

      expect(result.isOk()).toBe(true);

      const value = result._unsafeUnwrap();
      expect(value.token).toBe(session.token);
      expect(value.userId).toBe(user.id);
    });

    it("should return 404 when token is not found", async () => {
      const result = await service.validate("non-existent-token");

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error.statusCode).toBe(404);
    });

    it("should return 401 and delete an expired session", async () => {
      const user = await createTestUser();

      const session = await db.session.create({
        data: {
          token: crypto.randomUUID(),
          userId: user.id,
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const result = await service.validate(session.token);

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error.statusCode).toBe(401);

      const deleted = await db.session.findUnique({
        where: { id: session.id },
      });
      expect(deleted).toBeNull();
    });
  });

  describe(".delete", () => {
    it("should delete an existing session", async () => {
      const user = await createTestUser();

      const createResult = await service.create({
        email: user.email,
        password: TEST_PASSWORD,
      });

      const { session } = createResult._unsafeUnwrap();

      const result = await service.delete(session.token);

      expect(result.isOk()).toBe(true);

      const deleted = await db.session.findUnique({
        where: { token: session.token },
      });
      expect(deleted).toBeNull();
    });

    it("should return 500 when token does not exist", async () => {
      const result = await service.delete("non-existent-token");

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error.statusCode).toBe(500);
    });
  });
});

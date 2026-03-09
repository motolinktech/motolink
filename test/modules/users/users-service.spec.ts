import { beforeEach, describe, expect, it } from "vitest";

process.env.AUTH_SECRET ??= "test-secret";

import { db } from "../../../src/lib/database";
import { usersService } from "../../../src/modules/users/users-service";
import type { UserMutateDTO } from "../../../src/modules/users/users-types";
import { cleanDatabase } from "../../helpers/clean-database";

const LOGGED_USER_ID = crypto.randomUUID();

const BASE_BODY: UserMutateDTO = {
  name: "Test User",
  email: "test@example.com",
  role: "ADMIN",
  permissions: [],
  branches: ["branch-1"],
};

async function createTestUser(
  overrides: { name?: string; email?: string; status?: string; branches?: string[]; isDeleted?: boolean } = {},
) {
  return db.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "test@example.com",
      status: overrides.status ?? "ACTIVE",
      branches: overrides.branches ?? ["branch-1"],
      isDeleted: overrides.isDeleted ?? false,
    },
  });
}

describe("Users Service", () => {
  const service = usersService();

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe(".create", () => {
    it("should create user with ACTIVE status when password is provided", async () => {
      const result = await service.create({ ...BASE_BODY, password: "Test@1234" }, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);

      const user = result._unsafeUnwrap();
      expect(user.status).toBe("ACTIVE");
      expect(user).not.toHaveProperty("password");

      const token = await db.verificationToken.findFirst({
        where: { userId: user.id },
      });
      expect(token).toBeNull();
    });

    it("should create user with PENDING status and a verificationToken when no password", async () => {
      const result = await service.create(BASE_BODY, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);

      const user = result._unsafeUnwrap();
      expect(user.status).toBe("PENDING");
      expect(user).not.toHaveProperty("password");

      const token = await db.verificationToken.findFirst({
        where: { userId: user.id },
      });
      expect(token).not.toBeNull();

      // biome-ignore lint/style/noNonNullAssertion: Test assertion
      expect(token!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe(".getById", () => {
    it("should return user when found", async () => {
      const created = await createTestUser();

      const result = await service.getById(created.id);

      expect(result.isOk()).toBe(true);
      const user = result._unsafeUnwrap();

      // biome-ignore lint/style/noNonNullAssertion: Test assertion
      expect(user!.id).toBe(created.id);
      expect(user).not.toHaveProperty("password");
    });

    it("should return null when user does not exist", async () => {
      const result = await service.getById(crypto.randomUUID());

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
    });
  });

  describe(".listAll", () => {
    it("should return paginated users", async () => {
      await createTestUser({ email: "u1@example.com" });
      await createTestUser({ email: "u2@example.com" });
      await createTestUser({ email: "u3@example.com" });

      const result = await service.listAll({ page: 1, pageSize: 2 });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(2);
      expect(pagination.total).toBe(3);
      expect(pagination.totalPages).toBe(2);
    });

    it("should exclude deleted users", async () => {
      await createTestUser({ email: "active@example.com" });
      await createTestUser({ email: "deleted@example.com", isDeleted: true });

      const result = await service.listAll({ page: 1, pageSize: 10 });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].email).toBe("active@example.com");
    });

    it("should filter by search term", async () => {
      await createTestUser({ name: "Alice Smith", email: "alice@example.com" });
      await createTestUser({ name: "Bob Jones", email: "bob@example.com" });

      const result = await service.listAll({
        page: 1,
        pageSize: 10,
        search: "Alice",
      });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Alice Smith");
    });

    it("should filter by branchId", async () => {
      await createTestUser({
        email: "br1@example.com",
        branches: ["branch-1"],
      });
      await createTestUser({
        email: "br2@example.com",
        branches: ["branch-2"],
      });

      const result = await service.listAll({
        page: 1,
        pageSize: 10,
        branchId: "branch-1",
      });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].email).toBe("br1@example.com");
    });
  });

  describe(".update", () => {
    it("should update user successfully", async () => {
      const created = await createTestUser();

      const result = await service.update(created.id, { ...BASE_BODY, name: "Updated Name" }, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const user = result._unsafeUnwrap();
      expect(user.name).toBe("Updated Name");
      expect(user).not.toHaveProperty("password");
    });

    it("should return 404 when user is not found", async () => {
      const result = await service.update(crypto.randomUUID(), BASE_BODY, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });

    it("should return 400 when user is deleted", async () => {
      const created = await createTestUser({ isDeleted: true });

      const result = await service.update(created.id, BASE_BODY, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(400);
    });

    it("should return 400 when email is already in use by another user", async () => {
      await createTestUser({ email: "taken@example.com" });
      const target = await createTestUser({ email: "other@example.com" });

      const result = await service.update(target.id, { ...BASE_BODY, email: "taken@example.com" }, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(400);
    });

    it("should hash password when a new password is provided", async () => {
      const created = await createTestUser();

      const result = await service.update(created.id, { ...BASE_BODY, password: "NewPass@1234" }, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);

      const dbUser = await db.user.findUnique({ where: { id: created.id } });
      // biome-ignore lint/style/noNonNullAssertion: Test assertion
      expect(dbUser!.password).not.toBe("NewPass@1234");
      // biome-ignore lint/style/noNonNullAssertion: Test assertion
      expect(dbUser!.password).toMatch(/^\$argon2/);
    });
  });

  describe(".delete", () => {
    it("should soft-delete the user", async () => {
      const created = await createTestUser();

      const result = await service.delete(created.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ success: true });

      const dbUser = await db.user.findUnique({ where: { id: created.id } });
      // biome-ignore lint/style/noNonNullAssertion: Test assertion
      expect(dbUser!.isDeleted).toBe(true);
    });

    it("should delete user sessions on delete", async () => {
      const created = await createTestUser();
      await db.session.create({
        data: {
          token: crypto.randomUUID(),
          userId: created.id,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      await service.delete(created.id, LOGGED_USER_ID);

      const sessions = await db.session.findMany({
        where: { userId: created.id },
      });
      expect(sessions).toHaveLength(0);
    });

    it("should return 404 when user is not found", async () => {
      const result = await service.delete(crypto.randomUUID(), LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });

    it("should return 400 when user is already deleted", async () => {
      const created = await createTestUser({ isDeleted: true });

      const result = await service.delete(created.id, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(400);
    });
  });
});

import { beforeEach, describe, expect, it } from "vitest";

process.env.AUTH_SECRET ??= "test-secret";

import { db } from "../../../src/lib/database";
import { deliverymenService } from "../../../src/modules/deliverymen/deliverymen-service";
import type { DeliverymanMutateDTO } from "../../../src/modules/deliverymen/deliverymen-types";
import { cleanDatabase } from "../../helpers/clean-database";

// --- Constants -----------------------------------------------------------

const LOGGED_USER_ID = crypto.randomUUID();

// --- Test Data Factories -------------------------------------------------

async function createTestBranch(overrides: { name?: string } = {}) {
  return db.branch.create({
    data: {
      name: overrides.name ?? "Test Branch",
      code: crypto.randomUUID().slice(0, 8),
    },
  });
}

async function createTestRegion(overrides: { name?: string; branchId?: string } = {}) {
  const branchId = overrides.branchId ?? (await createTestBranch()).id;
  return db.region.create({
    data: {
      name: overrides.name ?? "Test Region",
      branchId,
    },
  });
}

async function createTestClient(overrides: { name?: string; branchId?: string } = {}) {
  const branchId = overrides.branchId ?? (await createTestBranch()).id;
  return db.client.create({
    data: {
      name: overrides.name ?? "Test Client",
      cnpj: `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 14),
      cep: "01001000",
      street: "Rua Teste",
      number: "123",
      city: "Sao Paulo",
      neighborhood: "Centro",
      uf: "SP",
      contactName: "Contato Teste",
      branchId,
    },
  });
}

async function createTestDeliveryman(
  overrides: {
    name?: string;
    phone?: string;
    branchId?: string;
    regionId?: string;
    isDeleted?: boolean;
    isBlocked?: boolean;
  } = {},
) {
  const branchId = overrides.branchId ?? (await createTestBranch()).id;
  return db.deliveryman.create({
    data: {
      name: overrides.name ?? "Test Deliveryman",
      document: "00000000000",
      phone: overrides.phone ?? "11999999999",
      contractType: "CLT",
      mainPixKey: "pix@test.com",
      branchId,
      regionId: overrides.regionId,
      isDeleted: overrides.isDeleted ?? false,
      isBlocked: overrides.isBlocked ?? false,
    },
  });
}

// --- Tests ---------------------------------------------------------------

describe("Deliverymen Service", () => {
  const service = deliverymenService();

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe(".create", () => {
    it("should create a deliveryman successfully", async () => {
      const branch = await createTestBranch();
      const body: DeliverymanMutateDTO = {
        name: "João Silva",
        document: "12345678900",
        phone: "11988887777",
        contractType: "CLT",
        mainPixKey: "joao@pix.com",
        files: [],
        branchId: branch.id,
      };

      const result = await service.create(body, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const deliveryman = result._unsafeUnwrap();
      expect(deliveryman.name).toBe("João Silva");
      expect(deliveryman.branchId).toBe(branch.id);
    });

    it("should create a deliveryman with optional regionId", async () => {
      const branch = await createTestBranch();
      const region = await createTestRegion({ branchId: branch.id });
      const body: DeliverymanMutateDTO = {
        name: "Maria Santos",
        document: "98765432100",
        phone: "11977776666",
        contractType: "PJ",
        mainPixKey: "maria@pix.com",
        files: [],
        branchId: branch.id,
        regionId: region.id,
      };

      const result = await service.create(body, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().regionId).toBe(region.id);
    });
  });

  describe(".getById", () => {
    it("should return the deliveryman when found", async () => {
      const created = await createTestDeliveryman();

      const result = await service.getById(created.id);

      expect(result.isOk()).toBe(true);
      // biome-ignore lint/style/noNonNullAssertion: Test assertion
      expect(result._unsafeUnwrap()!.id).toBe(created.id);
    });

    it("should return 404 when not found", async () => {
      const result = await service.getById(crypto.randomUUID());

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });

    it("should return 404 for a soft-deleted deliveryman", async () => {
      const created = await createTestDeliveryman({ isDeleted: true });

      const result = await service.getById(created.id);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });

  describe(".listAll", () => {
    it("should return paginated results", async () => {
      const branch = await createTestBranch();
      await createTestDeliveryman({ name: "D1", branchId: branch.id });
      await createTestDeliveryman({ name: "D2", branchId: branch.id });
      await createTestDeliveryman({ name: "D3", branchId: branch.id });

      const result = await service.listAll({ page: 1, pageSize: 2 });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(2);
      expect(pagination.total).toBe(3);
      expect(pagination.totalPages).toBe(2);
    });

    it("should filter by search term (name, case-insensitive)", async () => {
      const branch = await createTestBranch();
      await createTestDeliveryman({ name: "Carlos Moto", branchId: branch.id });
      await createTestDeliveryman({ name: "Ana Bike", branchId: branch.id });

      const result = await service.listAll({ page: 1, pageSize: 10, search: "carlos" });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Carlos Moto");
    });

    it("should filter by search term (phone)", async () => {
      const branch = await createTestBranch();
      await createTestDeliveryman({ name: "D1", phone: "11911112222", branchId: branch.id });
      await createTestDeliveryman({ name: "D2", phone: "21933334444", branchId: branch.id });

      const result = await service.listAll({ page: 1, pageSize: 10, search: "119" });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].phone).toBe("11911112222");
    });

    it("should filter by branchId", async () => {
      const branch1 = await createTestBranch({ name: "Branch 1" });
      const branch2 = await createTestBranch({ name: "Branch 2" });
      await createTestDeliveryman({ name: "D from B1", branchId: branch1.id });
      await createTestDeliveryman({ name: "D from B2", branchId: branch2.id });

      const result = await service.listAll({ page: 1, pageSize: 10, branchId: branch1.id });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("D from B1");
    });

    it("should filter by regionId", async () => {
      const branch = await createTestBranch();
      const region1 = await createTestRegion({ branchId: branch.id });
      const region2 = await createTestRegion({ branchId: branch.id });
      await createTestDeliveryman({ branchId: branch.id, regionId: region1.id });
      await createTestDeliveryman({ branchId: branch.id, regionId: region2.id });

      const result = await service.listAll({ page: 1, pageSize: 10, regionId: region1.id });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].regionId).toBe(region1.id);
    });

    it("should exclude soft-deleted deliverymen", async () => {
      const branch = await createTestBranch();
      await createTestDeliveryman({ name: "Active", branchId: branch.id });
      await createTestDeliveryman({ name: "Deleted", branchId: branch.id, isDeleted: true });

      const result = await service.listAll({ page: 1, pageSize: 10 });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(pagination.total).toBe(1);
      expect(data[0].name).toBe("Active");
    });

    it("should include globally blocked deliverymen by default", async () => {
      const branch = await createTestBranch();
      await createTestDeliveryman({ name: "Active", branchId: branch.id });
      await createTestDeliveryman({ name: "Blocked", branchId: branch.id, isBlocked: true });

      const result = await service.listAll({ page: 1, pageSize: 10 });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(2);
      expect(pagination.total).toBe(2);
      expect(data.map((item) => item.name).sort()).toEqual(["Active", "Blocked"]);
    });

    it("should exclude globally blocked deliverymen when requested", async () => {
      const branch = await createTestBranch();
      await createTestDeliveryman({ name: "Active", branchId: branch.id });
      await createTestDeliveryman({ name: "Blocked", branchId: branch.id, isBlocked: true });

      const result = await service.listAll({ page: 1, pageSize: 10, excludeBlocked: true });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(pagination.total).toBe(1);
      expect(data[0].name).toBe("Active");
    });

    it("should exclude deliverymen banned for the requested client only", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const otherClient = await createTestClient({ name: "Other Client", branchId: branch.id });
      const allowed = await createTestDeliveryman({ name: "Allowed", branchId: branch.id });
      const bannedForClient = await createTestDeliveryman({ name: "Banned", branchId: branch.id });
      const bannedForOtherClient = await createTestDeliveryman({ name: "Other Client Ban", branchId: branch.id });

      await db.clientBlock.create({
        data: {
          clientId: client.id,
          deliverymanId: bannedForClient.id,
          reason: "Test ban",
        },
      });

      await db.clientBlock.create({
        data: {
          clientId: otherClient.id,
          deliverymanId: bannedForOtherClient.id,
          reason: "Other client ban",
        },
      });

      const result = await service.listAll({ page: 1, pageSize: 10, excludeClientId: client.id });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data.map((item) => item.id).sort()).toEqual([allowed.id, bannedForOtherClient.id].sort());
    });

    it("should return empty result when no deliverymen match", async () => {
      const result = await service.listAll({ page: 1, pageSize: 10, search: "Nonexistent" });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(0);
      expect(pagination.total).toBe(0);
    });
  });

  describe(".update", () => {
    it("should update a deliveryman successfully", async () => {
      const branch = await createTestBranch();
      const created = await createTestDeliveryman({ branchId: branch.id });

      const result = await service.update(
        created.id,
        {
          name: "Updated Name",
          document: created.document,
          phone: created.phone,
          contractType: created.contractType,
          mainPixKey: created.mainPixKey,
          files: [],
          branchId: branch.id,
        },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().name).toBe("Updated Name");
    });

    it("should return 404 when deliveryman is not found", async () => {
      const branch = await createTestBranch();

      const result = await service.update(
        crypto.randomUUID(),
        {
          name: "Updated",
          document: "00000000000",
          phone: "11999999999",
          contractType: "CLT",
          mainPixKey: "pix@test.com",
          files: [],
          branchId: branch.id,
        },
        LOGGED_USER_ID,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });

    it("should return 404 for a soft-deleted deliveryman", async () => {
      const branch = await createTestBranch();
      const created = await createTestDeliveryman({ branchId: branch.id, isDeleted: true });

      const result = await service.update(
        created.id,
        {
          name: "Updated",
          document: created.document,
          phone: created.phone,
          contractType: created.contractType,
          mainPixKey: created.mainPixKey,
          files: [],
          branchId: branch.id,
        },
        LOGGED_USER_ID,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });

  describe(".delete", () => {
    it("should soft-delete a deliveryman successfully", async () => {
      const created = await createTestDeliveryman();

      const result = await service.delete(created.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ id: created.id });

      const inDb = await db.deliveryman.findUnique({ where: { id: created.id } });
      expect(inDb?.isDeleted).toBe(true);
    });

    it("should return 404 when deliveryman is not found", async () => {
      const result = await service.delete(crypto.randomUUID(), LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });

    it("should return 404 for an already soft-deleted deliveryman", async () => {
      const created = await createTestDeliveryman({ isDeleted: true });

      const result = await service.delete(created.id, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });

  describe(".toggleBlock", () => {
    it("should block an unblocked deliveryman", async () => {
      const created = await createTestDeliveryman({ isBlocked: false });

      const result = await service.toggleBlock(created.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().isBlocked).toBe(true);
    });

    it("should unblock a blocked deliveryman", async () => {
      const created = await createTestDeliveryman({ isBlocked: true });

      const result = await service.toggleBlock(created.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().isBlocked).toBe(false);
    });

    it("should return 404 when deliveryman is not found", async () => {
      const result = await service.toggleBlock(crypto.randomUUID(), LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });

    it("should return 404 for a soft-deleted deliveryman", async () => {
      const created = await createTestDeliveryman({ isDeleted: true });

      const result = await service.toggleBlock(created.id, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });
});

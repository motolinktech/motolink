import { beforeEach, describe, expect, it } from "vitest";

process.env.AUTH_SECRET ??= "test-secret";

import { db } from "../../../src/lib/database";
import { clientsService } from "../../../src/modules/clients/clients-service";
import type { ClientMutateDTO, ClientUpdateDTO } from "../../../src/modules/clients/clients-types";
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

async function createTestGroup(overrides: { name?: string; branchId?: string } = {}) {
  const branchId = overrides.branchId ?? (await createTestBranch()).id;
  return db.group.create({
    data: {
      name: overrides.name ?? "Test Group",
      branchId,
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

async function createTestClient(
  overrides: {
    name?: string;
    cnpj?: string;
    branchId?: string;
    groupId?: string;
    regionId?: string;
    isDeleted?: boolean;
  } = {},
) {
  const branchId = overrides.branchId ?? (await createTestBranch()).id;
  return db.client.create({
    data: {
      name: overrides.name ?? "Test Client",
      cnpj: overrides.cnpj ?? "00000000000000",
      cep: "01310100",
      street: "Av. Paulista",
      number: "1000",
      city: "São Paulo",
      neighborhood: "Bela Vista",
      uf: "SP",
      contactName: "Contato Teste",
      branchId,
      groupId: overrides.groupId,
      regionId: overrides.regionId,
      isDeleted: overrides.isDeleted ?? false,
      commercialCondition: { create: {} },
    },
  });
}

// --- Tests ---------------------------------------------------------------

describe("Clients Service", () => {
  const service = clientsService();

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe(".create", () => {
    it("should create a client and auto-create commercialCondition", async () => {
      const branch = await createTestBranch();
      const body: ClientMutateDTO = {
        name: "Empresa Teste",
        cnpj: "12345678000100",
        cep: "01310100",
        street: "Av. Paulista",
        number: "1000",
        city: "São Paulo",
        neighborhood: "Bela Vista",
        uf: "SP",
        contactName: "João Silva",
        observations: "",
        contactPhone: "",
        provideMeal: false,
        branchId: branch.id,
      };

      const result = await service.create(body, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const client = result._unsafeUnwrap();
      expect(client.name).toBe("Empresa Teste");
      expect(client.branchId).toBe(branch.id);
      expect(client.commercialCondition).not.toBeNull();
    });

    it("should create a client with optional groupId and regionId", async () => {
      const branch = await createTestBranch();
      const group = await createTestGroup({ branchId: branch.id });
      const region = await createTestRegion({ branchId: branch.id });
      const body: ClientMutateDTO = {
        name: "Empresa Com Grupo",
        cnpj: "98765432000100",
        cep: "01310100",
        street: "Rua Teste",
        number: "500",
        city: "São Paulo",
        neighborhood: "Centro",
        uf: "SP",
        contactName: "Maria Santos",
        observations: "",
        contactPhone: "",
        provideMeal: false,
        branchId: branch.id,
        groupId: group.id,
        regionId: region.id,
      };

      const result = await service.create(body, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const client = result._unsafeUnwrap();
      expect(client.groupId).toBe(group.id);
      expect(client.regionId).toBe(region.id);
    });
  });

  describe(".getById", () => {
    it("should return the client with commercialCondition when found", async () => {
      const created = await createTestClient();

      const result = await service.getById(created.id);

      expect(result.isOk()).toBe(true);
      const client = result._unsafeUnwrap();
      expect(client.id).toBe(created.id);
      expect(client.commercialCondition).not.toBeNull();
    });

    it("should return 404 when client is not found", async () => {
      const result = await service.getById(crypto.randomUUID());

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });

    it("should return 404 for a soft-deleted client", async () => {
      const created = await createTestClient({ isDeleted: true });

      const result = await service.getById(created.id);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });

  describe(".listAll", () => {
    it("should return paginated results", async () => {
      const branch = await createTestBranch();
      await createTestClient({ name: "C1", branchId: branch.id });
      await createTestClient({ name: "C2", branchId: branch.id });
      await createTestClient({ name: "C3", branchId: branch.id });

      const result = await service.listAll({ page: 1, pageSize: 2 });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(2);
      expect(pagination.total).toBe(3);
      expect(pagination.totalPages).toBe(2);
    });

    it("should filter by search term (name, case-insensitive)", async () => {
      const branch = await createTestBranch();
      await createTestClient({ name: "Padaria Central", branchId: branch.id });
      await createTestClient({ name: "Farmácia Norte", branchId: branch.id });

      const result = await service.listAll({ page: 1, pageSize: 10, search: "padaria" });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Padaria Central");
    });

    it("should filter by search term (cnpj)", async () => {
      const branch = await createTestBranch();
      await createTestClient({ cnpj: "11111111000100", branchId: branch.id });
      await createTestClient({ cnpj: "22222222000100", branchId: branch.id });

      const result = await service.listAll({ page: 1, pageSize: 10, search: "11111111" });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].cnpj).toBe("11111111000100");
    });

    it("should filter by branchId", async () => {
      const branch1 = await createTestBranch({ name: "Branch 1" });
      const branch2 = await createTestBranch({ name: "Branch 2" });
      await createTestClient({ name: "C from B1", branchId: branch1.id });
      await createTestClient({ name: "C from B2", branchId: branch2.id });

      const result = await service.listAll({ page: 1, pageSize: 10, branchId: branch1.id });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("C from B1");
    });

    it("should filter by groupId", async () => {
      const branch = await createTestBranch();
      const group1 = await createTestGroup({ branchId: branch.id });
      const group2 = await createTestGroup({ branchId: branch.id });
      await createTestClient({ branchId: branch.id, groupId: group1.id });
      await createTestClient({ branchId: branch.id, groupId: group2.id });

      const result = await service.listAll({ page: 1, pageSize: 10, groupId: group1.id });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].groupId).toBe(group1.id);
    });

    it("should filter by regionId", async () => {
      const branch = await createTestBranch();
      const region1 = await createTestRegion({ branchId: branch.id });
      const region2 = await createTestRegion({ branchId: branch.id });
      await createTestClient({ branchId: branch.id, regionId: region1.id });
      await createTestClient({ branchId: branch.id, regionId: region2.id });

      const result = await service.listAll({ page: 1, pageSize: 10, regionId: region1.id });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].regionId).toBe(region1.id);
    });

    it("should exclude soft-deleted clients", async () => {
      const branch = await createTestBranch();
      await createTestClient({ name: "Active", branchId: branch.id });
      await createTestClient({ name: "Deleted", branchId: branch.id, isDeleted: true });

      const result = await service.listAll({ page: 1, pageSize: 10 });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(pagination.total).toBe(1);
      expect(data[0].name).toBe("Active");
    });

    it("should include branch, group and region as {id, name} objects", async () => {
      const branch = await createTestBranch({ name: "My Branch" });
      const group = await createTestGroup({ name: "My Group", branchId: branch.id });
      const region = await createTestRegion({ name: "My Region", branchId: branch.id });
      await createTestClient({ branchId: branch.id, groupId: group.id, regionId: region.id });

      const result = await service.listAll({ page: 1, pageSize: 10 });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data[0].branch).toEqual({ id: branch.id, name: "My Branch" });
      expect(data[0].group).toEqual({ id: group.id, name: "My Group" });
      expect(data[0].region).toEqual({ id: region.id, name: "My Region" });
    });
  });

  describe(".update", () => {
    it("should update client fields successfully", async () => {
      const branch = await createTestBranch();
      const created = await createTestClient({ branchId: branch.id });

      const body: ClientUpdateDTO = {
        name: "Nome Atualizado",
        cnpj: created.cnpj,
        cep: created.cep,
        street: created.street,
        number: created.number,
        city: created.city,
        neighborhood: created.neighborhood,
        uf: created.uf,
        contactName: created.contactName,
        observations: created.observations,
        contactPhone: created.contactPhone,
        provideMeal: created.provideMeal,
        branchId: branch.id,
      };

      const result = await service.update(created.id, body, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().name).toBe("Nome Atualizado");
    });

    it("should update commercial condition fields", async () => {
      const branch = await createTestBranch();
      const created = await createTestClient({ branchId: branch.id });

      const body: ClientUpdateDTO = {
        name: created.name,
        cnpj: created.cnpj,
        cep: created.cep,
        street: created.street,
        number: created.number,
        city: created.city,
        neighborhood: created.neighborhood,
        uf: created.uf,
        contactName: created.contactName,
        observations: created.observations,
        contactPhone: created.contactPhone,
        provideMeal: created.provideMeal,
        branchId: branch.id,
        bagsAllocated: 10,
        deliveryAreaKm: 5.5,
        isMotolinkCovered: true,
      };

      const result = await service.update(created.id, body, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const updated = result._unsafeUnwrap();
      expect(updated.commercialCondition?.bagsAllocated).toBe(10);
      expect(updated.commercialCondition?.isMotolinkCovered).toBe(true);
    });

    it("should update regionId and commercial condition tax fields together", async () => {
      const branch = await createTestBranch();
      const initialRegion = await createTestRegion({ branchId: branch.id });
      const nextRegion = await createTestRegion({ branchId: branch.id });
      const created = await createTestClient({ branchId: branch.id, regionId: initialRegion.id });

      const body: ClientUpdateDTO = {
        name: created.name,
        cnpj: created.cnpj,
        cep: created.cep,
        street: created.street,
        number: created.number,
        city: created.city,
        neighborhood: created.neighborhood,
        uf: created.uf,
        contactName: created.contactName,
        observations: created.observations,
        contactPhone: created.contactPhone,
        provideMeal: created.provideMeal,
        branchId: branch.id,
        regionId: nextRegion.id,
        rainTax: 4.5,
        guaranteedDayTax: 6.25,
        guaranteedNightTax: 7.75,
        guaranteedDayWeekendTax: 8.5,
        guaranteedNightWeekendTax: 9.25,
      };

      const result = await service.update(created.id, body, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const updated = result._unsafeUnwrap();
      expect(updated.regionId).toBe(nextRegion.id);
      expect(updated.commercialCondition?.rainTax.toString()).toBe("4.5");
      expect(updated.commercialCondition?.guaranteedDayTax.toString()).toBe("6.25");
      expect(updated.commercialCondition?.guaranteedNightTax.toString()).toBe("7.75");
      expect(updated.commercialCondition?.guaranteedDayWeekendTax.toString()).toBe("8.5");
      expect(updated.commercialCondition?.guaranteedNightWeekendTax.toString()).toBe("9.25");
    });

    it("should return 404 when client is not found", async () => {
      const branch = await createTestBranch();

      const body: ClientUpdateDTO = {
        name: "Teste",
        cnpj: "00000000000000",
        cep: "01310100",
        street: "Rua Teste",
        number: "1",
        city: "São Paulo",
        neighborhood: "Centro",
        uf: "SP",
        contactName: "Contato",
        observations: "",
        contactPhone: "",
        provideMeal: false,
        branchId: branch.id,
      };

      const result = await service.update(crypto.randomUUID(), body, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });

    it("should return 404 for a soft-deleted client", async () => {
      const branch = await createTestBranch();
      const created = await createTestClient({ branchId: branch.id, isDeleted: true });

      const body: ClientUpdateDTO = {
        name: "Teste",
        cnpj: created.cnpj,
        cep: created.cep,
        street: created.street,
        number: created.number,
        city: created.city,
        neighborhood: created.neighborhood,
        uf: created.uf,
        contactName: created.contactName,
        observations: created.observations,
        contactPhone: created.contactPhone,
        provideMeal: created.provideMeal,
        branchId: branch.id,
      };

      const result = await service.update(created.id, body, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });

  describe(".delete", () => {
    it("should soft-delete a client successfully", async () => {
      const created = await createTestClient();

      const result = await service.delete(created.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ id: created.id });

      const inDb = await db.client.findUnique({ where: { id: created.id } });
      expect(inDb?.isDeleted).toBe(true);
    });

    it("should return 404 when client is not found", async () => {
      const result = await service.delete(crypto.randomUUID(), LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });

    it("should return 404 for an already soft-deleted client", async () => {
      const created = await createTestClient({ isDeleted: true });

      const result = await service.delete(created.id, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });

  describe(".listAllSmall", () => {
    it("should return only id, name and cnpj per item", async () => {
      await createTestClient({ name: "Small Client", cnpj: "33333333000100" });

      const result = await service.listAllSmall({ page: 1, pageSize: 10 });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(Object.keys(data[0]).sort()).toEqual(["cnpj", "id", "name"]);
    });

    it("should return paginated results", async () => {
      const branch = await createTestBranch();
      await createTestClient({ name: "S1", branchId: branch.id });
      await createTestClient({ name: "S2", branchId: branch.id });
      await createTestClient({ name: "S3", branchId: branch.id });

      const result = await service.listAllSmall({ page: 1, pageSize: 2 });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(2);
      expect(pagination.total).toBe(3);
      expect(pagination.totalPages).toBe(2);
    });

    it("should filter by search term (name)", async () => {
      const branch = await createTestBranch();
      await createTestClient({ name: "Supermercado Bom", branchId: branch.id });
      await createTestClient({ name: "Loja Ruim", branchId: branch.id });

      const result = await service.listAllSmall({ page: 1, pageSize: 10, search: "supermercado" });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Supermercado Bom");
    });

    it("should filter by search term (cnpj)", async () => {
      const branch = await createTestBranch();
      await createTestClient({ cnpj: "44444444000100", branchId: branch.id });
      await createTestClient({ cnpj: "55555555000100", branchId: branch.id });

      const result = await service.listAllSmall({ page: 1, pageSize: 10, search: "44444444" });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].cnpj).toBe("44444444000100");
    });

    it("should filter by branchId", async () => {
      const branch1 = await createTestBranch({ name: "Branch A" });
      const branch2 = await createTestBranch({ name: "Branch B" });
      await createTestClient({ name: "From A", branchId: branch1.id });
      await createTestClient({ name: "From B", branchId: branch2.id });

      const result = await service.listAllSmall({ page: 1, pageSize: 10, branchId: branch1.id });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("From A");
    });

    it("should exclude soft-deleted clients", async () => {
      const branch = await createTestBranch();
      await createTestClient({ name: "Active", branchId: branch.id });
      await createTestClient({ name: "Deleted", branchId: branch.id, isDeleted: true });

      const result = await service.listAllSmall({ page: 1, pageSize: 10 });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
      expect(pagination.total).toBe(1);
    });
  });
});

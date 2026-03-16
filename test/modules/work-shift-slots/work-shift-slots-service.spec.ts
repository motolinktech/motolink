import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { beforeEach, describe, expect, it } from "vitest";

process.env.AUTH_SECRET ??= "test-secret";

import { db } from "../../../src/lib/database";
import { workShiftSlotsService } from "../../../src/modules/work-shift-slots/work-shift-slots-service";
import type { WorkShiftSlotMutateDTO } from "../../../src/modules/work-shift-slots/work-shift-slots-types";
import { cleanDatabase } from "../../helpers/clean-database";

dayjs.extend(utc);

// --- Constants -----------------------------------------------------------

const LOGGED_USER_ID = crypto.randomUUID();

const SHIFT_DATE = new Date("2099-06-15");
const START_TIME = new Date("2099-06-15T08:00:00Z");
const END_TIME = new Date("2099-06-15T18:00:00Z");

const BASE_BODY: WorkShiftSlotMutateDTO = {
  clientId: crypto.randomUUID(), // will be overridden in tests
  status: "OPEN",
  contractType: "CLT",
  shiftDate: SHIFT_DATE,
  startTime: START_TIME,
  endTime: END_TIME,
  period: ["daytime"],
  auditStatus: "PENDING",
  isFreelancer: false,
  trackingConnected: false,
  deliverymanAmountDay: 0,
  deliverymanAmountNight: 0,
  deliverymanPaymentType: "",
  deliverymenPaymentValue: "",
  paymentForm: "DAILY",
  guaranteedQuantityDay: 0,
  guaranteedQuantityNight: 0,
  deliverymanPerDeliveryDay: 0,
  deliverymanPerDeliveryNight: 0,
  isWeekendRate: false,
  additionalTax: 0,
  rainTax: 0,
};

function createStoredDate(daysFromToday: number) {
  return dayjs.utc(dayjs().add(daysFromToday, "day").format("YYYY-MM-DD")).toDate();
}

// --- Test Data Factories -------------------------------------------------

async function createTestBranch(overrides: { name?: string } = {}) {
  return db.branch.create({
    data: {
      name: overrides.name ?? "Test Branch",
      code: crypto.randomUUID().slice(0, 8),
    },
  });
}

async function createTestClient(overrides: { name?: string; branchId?: string } = {}) {
  const branchId = overrides.branchId ?? (await createTestBranch()).id;
  return db.client.create({
    data: {
      name: overrides.name ?? "Test Client",
      cnpj: "00000000000000",
      cep: "01310100",
      street: "Av. Paulista",
      number: "1000",
      city: "São Paulo",
      neighborhood: "Bela Vista",
      uf: "SP",
      contactName: "Contato Teste",
      branchId,
      commercialCondition: { create: {} },
    },
  });
}

async function createTestDeliveryman(overrides: { name?: string; branchId?: string } = {}) {
  const branchId = overrides.branchId ?? (await createTestBranch()).id;
  return db.deliveryman.create({
    data: {
      name: overrides.name ?? "Test Deliveryman",
      document: crypto.randomUUID().slice(0, 11),
      phone: "11999999999",
      contractType: "CLT",
      mainPixKey: "pix@test.com",
      branchId,
    },
  });
}

async function createTestWorkShiftSlot(
  overrides: {
    clientId?: string;
    deliverymanId?: string;
    status?: string;
    shiftDate?: Date;
    startTime?: Date;
    endTime?: Date;
  } = {},
) {
  const clientId = overrides.clientId ?? (await createTestClient()).id;
  return db.workShiftSlot.create({
    data: {
      clientId,
      deliverymanId: overrides.deliverymanId,
      status: overrides.status ?? "OPEN",
      contractType: "CLT",
      shiftDate: overrides.shiftDate ?? SHIFT_DATE,
      startTime: overrides.startTime ?? START_TIME,
      endTime: overrides.endTime ?? END_TIME,
      auditStatus: "PENDING",
    },
  });
}

// --- Tests ---------------------------------------------------------------

describe("Work Shift Slots Service", () => {
  const service = workShiftSlotsService();

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe(".upsert", () => {
    it("should create a work shift slot when id is undefined", async () => {
      const client = await createTestClient();

      const result = await service.upsert(undefined, { ...BASE_BODY, clientId: client.id }, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);

      const slot = result._unsafeUnwrap();
      expect(slot.clientId).toBe(client.id);
      expect(slot.status).toBe("OPEN");
      expect(slot.contractType).toBe("CLT");
      expect(slot.client).toBeDefined();
      expect(slot.client.name).toBe("Test Client");
    });

    it("should create a work shift slot with a deliveryman", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });

      const result = await service.upsert(
        undefined,
        { ...BASE_BODY, clientId: client.id, deliverymanId: deliveryman.id },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);

      const slot = result._unsafeUnwrap();
      expect(slot.deliverymanId).toBe(deliveryman.id);
      expect(slot.deliveryman).toBeDefined();
      // biome-ignore lint/style/noNonNullAssertion: Test assertion
      expect(slot.deliveryman!.name).toBe("Test Deliveryman");
    });

    describe(".getById", () => {
      it("should return the work shift slot when found", async () => {
        const created = await createTestWorkShiftSlot();

        const result = await service.getById(created.id);

        expect(result.isOk()).toBe(true);
        // biome-ignore lint/style/noNonNullAssertion: Test assertion
        expect(result._unsafeUnwrap()!.id).toBe(created.id);
      });

      it("should include client and deliveryman relations", async () => {
        const branch = await createTestBranch();
        const client = await createTestClient({ branchId: branch.id });
        const deliveryman = await createTestDeliveryman({ branchId: branch.id });
        const created = await createTestWorkShiftSlot({ clientId: client.id, deliverymanId: deliveryman.id });

        const result = await service.getById(created.id);

        expect(result.isOk()).toBe(true);
        const slot = result._unsafeUnwrap();
        expect(slot.client.name).toBe("Test Client");
        // biome-ignore lint/style/noNonNullAssertion: Test assertion
        expect(slot.deliveryman!.name).toBe("Test Deliveryman");
      });

      it("should return 404 when not found", async () => {
        const result = await service.getById(crypto.randomUUID());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().statusCode).toBe(404);
      });
    });

    describe(".listAll", () => {
      it("should return paginated results", async () => {
        const client = await createTestClient();
        await createTestWorkShiftSlot({ clientId: client.id });
        await createTestWorkShiftSlot({ clientId: client.id });
        await createTestWorkShiftSlot({ clientId: client.id });

        const result = await service.listAll({ page: 1, pageSize: 2 });

        expect(result.isOk()).toBe(true);
        const { data, pagination } = result._unsafeUnwrap();
        expect(data).toHaveLength(2);
        expect(pagination.total).toBe(3);
        expect(pagination.totalPages).toBe(2);
      });

      it("should filter by clientId", async () => {
        const client1 = await createTestClient();
        const client2 = await createTestClient();
        await createTestWorkShiftSlot({ clientId: client1.id });
        await createTestWorkShiftSlot({ clientId: client2.id });

        const result = await service.listAll({ page: 1, pageSize: 10, clientId: client1.id });

        expect(result.isOk()).toBe(true);
        const { data } = result._unsafeUnwrap();
        expect(data).toHaveLength(1);
        expect(data[0].clientId).toBe(client1.id);
      });

      it("should filter by deliverymanId", async () => {
        const branch = await createTestBranch();
        const client = await createTestClient({ branchId: branch.id });
        const deliveryman1 = await createTestDeliveryman({ branchId: branch.id });
        const deliveryman2 = await createTestDeliveryman({ branchId: branch.id });
        await createTestWorkShiftSlot({ clientId: client.id, deliverymanId: deliveryman1.id });
        await createTestWorkShiftSlot({ clientId: client.id, deliverymanId: deliveryman2.id });

        const result = await service.listAll({ page: 1, pageSize: 10, deliverymanId: deliveryman1.id });

        expect(result.isOk()).toBe(true);
        const { data } = result._unsafeUnwrap();
        expect(data).toHaveLength(1);
        expect(data[0].deliverymanId).toBe(deliveryman1.id);
      });

      it("should filter by status", async () => {
        const client = await createTestClient();
        await createTestWorkShiftSlot({ clientId: client.id, status: "OPEN" });
        await createTestWorkShiftSlot({ clientId: client.id, status: "FILLED" });

        const result = await service.listAll({ page: 1, pageSize: 10, status: "OPEN" });

        expect(result.isOk()).toBe(true);
        const { data } = result._unsafeUnwrap();
        expect(data).toHaveLength(1);
        expect(data[0].status).toBe("OPEN");
      });

      it("should filter by shiftDate", async () => {
        const client = await createTestClient();
        await createTestWorkShiftSlot({ clientId: client.id, shiftDate: new Date("2099-06-15") });
        await createTestWorkShiftSlot({ clientId: client.id, shiftDate: new Date("2099-07-20") });

        const result = await service.listAll({ page: 1, pageSize: 10, shiftDate: new Date("2099-06-15") });

        expect(result.isOk()).toBe(true);
        const { data } = result._unsafeUnwrap();
        expect(data).toHaveLength(1);
      });

      it("should filter by search term (client name)", async () => {
        const client1 = await createTestClient({ name: "Alpha Store" });
        const client2 = await createTestClient({ name: "Beta Shop" });
        await createTestWorkShiftSlot({ clientId: client1.id });
        await createTestWorkShiftSlot({ clientId: client2.id });

        const result = await service.listAll({ page: 1, pageSize: 10, search: "Alpha" });

        expect(result.isOk()).toBe(true);
        const { data } = result._unsafeUnwrap();
        expect(data).toHaveLength(1);
        expect(data[0].client.name).toBe("Alpha Store");
      });
    });

    it("should block create when overlapping slot exists for same deliveryman", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });

      // Create an existing slot for the deliveryman
      await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        shiftDate: SHIFT_DATE,
        startTime: new Date("2099-06-15T09:00:00Z"),
        endTime: new Date("2099-06-15T17:00:00Z"),
      });

      // Try to create an overlapping slot
      const result = await service.upsert(
        undefined,
        { ...BASE_BODY, clientId: client.id, deliverymanId: deliveryman.id },
        LOGGED_USER_ID,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(400);
      expect(result._unsafeUnwrapErr().reason).toBe(
        "Este entregador já possui um turno com horário conflitante nesta data",
      );
    });

    it("should allow create with non-overlapping times for same deliveryman", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });

      // Existing slot: 08:00-12:00
      await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        shiftDate: SHIFT_DATE,
        startTime: new Date("2099-06-15T08:00:00Z"),
        endTime: new Date("2099-06-15T12:00:00Z"),
      });

      // New slot: 12:00-18:00 (no overlap, adjacent is fine)
      const result = await service.upsert(
        undefined,
        {
          ...BASE_BODY,
          clientId: client.id,
          deliverymanId: deliveryman.id,
          startTime: new Date("2099-06-15T12:00:00Z"),
          endTime: new Date("2099-06-15T18:00:00Z"),
        },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);
    });

    it("should allow overlapping slots for different deliverymen", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman1 = await createTestDeliveryman({ branchId: branch.id });
      const deliveryman2 = await createTestDeliveryman({ branchId: branch.id });

      await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman1.id,
        shiftDate: SHIFT_DATE,
      });

      const result = await service.upsert(
        undefined,
        { ...BASE_BODY, clientId: client.id, deliverymanId: deliveryman2.id },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);
    });

    it("should skip overlap check for OPEN slots (no deliveryman)", async () => {
      const client = await createTestClient();

      await createTestWorkShiftSlot({ clientId: client.id, shiftDate: SHIFT_DATE });

      // Create another OPEN slot at the same time — should succeed
      const result = await service.upsert(undefined, { ...BASE_BODY, clientId: client.id }, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
    });

    it("should exclude current slot during update (not conflict with itself)", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });

      const createResult = await service.upsert(
        undefined,
        { ...BASE_BODY, clientId: client.id, deliverymanId: deliveryman.id },
        LOGGED_USER_ID,
      );
      expect(createResult.isOk()).toBe(true);
      const slotId = createResult._unsafeUnwrap().id;

      // Update the same slot — should not conflict with itself
      const updateResult = await service.upsert(
        slotId,
        { ...BASE_BODY, clientId: client.id, deliverymanId: deliveryman.id, status: "FILLED" },
        LOGGED_USER_ID,
      );

      expect(updateResult.isOk()).toBe(true);
    });

    it("should ignore terminal-status slots in overlap check", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });

      // Create a CANCELLED slot for the deliveryman
      await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        shiftDate: SHIFT_DATE,
        status: "CANCELLED",
      });

      // Should succeed because the existing slot has terminal status
      const result = await service.upsert(
        undefined,
        { ...BASE_BODY, clientId: client.id, deliverymanId: deliveryman.id },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);
    });

    it("should update the work shift slot when id is provided", async () => {
      const client = await createTestClient();
      const created = await createTestWorkShiftSlot({ clientId: client.id });

      const result = await service.upsert(
        created.id,
        { ...BASE_BODY, clientId: client.id, status: "FILLED" },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().status).toBe("FILLED");
    });

    it("should allow editing a current-day slot that keeps a banned assigned deliveryman", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      const shiftDate = createStoredDate(0);
      const created = await createTestWorkShiftSlot({ clientId: client.id, deliverymanId: deliveryman.id, shiftDate });

      await db.clientBlock.create({
        data: {
          clientId: client.id,
          deliverymanId: deliveryman.id,
          reason: "Test ban",
        },
      });

      const result = await service.upsert(
        created.id,
        { ...BASE_BODY, clientId: client.id, deliverymanId: deliveryman.id, shiftDate, status: "CONFIRMED" },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().deliverymanId).toBe(deliveryman.id);
    });

    it("should block editing a past slot whose assigned deliveryman is banned for the client", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      const shiftDate = createStoredDate(-1);
      const created = await createTestWorkShiftSlot({ clientId: client.id, deliverymanId: deliveryman.id, shiftDate });

      await db.clientBlock.create({
        data: {
          clientId: client.id,
          deliverymanId: deliveryman.id,
          reason: "Test ban",
        },
      });

      const result = await service.upsert(
        created.id,
        { ...BASE_BODY, clientId: client.id, deliverymanId: deliveryman.id, shiftDate, status: "CONFIRMED" },
        LOGGED_USER_ID,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().reason).toBe(
        "Este turno não pode ser editado porque o entregador está banido para este cliente",
      );
    });

    it("should return 404 when updating a non-existent entity", async () => {
      const client = await createTestClient();

      const result = await service.upsert(crypto.randomUUID(), { ...BASE_BODY, clientId: client.id }, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });

  describe(".updateStatus", () => {
    it("should update status with valid transition (OPEN → INVITED)", async () => {
      const created = await createTestWorkShiftSlot({ status: "OPEN" });

      const result = await service.updateStatus(created.id, "INVITED", LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().status).toBe("INVITED");
    });

    it("should return 404 for non-existent slot", async () => {
      const result = await service.updateStatus(crypto.randomUUID(), "INVITED", LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });

    it("should return 400 for invalid transition (OPEN → COMPLETED)", async () => {
      const created = await createTestWorkShiftSlot({ status: "OPEN" });

      const result = await service.updateStatus(created.id, "COMPLETED", LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(400);
      expect(result._unsafeUnwrapErr().reason).toBe("Transição de status inválida");
    });

    it("should return 400 for terminal status (COMPLETED → OPEN)", async () => {
      const created = await createTestWorkShiftSlot({ status: "COMPLETED" });

      const result = await service.updateStatus(created.id, "OPEN", LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(400);
    });
  });

  describe(".updateTimes", () => {
    it("should allow editing times for a current-day slot that keeps a banned assigned deliveryman", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      const shiftDate = createStoredDate(0);
      const created = await createTestWorkShiftSlot({ clientId: client.id, deliverymanId: deliveryman.id, shiftDate });

      await db.clientBlock.create({
        data: {
          clientId: client.id,
          deliverymanId: deliveryman.id,
          reason: "Test ban",
        },
      });

      const result = await service.updateTimes(
        {
          id: created.id,
          checkInAt: "08:15",
          checkOutAt: "18:05",
        },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().checkInAt).not.toBeNull();
      expect(result._unsafeUnwrap().checkOutAt).not.toBeNull();
    });

    it("should block editing times for a past slot whose assigned deliveryman is banned for the client", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      const shiftDate = createStoredDate(-1);
      const created = await createTestWorkShiftSlot({ clientId: client.id, deliverymanId: deliveryman.id, shiftDate });

      await db.clientBlock.create({
        data: {
          clientId: client.id,
          deliverymanId: deliveryman.id,
          reason: "Test ban",
        },
      });

      const result = await service.updateTimes(
        {
          id: created.id,
          checkInAt: "08:15",
          checkOutAt: "18:05",
        },
        LOGGED_USER_ID,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().reason).toBe(
        "Este turno não pode ser editado porque o entregador está banido para este cliente",
      );
    });
  });

  describe(".copySlots", () => {
    it("should copy all slots from source date to target date", async () => {
      const client = await createTestClient();
      await createTestWorkShiftSlot({ clientId: client.id, shiftDate: SHIFT_DATE });
      await createTestWorkShiftSlot({ clientId: client.id, shiftDate: SHIFT_DATE });

      const targetDate = new Date("2099-06-20");
      const result = await service.copySlots(SHIFT_DATE, targetDate, client.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const { slots: copied } = result._unsafeUnwrap();
      expect(copied).toHaveLength(2);
      expect(copied[0].shiftDate).toEqual(targetDate);
      expect(copied[1].shiftDate).toEqual(targetDate);
    });

    it("should set status OPEN for copied slots without deliveryman", async () => {
      const client = await createTestClient();
      await createTestWorkShiftSlot({ clientId: client.id, shiftDate: SHIFT_DATE });

      const targetDate = new Date("2099-06-20");
      const result = await service.copySlots(SHIFT_DATE, targetDate, client.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const { slots: copied } = result._unsafeUnwrap();
      expect(copied[0].status).toBe("OPEN");
      expect(copied[0].deliverymanId).toBeNull();
    });

    it("should set status INVITED and keep deliverymanId for copied slots with deliveryman", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      await createTestWorkShiftSlot({ clientId: client.id, deliverymanId: deliveryman.id, shiftDate: SHIFT_DATE });

      const targetDate = new Date("2099-06-20");
      const result = await service.copySlots(SHIFT_DATE, targetDate, client.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const { slots: copied } = result._unsafeUnwrap();
      expect(copied[0].status).toBe("INVITED");
      expect(copied[0].deliverymanId).toBe(deliveryman.id);
    });

    it("should return 404 when no slots exist on source date", async () => {
      const client = await createTestClient();

      const result = await service.copySlots(new Date("2099-01-01"), new Date("2099-01-02"), client.id, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
      expect(result._unsafeUnwrapErr().reason).toBe("Nenhum turno de trabalho encontrado na data de origem");
    });

    it("should create new records distinct from source slots", async () => {
      const client = await createTestClient();
      const source = await createTestWorkShiftSlot({ clientId: client.id, shiftDate: SHIFT_DATE });

      const targetDate = new Date("2099-06-20");
      const result = await service.copySlots(SHIFT_DATE, targetDate, client.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const { slots: copied } = result._unsafeUnwrap();
      expect(copied[0].id).not.toBe(source.id);
    });

    it("should degrade to OPEN when deliveryman has conflict on target date", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      const targetDate = new Date("2099-06-20");

      // Create source slot with deliveryman
      await createTestWorkShiftSlot({ clientId: client.id, deliverymanId: deliveryman.id, shiftDate: SHIFT_DATE });

      // Create existing conflicting slot on target date
      await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        shiftDate: targetDate,
        startTime: new Date("2099-06-20T09:00:00Z"),
        endTime: new Date("2099-06-20T17:00:00Z"),
      });

      const result = await service.copySlots(SHIFT_DATE, targetDate, client.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const { slots: copied, degradedCount } = result._unsafeUnwrap();
      expect(copied[0].status).toBe("OPEN");
      expect(copied[0].deliverymanId).toBeNull();
      expect(degradedCount).toBe(1);
    });

    it("should handle intra-batch conflicts (same deliveryman, overlapping source slots)", async () => {
      const branch = await createTestBranch();
      const client1 = await createTestClient({ branchId: branch.id });
      const client2 = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });

      // Two overlapping source slots for the same deliveryman on different clients
      await createTestWorkShiftSlot({ clientId: client1.id, deliverymanId: deliveryman.id, shiftDate: SHIFT_DATE });
      await createTestWorkShiftSlot({ clientId: client2.id, deliverymanId: deliveryman.id, shiftDate: SHIFT_DATE });

      const targetDate = new Date("2099-06-20");

      // Copy client1 slots first (will succeed)
      const result1 = await service.copySlots(SHIFT_DATE, targetDate, client1.id, LOGGED_USER_ID);
      expect(result1.isOk()).toBe(true);
      expect(result1._unsafeUnwrap().degradedCount).toBe(0);

      // Copy client2 slots - deliveryman now has conflict from first copy
      const result2 = await service.copySlots(SHIFT_DATE, targetDate, client2.id, LOGGED_USER_ID);
      expect(result2.isOk()).toBe(true);
      const { slots: copied2, degradedCount } = result2._unsafeUnwrap();
      expect(copied2[0].status).toBe("OPEN");
      expect(copied2[0].deliverymanId).toBeNull();
      expect(degradedCount).toBe(1);
    });

    it("should return correct degradedCount of 0 when no conflicts", async () => {
      const client = await createTestClient();
      await createTestWorkShiftSlot({ clientId: client.id, shiftDate: SHIFT_DATE });

      const targetDate = new Date("2099-06-20");
      const result = await service.copySlots(SHIFT_DATE, targetDate, client.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().degradedCount).toBe(0);
    });
  });

  describe(".delete", () => {
    it("should hard delete the work shift slot successfully", async () => {
      const created = await createTestWorkShiftSlot();

      const result = await service.delete(created.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().id).toBe(created.id);

      const found = await db.workShiftSlot.findUnique({ where: { id: created.id } });
      expect(found).toBeNull();
    });

    it("should return 404 when entity is not found", async () => {
      const result = await service.delete(crypto.randomUUID(), LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });
});

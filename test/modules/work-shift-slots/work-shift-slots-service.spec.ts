import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { beforeEach, describe, expect, it } from "vitest";

process.env.AUTH_SECRET ??= "test-secret";

import { historyTraceActionConst, historyTraceEntityConst } from "../../../src/constants/history-trace";
import { db } from "../../../src/lib/database";
import { workShiftSlotsService } from "../../../src/modules/work-shift-slots/work-shift-slots-service";
import type { WorkShiftSlotMutateDTO } from "../../../src/modules/work-shift-slots/work-shift-slots-types";
import { dateKeyToDbDate, dbDateToDateKey, timeStringToDbTime } from "../../../src/utils/date-time";
import { cleanDatabase } from "../../helpers/clean-database";

dayjs.extend(utc);

// --- Constants -----------------------------------------------------------

const LOGGED_USER_ID = crypto.randomUUID();

const SHIFT_DATE_KEY = "2099-06-15";
const START_TIME_KEY = "08:00";
const END_TIME_KEY = "18:00";

const SHIFT_DATE = dateKeyToDbDate(SHIFT_DATE_KEY);
const START_TIME = timeStringToDbTime(START_TIME_KEY);
const END_TIME = timeStringToDbTime(END_TIME_KEY);

const BASE_BODY: WorkShiftSlotMutateDTO = {
  clientId: crypto.randomUUID(), // will be overridden in tests
  status: "OPEN",
  contractType: "CLT",
  shiftDate: SHIFT_DATE_KEY,
  startTime: START_TIME_KEY,
  endTime: END_TIME_KEY,
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
    contractType?: string;
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
      contractType: overrides.contractType ?? "CLT",
      shiftDate: overrides.shiftDate ?? SHIFT_DATE,
      startTime: overrides.startTime ?? START_TIME,
      endTime: overrides.endTime ?? END_TIME,
      auditStatus: "PENDING",
    },
  });
}

async function createActorUser() {
  return db.user.create({
    data: {
      id: LOGGED_USER_ID,
      name: "Actor User",
      email: "actor@example.com",
      status: "ACTIVE",
    },
  });
}

async function findHistoryTraceOrThrow(where: { entityId: string; action: string; entityType: string }) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const trace = await db.historyTrace.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (trace) {
      return trace;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error(`History trace not found for ${where.entityType}:${where.entityId}:${where.action}`);
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
        await createTestWorkShiftSlot({ clientId: client.id, shiftDate: dateKeyToDbDate("2099-06-15") });
        await createTestWorkShiftSlot({ clientId: client.id, shiftDate: dateKeyToDbDate("2099-07-20") });

        const result = await service.listAll({ page: 1, pageSize: 10, shiftDate: "2099-06-15" });

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

    describe(".getDashboardSummary", () => {
      it("should return totals by contract type scoped by branch and date", async () => {
        const branchA = await createTestBranch({ name: "Branch A" });
        const branchB = await createTestBranch({ name: "Branch B" });
        const clientA = await createTestClient({ branchId: branchA.id, name: "Client A" });
        const clientB = await createTestClient({ branchId: branchB.id, name: "Client B" });

        await createTestWorkShiftSlot({
          clientId: clientA.id,
          contractType: "FREELANCER",
          shiftDate: dateKeyToDbDate("2099-06-15"),
        });
        await createTestWorkShiftSlot({
          clientId: clientA.id,
          contractType: "FREELANCER",
          shiftDate: dateKeyToDbDate("2099-06-15"),
        });
        await createTestWorkShiftSlot({
          clientId: clientA.id,
          contractType: "INDEPENDENT_COLLABORATOR",
          shiftDate: dateKeyToDbDate("2099-06-15"),
        });
        await createTestWorkShiftSlot({
          clientId: clientB.id,
          contractType: "INDEPENDENT_COLLABORATOR",
          shiftDate: dateKeyToDbDate("2099-06-15"),
        });
        await createTestWorkShiftSlot({
          clientId: clientA.id,
          contractType: "FREELANCER",
          shiftDate: dateKeyToDbDate("2099-06-16"),
        });

        const result = await service.getDashboardSummary("2099-06-15", branchA.id);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().byContractType).toEqual({
          freelancer: 2,
          independentCollaborator: 1,
        });
      });

      it("should ignore deleted slots in the summary", async () => {
        const branch = await createTestBranch();
        const client = await createTestClient({ branchId: branch.id });

        await createTestWorkShiftSlot({
          clientId: client.id,
          contractType: "FREELANCER",
          shiftDate: dateKeyToDbDate("2099-06-15"),
        });
        await createTestWorkShiftSlot({
          clientId: client.id,
          contractType: "INDEPENDENT_COLLABORATOR",
          shiftDate: dateKeyToDbDate("2099-06-15"),
          status: "DELETED",
        });

        const result = await service.getDashboardSummary("2099-06-15", branch.id);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toMatchObject({
          total: 1,
          byContractType: {
            freelancer: 1,
            independentCollaborator: 0,
          },
        });
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
        startTime: timeStringToDbTime("09:00"),
        endTime: timeStringToDbTime("17:00"),
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
        startTime: timeStringToDbTime("08:00"),
        endTime: timeStringToDbTime("12:00"),
      });

      // New slot: 12:00-18:00 (no overlap, adjacent is fine)
      const result = await service.upsert(
        undefined,
        {
          ...BASE_BODY,
          clientId: client.id,
          deliverymanId: deliveryman.id,
          startTime: "12:00",
          endTime: "18:00",
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
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      const created = await createTestWorkShiftSlot({ clientId: client.id, deliverymanId: deliveryman.id });

      const result = await service.upsert(
        created.id,
        { ...BASE_BODY, clientId: client.id, deliverymanId: deliveryman.id, status: "FILLED" },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().status).toBe("FILLED");
    });

    it("should block saving a non-open slot without deliveryman", async () => {
      const client = await createTestClient();

      const result = await service.upsert(
        undefined,
        { ...BASE_BODY, clientId: client.id, status: "INVITED" },
        LOGGED_USER_ID,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(400);
      expect(result._unsafeUnwrapErr().reason).toBe(
        "É necessário atribuir um entregador antes de alterar o status do turno",
      );
    });

    it("should sync the payment request when a completed slot is edited", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      await createActorUser();

      const created = await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        status: "COMPLETED",
      });

      const initialResult = await service.upsert(
        created.id,
        {
          ...BASE_BODY,
          clientId: client.id,
          deliverymanId: deliveryman.id,
          status: "COMPLETED",
          deliverymanAmountDay: 100,
          additionalTax: 15,
          rainTax: 5,
        },
        LOGGED_USER_ID,
      );

      expect(initialResult.isOk()).toBe(true);

      const existingPaymentRequest = await db.paymentRequest.findFirst({
        where: { workShiftSlotId: created.id },
      });

      expect(existingPaymentRequest).not.toBeNull();
      expect(Number(existingPaymentRequest?.amount)).toBe(120);

      const updatedResult = await service.upsert(
        created.id,
        {
          ...BASE_BODY,
          clientId: client.id,
          deliverymanId: deliveryman.id,
          status: "COMPLETED",
          deliverymanAmountDay: 140,
          additionalTax: 20,
          rainTax: 10,
        },
        LOGGED_USER_ID,
      );

      expect(updatedResult.isOk()).toBe(true);

      const refreshedPaymentRequest = await db.paymentRequest.findFirst({
        where: { workShiftSlotId: created.id },
      });

      expect(refreshedPaymentRequest).not.toBeNull();
      expect(Number(refreshedPaymentRequest?.amount)).toBe(170);

      const trace = await findHistoryTraceOrThrow({
        entityType: historyTraceEntityConst.PAYMENT_REQUEST,
        entityId: existingPaymentRequest?.id ?? "",
        action: historyTraceActionConst.UPDATED,
      });

      expect(trace.changes).toMatchObject({
        amount: { old: "120", new: "170" },
      });
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
        {
          ...BASE_BODY,
          clientId: client.id,
          deliverymanId: deliveryman.id,
          shiftDate: dbDateToDateKey(shiftDate),
          status: "CONFIRMED",
        },
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
        {
          ...BASE_BODY,
          clientId: client.id,
          deliverymanId: deliveryman.id,
          shiftDate: dbDateToDateKey(shiftDate),
          status: "CONFIRMED",
        },
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
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      const created = await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        status: "OPEN",
      });

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

    it("should block leaving OPEN without a deliveryman", async () => {
      const created = await createTestWorkShiftSlot({ status: "OPEN" });

      const result = await service.updateStatus(created.id, "INVITED", LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(400);
      expect(result._unsafeUnwrapErr().reason).toBe(
        "É necessário atribuir um entregador antes de alterar o status do turno",
      );
    });

    it("should create a payment request when a slot is completed", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      await createActorUser();

      const created = await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        status: "PENDING_COMPLETION",
      });

      await db.discount.create({
        data: {
          workShiftSlotId: created.id,
          amount: 25,
          reason: "Operational discount",
          createdById: LOGGED_USER_ID,
          createdByName: "Actor User",
        },
      });

      await db.workShiftSlot.update({
        where: { id: created.id },
        data: {
          deliverymanAmountDay: 150,
          additionalTax: 20,
          rainTax: 10,
        },
      });

      const result = await service.updateStatus(created.id, "COMPLETED", LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);

      const paymentRequest = await db.paymentRequest.findFirst({
        where: { workShiftSlotId: created.id },
      });

      expect(paymentRequest).not.toBeNull();
      expect(paymentRequest).toMatchObject({
        deliverymanId: deliveryman.id,
        status: "NEW",
      });
      expect(Number(paymentRequest?.amount)).toBe(155);
      expect(Number(paymentRequest?.discount)).toBe(0);
      expect(Number(paymentRequest?.additionalTax)).toBe(0);

      const trace = await findHistoryTraceOrThrow({
        entityType: historyTraceEntityConst.PAYMENT_REQUEST,
        entityId: paymentRequest?.id ?? "",
        action: historyTraceActionConst.CREATED,
      });

      expect(trace.changes).toMatchObject({
        amount: { old: null, new: "155" },
        status: { old: null, new: "NEW" },
      });
    });

    describe("auto-clone on terminal status", () => {
      const CLONE_TRIGGER_STATUSES = [
        { from: "CONFIRMED", to: "ABSENT", absentReason: "Motivo do teste" },
        { from: "CONFIRMED", to: "CANCELLED" },
        { from: "INVITED", to: "REJECTED" },
        { from: "INVITED", to: "UNANSWERED" },
      ] as const;

      for (const { from, to, ...rest } of CLONE_TRIGGER_STATUSES) {
        it(`should create an OPEN clone when status changes to ${to}`, async () => {
          const branch = await createTestBranch();
          const client = await createTestClient({ branchId: branch.id });
          const deliveryman = await createTestDeliveryman({ branchId: branch.id });
          const slot = await createTestWorkShiftSlot({
            clientId: client.id,
            deliverymanId: deliveryman.id,
            status: from,
          });

          await db.workShiftSlot.update({
            where: { id: slot.id },
            data: { additionalTax: 15, rainTax: 5, deliverymanAmountDay: 100 },
          });

          const absentReason = "absentReason" in rest ? rest.absentReason : undefined;
          const result = await service.updateStatus(slot.id, to, LOGGED_USER_ID, absentReason, undefined, true);

          expect(result.isOk()).toBe(true);
          const value = result._unsafeUnwrap();
          expect(value.status).toBe(to);
          expect(value.clonedSlot).not.toBeNull();
          expect(value.clonedSlot!.status).toBe("OPEN");
          expect(value.clonedSlot!.deliverymanId).toBeNull();
          expect(value.clonedSlot!.id).not.toBe(slot.id);

          // Verify clone scheduling fields match original
          expect(value.clonedSlot!.clientId).toBe(client.id);
          expect(value.clonedSlot!.shiftDate).toEqual(slot.shiftDate);
          expect(value.clonedSlot!.startTime).toEqual(slot.startTime);
          expect(value.clonedSlot!.endTime).toEqual(slot.endTime);
          expect(value.clonedSlot!.contractType).toBe(slot.contractType);
          expect(value.clonedSlot!.period).toEqual(slot.period);

          // Verify clone financial fields were copied
          expect(Number(value.clonedSlot!.additionalTax)).toBe(15);
          expect(Number(value.clonedSlot!.rainTax)).toBe(5);
          expect(Number(value.clonedSlot!.deliverymanAmountDay)).toBe(100);
        });
      }

      it("should reset operational fields on the clone", async () => {
        const branch = await createTestBranch();
        const client = await createTestClient({ branchId: branch.id });
        const deliveryman = await createTestDeliveryman({ branchId: branch.id });
        const slot = await createTestWorkShiftSlot({
          clientId: client.id,
          deliverymanId: deliveryman.id,
          status: "CONFIRMED",
        });

        await db.workShiftSlot.update({
          where: { id: slot.id },
          data: {
            checkInAt: new Date(),
            trackingConnected: true,
            trackingConnectedAt: new Date(),
            logs: [{ event: "test" }],
            absentReason: "previous reason",
            inviteSentAt: new Date(),
            inviteToken: crypto.randomUUID(),
            inviteExpiresAt: new Date(),
          },
        });

        const result = await service.updateStatus(slot.id, "ABSENT", LOGGED_USER_ID, "Motivo teste", undefined, true);

        expect(result.isOk()).toBe(true);
        const clone = result._unsafeUnwrap().clonedSlot!;

        expect(clone.checkInAt).toBeNull();
        expect(clone.checkOutAt).toBeNull();
        expect(clone.trackingConnected).toBe(false);
        expect(clone.trackingConnectedAt).toBeNull();
        expect(clone.logs).toEqual([]);
        expect(clone.absentReason).toBeNull();
        expect(clone.inviteSentAt).toBeNull();
        expect(clone.inviteToken).toBeNull();
        expect(clone.inviteExpiresAt).toBeNull();
      });

      it("should keep the original slot unchanged at terminal status", async () => {
        const branch = await createTestBranch();
        const client = await createTestClient({ branchId: branch.id });
        const deliveryman = await createTestDeliveryman({ branchId: branch.id });
        const slot = await createTestWorkShiftSlot({
          clientId: client.id,
          deliverymanId: deliveryman.id,
          status: "CONFIRMED",
        });

        const result = await service.updateStatus(slot.id, "CANCELLED", LOGGED_USER_ID);
        expect(result.isOk()).toBe(true);

        const original = await db.workShiftSlot.findUnique({ where: { id: slot.id } });
        expect(original!.status).toBe("CANCELLED");
        expect(original!.deliverymanId).toBe(deliveryman.id);
      });

      it("should NOT create a clone when shouldClone is not provided", async () => {
        const branch = await createTestBranch();
        const client = await createTestClient({ branchId: branch.id });
        const deliveryman = await createTestDeliveryman({ branchId: branch.id });
        const slot = await createTestWorkShiftSlot({
          clientId: client.id,
          deliverymanId: deliveryman.id,
          status: "CONFIRMED",
        });

        const result = await service.updateStatus(slot.id, "CANCELLED", LOGGED_USER_ID);
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().clonedSlot).toBeNull();

        const allSlots = await db.workShiftSlot.findMany({ where: { clientId: client.id } });
        expect(allSlots).toHaveLength(1);
      });

      it("should log UPDATED on original and CREATED on clone", async () => {
        const branch = await createTestBranch();
        const client = await createTestClient({ branchId: branch.id });
        const deliveryman = await createTestDeliveryman({ branchId: branch.id });
        await createActorUser();
        const slot = await createTestWorkShiftSlot({
          clientId: client.id,
          deliverymanId: deliveryman.id,
          status: "CONFIRMED",
        });

        const result = await service.updateStatus(slot.id, "CANCELLED", LOGGED_USER_ID, undefined, undefined, true);
        expect(result.isOk()).toBe(true);
        const cloneId = result._unsafeUnwrap().clonedSlot!.id;

        const updateTrace = await findHistoryTraceOrThrow({
          entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
          entityId: slot.id,
          action: historyTraceActionConst.UPDATED,
        });
        expect(updateTrace).toBeDefined();

        const createTrace = await findHistoryTraceOrThrow({
          entityType: historyTraceEntityConst.WORK_SHIFT_SLOT,
          entityId: cloneId,
          action: historyTraceActionConst.CREATED,
        });
        expect(createTrace).toBeDefined();
      });

      it("should NOT create a clone when status changes to COMPLETED", async () => {
        const branch = await createTestBranch();
        const client = await createTestClient({ branchId: branch.id });
        const deliveryman = await createTestDeliveryman({ branchId: branch.id });
        const slot = await createTestWorkShiftSlot({
          clientId: client.id,
          deliverymanId: deliveryman.id,
          status: "PENDING_COMPLETION",
        });

        const result = await service.updateStatus(slot.id, "COMPLETED", LOGGED_USER_ID);
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().clonedSlot).toBeNull();

        const allSlots = await db.workShiftSlot.findMany({ where: { clientId: client.id } });
        expect(allSlots).toHaveLength(1);
      });
    });
  });

  describe(".updateTimes", () => {
    it("should allow editing times for a completed slot", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      const created = await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        status: "COMPLETED",
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
      expect(result._unsafeUnwrap().status).toBe("COMPLETED");
      expect(result._unsafeUnwrap().checkInAt).not.toBeNull();
      expect(result._unsafeUnwrap().checkOutAt).not.toBeNull();
    });

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

  describe(".createDiscount", () => {
    it("should recalculate the payment request amount for completed slots", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      await createActorUser();

      const slot = await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        status: "COMPLETED",
      });

      await service.upsert(
        slot.id,
        {
          ...BASE_BODY,
          clientId: client.id,
          deliverymanId: deliveryman.id,
          status: "COMPLETED",
          deliverymanAmountDay: 180,
          additionalTax: 20,
          rainTax: 0,
        },
        LOGGED_USER_ID,
      );

      const beforeDiscount = await db.paymentRequest.findFirst({
        where: { workShiftSlotId: slot.id },
      });

      expect(Number(beforeDiscount?.amount)).toBe(200);

      const result = await service.createDiscount(
        { workShiftSlotId: slot.id, amount: 30, reason: "Operational adjustment" },
        { id: LOGGED_USER_ID, name: "Actor User" },
      );

      expect(result.isOk()).toBe(true);

      const paymentRequest = await db.paymentRequest.findFirst({
        where: { workShiftSlotId: slot.id },
      });

      expect(paymentRequest).not.toBeNull();
      expect(Number(paymentRequest?.amount)).toBe(170);

      const trace = await findHistoryTraceOrThrow({
        entityType: historyTraceEntityConst.PAYMENT_REQUEST,
        entityId: paymentRequest?.id ?? "",
        action: historyTraceActionConst.UPDATED,
      });

      expect(trace.changes).toMatchObject({
        amount: { old: "200", new: "170" },
      });
    });
  });

  describe(".copySlots", () => {
    it("should copy all slots from source date to target date", async () => {
      const client = await createTestClient();
      await createTestWorkShiftSlot({ clientId: client.id, shiftDate: SHIFT_DATE });
      await createTestWorkShiftSlot({ clientId: client.id, shiftDate: SHIFT_DATE });

      const targetDate = "2099-06-20";
      const result = await service.copySlots(SHIFT_DATE_KEY, targetDate, client.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const { slots: copied } = result._unsafeUnwrap();
      expect(copied).toHaveLength(2);
      expect(copied[0].shiftDate).toEqual(dateKeyToDbDate(targetDate));
      expect(copied[1].shiftDate).toEqual(dateKeyToDbDate(targetDate));
    });

    it("should set status OPEN for copied slots without deliveryman", async () => {
      const client = await createTestClient();
      await createTestWorkShiftSlot({ clientId: client.id, shiftDate: SHIFT_DATE });

      const targetDate = "2099-06-20";
      const result = await service.copySlots(SHIFT_DATE_KEY, targetDate, client.id, LOGGED_USER_ID);

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

      const targetDate = "2099-06-20";
      const result = await service.copySlots(SHIFT_DATE_KEY, targetDate, client.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const { slots: copied } = result._unsafeUnwrap();
      expect(copied[0].status).toBe("INVITED");
      expect(copied[0].deliverymanId).toBe(deliveryman.id);
    });

    it("should return 404 when no slots exist on source date", async () => {
      const client = await createTestClient();

      const result = await service.copySlots("2099-01-01", "2099-01-02", client.id, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
      expect(result._unsafeUnwrapErr().reason).toBe("Nenhum turno de trabalho encontrado na data de origem");
    });

    it("should create new records distinct from source slots", async () => {
      const client = await createTestClient();
      const source = await createTestWorkShiftSlot({ clientId: client.id, shiftDate: SHIFT_DATE });

      const targetDate = "2099-06-20";
      const result = await service.copySlots(SHIFT_DATE_KEY, targetDate, client.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const { slots: copied } = result._unsafeUnwrap();
      expect(copied[0].id).not.toBe(source.id);
    });

    it("should degrade to OPEN when deliveryman has conflict on target date", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      const targetDate = "2099-06-20";

      // Create source slot with deliveryman
      await createTestWorkShiftSlot({ clientId: client.id, deliverymanId: deliveryman.id, shiftDate: SHIFT_DATE });

      // Create existing conflicting slot on target date
      await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        shiftDate: dateKeyToDbDate(targetDate),
        startTime: timeStringToDbTime("09:00"),
        endTime: timeStringToDbTime("17:00"),
      });

      const result = await service.copySlots(SHIFT_DATE_KEY, targetDate, client.id, LOGGED_USER_ID);

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

      const targetDate = "2099-06-20";

      // Copy client1 slots first (will succeed)
      const result1 = await service.copySlots(SHIFT_DATE_KEY, targetDate, client1.id, LOGGED_USER_ID);
      expect(result1.isOk()).toBe(true);
      expect(result1._unsafeUnwrap().degradedCount).toBe(0);

      // Copy client2 slots - deliveryman now has conflict from first copy
      const result2 = await service.copySlots(SHIFT_DATE_KEY, targetDate, client2.id, LOGGED_USER_ID);
      expect(result2.isOk()).toBe(true);
      const { slots: copied2, degradedCount } = result2._unsafeUnwrap();
      expect(copied2[0].status).toBe("OPEN");
      expect(copied2[0].deliverymanId).toBeNull();
      expect(degradedCount).toBe(1);
    });

    it("should return correct degradedCount of 0 when no conflicts", async () => {
      const client = await createTestClient();
      await createTestWorkShiftSlot({ clientId: client.id, shiftDate: SHIFT_DATE });

      const targetDate = "2099-06-20";
      const result = await service.copySlots(SHIFT_DATE_KEY, targetDate, client.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().degradedCount).toBe(0);
    });
  });

  describe(".delete", () => {
    it("should soft delete an open work shift slot successfully", async () => {
      const created = await createTestWorkShiftSlot();

      const result = await service.delete(created.id, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().id).toBe(created.id);

      const found = await db.workShiftSlot.findUnique({ where: { id: created.id } });
      expect(found?.status).toBe("DELETED");

      const listResult = await service.listAll({ page: 1, pageSize: 10 });
      expect(listResult.isOk()).toBe(true);
      expect(listResult._unsafeUnwrap().data).toHaveLength(0);
    });

    it("should return 400 when trying to delete a non-open work shift slot", async () => {
      const created = await createTestWorkShiftSlot({ status: "INVITED" });

      const result = await service.delete(created.id, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(400);
      expect(result._unsafeUnwrapErr().reason).toBe("Apenas turnos abertos podem ser excluídos");
    });

    it("should return 404 when entity is not found", async () => {
      const result = await service.delete(crypto.randomUUID(), LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });
});

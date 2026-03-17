import { beforeEach, describe, expect, it } from "vitest";

process.env.AUTH_SECRET ??= "test-secret";

import { historyTraceActionConst, historyTraceEntityConst } from "../../../src/constants/history-trace";
import { db } from "../../../src/lib/database";
import { paymentRequestsService } from "../../../src/modules/payment-requests/payment-requests-service";
import type { PaymentRequestMutateDTO } from "../../../src/modules/payment-requests/payment-requests-types";
import { cleanDatabase } from "../../helpers/clean-database";

// --- Constants -----------------------------------------------------------

const LOGGED_USER_ID = crypto.randomUUID();

const SHIFT_DATE = new Date("2099-06-15");
const START_TIME = new Date("2099-06-15T08:00:00Z");
const END_TIME = new Date("2099-06-15T18:00:00Z");

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

async function createTestWorkShiftSlot(overrides: { clientId?: string; deliverymanId?: string } = {}) {
  const clientId = overrides.clientId ?? (await createTestClient()).id;
  return db.workShiftSlot.create({
    data: {
      clientId,
      deliverymanId: overrides.deliverymanId,
      status: "OPEN",
      contractType: "CLT",
      shiftDate: SHIFT_DATE,
      startTime: START_TIME,
      endTime: END_TIME,
      auditStatus: "PENDING",
    },
  });
}

async function createTestPaymentRequest(
  overrides: {
    workShiftSlotId?: string;
    deliverymanId?: string;
    amount?: number;
    discount?: number;
    additionalTax?: number;
    status?: string;
  } = {},
) {
  const branch = await createTestBranch();
  const deliverymanId = overrides.deliverymanId ?? (await createTestDeliveryman({ branchId: branch.id })).id;
  const workShiftSlotId = overrides.workShiftSlotId ?? (await createTestWorkShiftSlot({ deliverymanId })).id;
  return db.paymentRequest.create({
    data: {
      workShiftSlotId,
      deliverymanId,
      amount: overrides.amount ?? 100,
      discount: overrides.discount ?? 0,
      additionalTax: overrides.additionalTax ?? 0,
      deliverymanAdditionalKm: 0,
      status: overrides.status ?? "NEW",
    },
  });
}

async function createBaseBody(): Promise<PaymentRequestMutateDTO> {
  const branch = await createTestBranch();
  const deliveryman = await createTestDeliveryman({ branchId: branch.id });
  const slot = await createTestWorkShiftSlot({ deliverymanId: deliveryman.id });
  return {
    workShiftSlotId: slot.id,
    deliverymanId: deliveryman.id,
    amount: 150,
    discount: 0,
    additionalTax: 0,
    status: "NEW",
  };
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

describe("Payment Requests Service", () => {
  const service = paymentRequestsService();

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe(".create", () => {
    it("should create a payment request successfully", async () => {
      const body = await createBaseBody();

      const result = await service.create(body, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const paymentRequest = result._unsafeUnwrap();
      expect(paymentRequest.amount).toBe(150);
      expect(paymentRequest.status).toBe("NEW");
      expect(paymentRequest.workShiftSlotId).toBe(body.workShiftSlotId);
      expect(paymentRequest.deliverymanId).toBe(body.deliverymanId);
      expect(paymentRequest.discount).toBe(0);
      expect(paymentRequest.additionalTax).toBe(0);
    });

    it("should create a history trace when a payment request is created", async () => {
      const body = await createBaseBody();
      await createActorUser();

      const result = await service.create(body, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      const paymentRequest = result._unsafeUnwrap();

      const trace = await findHistoryTraceOrThrow({
        entityType: historyTraceEntityConst.PAYMENT_REQUEST,
        entityId: paymentRequest.id,
        action: historyTraceActionConst.CREATED,
      });

      expect(trace.userId).toBe(LOGGED_USER_ID);
      expect(trace.changes).toMatchObject({
        amount: { old: null, new: "150" },
        status: { old: null, new: "NEW" },
      });
    });

    it("should create with a custom status", async () => {
      const body = await createBaseBody();
      body.status = "APPROVED";

      const result = await service.create(body, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().status).toBe("APPROVED");
    });
  });

  describe(".update", () => {
    it("should update amount successfully", async () => {
      const existing = await createTestPaymentRequest({ amount: 100 });

      const result = await service.update(existing.id, { amount: 200 }, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().amount).toBe(200);
    });

    it("should create a history trace when a payment request is updated", async () => {
      const existing = await createTestPaymentRequest({ amount: 100 });
      await createActorUser();

      const result = await service.update(existing.id, { amount: 200 }, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);

      const trace = await findHistoryTraceOrThrow({
        entityType: historyTraceEntityConst.PAYMENT_REQUEST,
        entityId: existing.id,
        action: historyTraceActionConst.UPDATED,
      });

      expect(trace.changes).toMatchObject({
        amount: { old: "100", new: "200" },
      });
    });

    it("should update status successfully", async () => {
      const existing = await createTestPaymentRequest();

      const result = await service.update(existing.id, { status: "APPROVED" }, LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().status).toBe("APPROVED");
    });

    it("should update finance adjustments successfully", async () => {
      const existing = await createTestPaymentRequest({ discount: 0, additionalTax: 0 });

      const result = await service.update(
        existing.id,
        { discount: 12, discountReason: "Acerto", additionalTax: 8, taxReason: "Bônus" },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toMatchObject({
        discount: 12,
        discountReason: "Acerto",
        additionalTax: 8,
        taxReason: "Bônus",
      });
    });

    it("should return 404 when not found", async () => {
      const result = await service.update(crypto.randomUUID(), { amount: 200 }, LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });

  describe(".getById", () => {
    it("should return the payment request with relations", async () => {
      const existing = await createTestPaymentRequest();

      const result = await service.getById(existing.id);

      expect(result.isOk()).toBe(true);
      const paymentRequest = result._unsafeUnwrap();
      expect(paymentRequest.id).toBe(existing.id);
      expect(paymentRequest.deliveryman).toBeDefined();
      expect(paymentRequest.workShiftSlot).toBeDefined();
    });

    it("should return 404 when not found", async () => {
      const result = await service.getById(crypto.randomUUID());

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });

  describe(".updateStatus", () => {
    it("should update the status successfully", async () => {
      const existing = await createTestPaymentRequest({ status: "NEW" });

      const result = await service.updateStatus(existing.id, "APPROVED", LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().status).toBe("APPROVED");
    });

    it("should create a history trace when status is updated", async () => {
      const existing = await createTestPaymentRequest({ status: "NEW" });
      await createActorUser();

      const result = await service.updateStatus(existing.id, "APPROVED", LOGGED_USER_ID);

      expect(result.isOk()).toBe(true);

      const trace = await findHistoryTraceOrThrow({
        entityType: historyTraceEntityConst.PAYMENT_REQUEST,
        entityId: existing.id,
        action: historyTraceActionConst.UPDATED,
      });

      expect(trace.changes).toMatchObject({
        status: { old: "NEW", new: "APPROVED" },
      });
    });

    it("should return 404 when not found", async () => {
      const result = await service.updateStatus(crypto.randomUUID(), "APPROVED", LOGGED_USER_ID);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });
  });

  describe(".listAll", () => {
    it("should return paginated results", async () => {
      await createTestPaymentRequest();
      await createTestPaymentRequest();
      await createTestPaymentRequest();

      const result = await service.listAll({ page: 1, pageSize: 2 });

      expect(result.isOk()).toBe(true);
      const { data, pagination } = result._unsafeUnwrap();
      expect(data).toHaveLength(2);
      expect(pagination.total).toBe(3);
      expect(pagination.totalPages).toBe(2);
    });

    it("should filter by deliverymanId", async () => {
      const branch = await createTestBranch();
      const deliveryman1 = await createTestDeliveryman({ branchId: branch.id });
      const deliveryman2 = await createTestDeliveryman({ branchId: branch.id });
      await createTestPaymentRequest({ deliverymanId: deliveryman1.id });
      await createTestPaymentRequest({ deliverymanId: deliveryman1.id });
      await createTestPaymentRequest({ deliverymanId: deliveryman2.id });

      const result = await service.listAll({ page: 1, pageSize: 10, deliverymanId: deliveryman1.id });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(2);
    });

    it("should filter by status", async () => {
      await createTestPaymentRequest({ status: "NEW" });
      await createTestPaymentRequest({ status: "APPROVED" });
      await createTestPaymentRequest({ status: "APPROVED" });

      const result = await service.listAll({ page: 1, pageSize: 10, status: "APPROVED" });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(2);
    });

    it("should filter by workShiftSlotId", async () => {
      const branch = await createTestBranch();
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      const slot1 = await createTestWorkShiftSlot({ deliverymanId: deliveryman.id });
      const slot2 = await createTestWorkShiftSlot({ deliverymanId: deliveryman.id });
      await createTestPaymentRequest({ workShiftSlotId: slot1.id, deliverymanId: deliveryman.id });
      await createTestPaymentRequest({ workShiftSlotId: slot2.id, deliverymanId: deliveryman.id });

      const result = await service.listAll({ page: 1, pageSize: 10, workShiftSlotId: slot1.id });

      expect(result.isOk()).toBe(true);
      const { data } = result._unsafeUnwrap();
      expect(data).toHaveLength(1);
    });
  });
});

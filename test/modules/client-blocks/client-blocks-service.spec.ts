import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { beforeEach, describe, expect, it } from "vitest";

process.env.AUTH_SECRET ??= "test-secret";

import { db } from "../../../src/lib/database";
import { clientBlocksService } from "../../../src/modules/client-blocks/client-blocks-service";
import { cleanDatabase } from "../../helpers/clean-database";

dayjs.extend(utc);

const LOGGED_USER_ID = crypto.randomUUID();

function createStoredDate(daysFromToday: number) {
  return dayjs.utc(dayjs().add(daysFromToday, "day").format("YYYY-MM-DD")).toDate();
}

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

async function createTestDeliveryman(overrides: { name?: string; branchId?: string } = {}) {
  const branchId = overrides.branchId ?? (await createTestBranch()).id;
  return db.deliveryman.create({
    data: {
      name: overrides.name ?? "Test Deliveryman",
      document: `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 11),
      phone: "11999999999",
      contractType: "CLT",
      mainPixKey: "pix@test.com",
      branchId,
    },
  });
}

async function createTestWorkShiftSlot(
  overrides: {
    clientId: string;
    deliverymanId?: string;
    shiftDate: Date;
    status?: string;
    inviteToken?: string | null;
    inviteSentAt?: Date | null;
    inviteExpiresAt?: Date | null;
  },
) {
  return db.workShiftSlot.create({
    data: {
      clientId: overrides.clientId,
      deliverymanId: overrides.deliverymanId,
      status: overrides.status ?? "INVITED",
      contractType: "CLT",
      shiftDate: overrides.shiftDate,
      startTime: new Date("2099-06-15T08:00:00Z"),
      endTime: new Date("2099-06-15T18:00:00Z"),
      auditStatus: "PENDING",
      inviteToken: overrides.inviteToken ?? null,
      inviteSentAt: overrides.inviteSentAt ?? null,
      inviteExpiresAt: overrides.inviteExpiresAt ?? null,
    },
  });
}

describe("Client Blocks Service", () => {
  const service = clientBlocksService();

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe(".ban", () => {
    it("should reopen future same-client slots and clear invite fields", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });
      const futureDate = createStoredDate(2);

      const invitedSlot = await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        shiftDate: futureDate,
        status: "INVITED",
        inviteToken: crypto.randomUUID(),
        inviteSentAt: new Date(),
        inviteExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const confirmedSlot = await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        shiftDate: futureDate,
        status: "CONFIRMED",
        inviteToken: crypto.randomUUID(),
        inviteSentAt: new Date(),
        inviteExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const result = await service.ban(
        {
          clientId: client.id,
          deliverymanId: deliveryman.id,
          reason: "Operational issue",
        },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);

      const refreshedSlots = await db.workShiftSlot.findMany({
        where: { id: { in: [invitedSlot.id, confirmedSlot.id] } },
      });

      for (const slot of refreshedSlots) {
        expect(slot.deliverymanId).toBeNull();
        expect(slot.status).toBe("OPEN");
        expect(slot.inviteToken).toBeNull();
        expect(slot.inviteSentAt).toBeNull();
        expect(slot.inviteExpiresAt).toBeNull();
      }
    });

    it("should keep current and past same-client slots assigned", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });

      const todaySlot = await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        shiftDate: createStoredDate(0),
        status: "CONFIRMED",
        inviteToken: crypto.randomUUID(),
        inviteSentAt: new Date(),
        inviteExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const pastSlot = await createTestWorkShiftSlot({
        clientId: client.id,
        deliverymanId: deliveryman.id,
        shiftDate: createStoredDate(-1),
        status: "CHECKED_IN",
        inviteToken: crypto.randomUUID(),
        inviteSentAt: new Date(),
        inviteExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const result = await service.ban(
        {
          clientId: client.id,
          deliverymanId: deliveryman.id,
          reason: "Operational issue",
        },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);

      const refreshedToday = await db.workShiftSlot.findUnique({ where: { id: todaySlot.id } });
      const refreshedPast = await db.workShiftSlot.findUnique({ where: { id: pastSlot.id } });

      expect(refreshedToday?.deliverymanId).toBe(deliveryman.id);
      expect(refreshedToday?.status).toBe("CONFIRMED");
      expect(refreshedToday?.inviteToken).toBe(todaySlot.inviteToken);

      expect(refreshedPast?.deliverymanId).toBe(deliveryman.id);
      expect(refreshedPast?.status).toBe("CHECKED_IN");
      expect(refreshedPast?.inviteToken).toBe(pastSlot.inviteToken);
    });

    it("should keep future slots for other clients unchanged", async () => {
      const branch = await createTestBranch();
      const client = await createTestClient({ branchId: branch.id });
      const otherClient = await createTestClient({ name: "Other Client", branchId: branch.id });
      const deliveryman = await createTestDeliveryman({ branchId: branch.id });

      const otherClientSlot = await createTestWorkShiftSlot({
        clientId: otherClient.id,
        deliverymanId: deliveryman.id,
        shiftDate: createStoredDate(3),
        status: "CONFIRMED",
        inviteToken: crypto.randomUUID(),
        inviteSentAt: new Date(),
        inviteExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const result = await service.ban(
        {
          clientId: client.id,
          deliverymanId: deliveryman.id,
          reason: "Operational issue",
        },
        LOGGED_USER_ID,
      );

      expect(result.isOk()).toBe(true);

      const refreshedSlot = await db.workShiftSlot.findUnique({ where: { id: otherClientSlot.id } });

      expect(refreshedSlot?.deliverymanId).toBe(deliveryman.id);
      expect(refreshedSlot?.status).toBe("CONFIRMED");
      expect(refreshedSlot?.inviteToken).toBe(otherClientSlot.inviteToken);
    });
  });
});

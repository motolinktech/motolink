import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../src/lib/database";
import { whatsappMessageTypeConst } from "../../../src/constants/whatsapp";
import { whatsappService } from "../../../src/modules/whatsapp/whatsapp-service";
import { cleanDatabase } from "../../helpers/clean-database";

async function createTestBranch(
  overrides: {
    whatsappUrl?: string | null;
    whatsappApiKey?: string | null;
  } = {},
) {
  return db.branch.create({
    data: {
      name: "Test Branch",
      code: "TEST",
      whatsappUrl: "http://waha.test",
      whatsappApiKey: "test-api-key",
      ...overrides,
    },
  });
}

describe("WhatsApp Service", () => {
  const service = whatsappService();

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe(".sendInvite", () => {
    it("should return 404 when branch is not found", async () => {
      const result = await service.sendInvite({
        phone: "11999999999",
        branchId: "00000000-0000-0000-0000-000000000000",
        type: whatsappMessageTypeConst.WORK_SHIFT,
        content: {},
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(404);
    });

    it("should return 422 when branch has no whatsappUrl", async () => {
      const branch = await createTestBranch({ whatsappUrl: null });

      const result = await service.sendInvite({
        phone: "11999999999",
        branchId: branch.id,
        type: whatsappMessageTypeConst.WORK_SHIFT,
        content: {},
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(422);
    });

    it("should return 422 when branch has no whatsappApiKey", async () => {
      const branch = await createTestBranch({ whatsappApiKey: null });

      const result = await service.sendInvite({
        phone: "11999999999",
        branchId: branch.id,
        type: whatsappMessageTypeConst.WORK_SHIFT,
        content: {},
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(422);
    });

    it("should return 502 when fetch returns a non-ok response", async () => {
      const branch = await createTestBranch();

      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 500 }),
      );

      const result = await service.sendInvite({
        phone: "11999999999",
        branchId: branch.id,
        type: whatsappMessageTypeConst.WORK_SHIFT,
        content: {},
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(502);
    });

    it("should return 502 when fetch throws an error", async () => {
      const branch = await createTestBranch();

      vi.spyOn(global, "fetch").mockRejectedValueOnce(
        new Error("Network failure"),
      );

      const result = await service.sendInvite({
        phone: "11999999999",
        branchId: branch.id,
        type: whatsappMessageTypeConst.WORK_SHIFT,
        content: {},
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().statusCode).toBe(502);
    });

    it("should succeed and call the correct endpoint with headers", async () => {
      const branch = await createTestBranch();
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(new Response(null, { status: 200 }));

      const result = await service.sendInvite({
        phone: "11999999999",
        branchId: branch.id,
        type: whatsappMessageTypeConst.WORK_SHIFT,
        content: { shift: "morning" },
      });

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe("http://waha.test/api/sendText");
      expect((init?.headers as Record<string, string>)["X-Api-Key"]).toBe("test-api-key");

      const body = JSON.parse(init?.body as string);
      expect(body.chatId).toBe("5511999999999@c.us");
    });

    it("should prepend country code 55 when phone has none", async () => {
      const branch = await createTestBranch();
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(new Response(null, { status: 200 }));

      await service.sendInvite({
        phone: "11999999999",
        branchId: branch.id,
        type: whatsappMessageTypeConst.INTERNAL,
        content: {},
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.chatId).toBe("5511999999999@c.us");
    });

    it("should not double-prefix when phone already starts with 55", async () => {
      const branch = await createTestBranch();
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(new Response(null, { status: 200 }));

      await service.sendInvite({
        phone: "5511999999999",
        branchId: branch.id,
        type: whatsappMessageTypeConst.INTERNAL,
        content: {},
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.chatId).toBe("5511999999999@c.us");
    });

    it("should strip non-digit characters from phone before formatting", async () => {
      const branch = await createTestBranch();
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(new Response(null, { status: 200 }));

      await service.sendInvite({
        phone: "(11) 9-9999-9999",
        branchId: branch.id,
        type: whatsappMessageTypeConst.WORK_SHIFT,
        content: {},
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.chatId).toBe("5511999999999@c.us");
    });
  });
});

import { errAsync, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: (...args: unknown[]) => mockGet(...args) }),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

const mockGetById = vi.fn();
vi.mock("@/modules/users/users-service", () => ({
  usersService: () => ({ getById: mockGetById }),
}));

import { checkPagePermission } from "@/utils/check-page-permission";

describe("checkPagePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when no user_id cookie exists", async () => {
    mockGet.mockReturnValue(undefined);

    await expect(checkPagePermission("users.view")).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it("redirects to /login when usersService returns an error", async () => {
    mockGet.mockReturnValue({ value: "user-123" });
    mockGetById.mockResolvedValue(errAsync({ reason: "Erro", statusCode: 500 }));

    await expect(checkPagePermission("users.view")).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when usersService returns null user", async () => {
    mockGet.mockReturnValue({ value: "user-123" });
    mockGetById.mockResolvedValue(okAsync(null));

    await expect(checkPagePermission("users.view")).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("returns true when user has the requested permission", async () => {
    mockGet.mockReturnValue({ value: "user-123" });
    mockGetById.mockResolvedValue(okAsync({ role: "USER", permissions: ["users.view", "users.create"] }));

    const result = await checkPagePermission("users.view");

    expect(result).toBe(true);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns false when user lacks the requested permission", async () => {
    mockGet.mockReturnValue({ value: "user-123" });
    mockGetById.mockResolvedValue(okAsync({ role: "USER", permissions: ["users.view"] }));

    const result = await checkPagePermission("users.delete");

    expect(result).toBe(false);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns true for ADMIN regardless of permission", async () => {
    mockGet.mockReturnValue({ value: "admin-123" });
    mockGetById.mockResolvedValue(okAsync({ role: "ADMIN", permissions: [] }));

    const result = await checkPagePermission("users.delete");

    expect(result).toBe(true);
  });
});

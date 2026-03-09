import { describe, expect, it } from "vitest";
import { generateSecureToken } from "@/utils/generate-secure-token";

describe("generateSecureToken", () => {
  it("returns hex string of requested byte length", () => {
    const t = generateSecureToken(4);

    expect(t.length).toBe(8);
    expect(/^[0-9a-f]+$/.test(t)).toBe(true);
  });

  it("defaults to 32 bytes when none provided", () => {
    const t = generateSecureToken();

    expect(t.length).toBe(32 * 2);
    expect(/^[0-9a-f]+$/.test(t)).toBe(true);
  });

  it("returns unique tokens on each call", () => {
    const a = generateSecureToken();
    const b = generateSecureToken();

    expect(a).not.toBe(b);
  });
});

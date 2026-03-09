import { describe, expect, it } from "vitest";
import { passwordRegex } from "@/utils/password-regex";

describe("passwordRegex", () => {
  it("matches when contains lower, upper, digit and special", () => {
    expect(passwordRegex.test("Aa1!")).toBe(true);
    expect(passwordRegex.test("StrongP@ssw0rd")).toBe(true);
  });

  it("fails when missing uppercase", () => {
    expect(passwordRegex.test("aa1!")).toBe(false);
  });

  it("fails when missing lowercase", () => {
    expect(passwordRegex.test("AA1!")).toBe(false);
  });

  it("fails when missing digit", () => {
    expect(passwordRegex.test("Aa!!")).toBe(false);
  });

  it("fails when missing special char", () => {
    expect(passwordRegex.test("Aa11")).toBe(false);
  });
});

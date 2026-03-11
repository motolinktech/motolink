import { describe, expect, it } from "vitest";
import { applyMoneyMask } from "@/utils/masks/money-mask";

describe("applyMoneyMask", () => {
  it("returns empty string for empty input", () => {
    expect(applyMoneyMask("")).toBe("");
  });

  it("returns empty string for non-digit input", () => {
    expect(applyMoneyMask("abc")).toBe("");
  });

  it("formats single digit as cents", () => {
    expect(applyMoneyMask("1")).toBe("R$ 0,01");
    expect(applyMoneyMask("5")).toBe("R$ 0,05");
  });

  it("formats two digits as cents", () => {
    expect(applyMoneyMask("12")).toBe("R$ 0,12");
    expect(applyMoneyMask("99")).toBe("R$ 0,99");
  });

  it("formats three digits with integer and decimal parts", () => {
    expect(applyMoneyMask("100")).toBe("R$ 1,00");
    expect(applyMoneyMask("123")).toBe("R$ 1,23");
  });

  it("formats values in the hundreds", () => {
    expect(applyMoneyMask("1000")).toBe("R$ 10,00");
    expect(applyMoneyMask("12345")).toBe("R$ 123,45");
  });

  it("formats values in the thousands with dot separator", () => {
    expect(applyMoneyMask("100000")).toBe("R$ 1.000,00");
    expect(applyMoneyMask("999999")).toBe("R$ 9.999,99");
  });

  it("formats values in the millions", () => {
    expect(applyMoneyMask("100000000")).toBe("R$ 1.000.000,00");
  });

  it("strips non-digit characters before formatting", () => {
    expect(applyMoneyMask("R$ 1.234,56")).toBe("R$ 1.234,56");
    expect(applyMoneyMask("a1b2c3")).toBe("R$ 1,23");
  });

  it("handles leading zeros in input", () => {
    expect(applyMoneyMask("001")).toBe("R$ 0,01");
    expect(applyMoneyMask("010")).toBe("R$ 0,10");
  });
});

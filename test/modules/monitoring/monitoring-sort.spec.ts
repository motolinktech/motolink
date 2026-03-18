import { describe, expect, it } from "vitest";

import { compareMonitoringWorkShifts } from "../../../src/modules/monitoring/monitoring-sort";

describe("compareMonitoringWorkShifts", () => {
  it("orders monitoring work shifts only by start time", () => {
    const orderedIds = [
      {
        id: "late-open",
        status: "OPEN",
        period: ["nighttime"],
        startTime: "18:00:00",
        endTime: "22:00:00",
        deliveryman: { name: "Carlos" },
      },
      {
        id: "early-confirmed",
        status: "CONFIRMED",
        period: ["nighttime"],
        startTime: "08:00:00",
        endTime: "12:00:00",
        deliveryman: { name: "Bruno" },
      },
      {
        id: "mid-cancelled",
        status: "CANCELLED",
        period: ["daytime"],
        startTime: "12:30:00",
        endTime: "16:00:00",
        deliveryman: { name: "Ana" },
      },
    ]
      .toSorted(compareMonitoringWorkShifts)
      .map((slot) => slot.id);

    expect(orderedIds).toEqual(["early-confirmed", "mid-cancelled", "late-open"]);
  });

  it("preserves the incoming order when start times are equal", () => {
    const orderedIds = [
      {
        id: "first-open",
        status: "OPEN",
        period: ["daytime"],
        startTime: "09:00:00",
        endTime: "10:00:00",
        deliveryman: null,
      },
      {
        id: "second-completed",
        status: "COMPLETED",
        period: ["nighttime"],
        startTime: "09:00:00",
        endTime: "13:00:00",
        deliveryman: { name: "Zeca" },
      },
      {
        id: "third-invited",
        status: "INVITED",
        period: ["daytime", "nighttime"],
        startTime: "09:00:00",
        endTime: "11:00:00",
        deliveryman: { name: "Bianca" },
      },
    ]
      .toSorted(compareMonitoringWorkShifts)
      .map((slot) => slot.id);

    expect(orderedIds).toEqual(["first-open", "second-completed", "third-invited"]);
  });
});

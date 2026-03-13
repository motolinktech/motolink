export const workShiftSlotStatusConst = {
  OPEN: "OPEN",
  INVITED: "INVITED",
  CONFIRMED: "CONFIRMED",
  CHECKED_IN: "CHECKED_IN",
  PENDING_COMPLETION: "PENDING_COMPLETION",
  COMPLETED: "COMPLETED",
  ABSENT: "ABSENT",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
} as const;

export type WorkShiftSlotStatus = (typeof workShiftSlotStatusConst)[keyof typeof workShiftSlotStatusConst];

export const workShiftSlotStatusTransitions: Record<WorkShiftSlotStatus, WorkShiftSlotStatus[]> = {
  OPEN: ["INVITED", "CANCELLED"],
  INVITED: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "ABSENT", "CANCELLED"],
  CHECKED_IN: ["PENDING_COMPLETION", "ABSENT"],
  PENDING_COMPLETION: ["COMPLETED"],
  REJECTED: ["OPEN"],
  COMPLETED: [],
  ABSENT: [],
  CANCELLED: [],
};

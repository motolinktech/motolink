export const statusConst = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  PENDING: "PENDING",
  BLOCKED: "BLOCKED",
} as const;

export const statusesArr = Object.values(statusConst);

export const historyTraceActionConst = {
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  DELETED: "DELETED",
} as const;

export const historyTraceActionsArr = Object.values(historyTraceActionConst);

export const historyTraceEntityConst = {
  USER: "USER",
  SESSION: "SESSION",
} as const;

export const historyTraceEntitiesArr = Object.values(historyTraceEntityConst);

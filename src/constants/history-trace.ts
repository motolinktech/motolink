export const historyTraceActionConst = {
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  DELETED: "DELETED",
  COPIED: "COPIED",
} as const;

export const historyTraceActionsArr = Object.values(historyTraceActionConst);

export const historyTraceEntityConst = {
  USER: "USER",
  SESSION: "SESSION",
  REGION: "REGION",
  GROUP: "GROUP",
  DELIVERYMAN: "DELIVERYMAN",
  CLIENT: "CLIENT",
  PLANNING: "PLANNING",
  WORK_SHIFT_SLOT: "WORK_SHIFT_SLOT",
} as const;

export const historyTraceEntitiesArr = Object.values(historyTraceEntityConst);

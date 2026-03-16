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
  PAYMENT_REQUEST: "PAYMENT_REQUEST",
  DISCOUNT: "DISCOUNT",
  CLIENT_BLOCK: "CLIENT_BLOCK",
} as const;

export const historyTraceEntitiesArr = Object.values(historyTraceEntityConst);

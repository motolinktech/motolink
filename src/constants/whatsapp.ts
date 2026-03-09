export const whatsappMessageTypeConst = {
  WORK_SHIFT: "WORK_SHIFT",
  INTERNAL: "INTERNAL",
} as const;

export type WhatsappMessageType = (typeof whatsappMessageTypeConst)[keyof typeof whatsappMessageTypeConst];

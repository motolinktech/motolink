export const whatsappMessageTypeConst = {
  WORK_SHIFT: "WORK_SHIFT",
  FORGOT_PASSWORD: "FORGOT_PASSWORD",
  INTERNAL: "INTERNAL",
} as const;

export type WhatsappMessageType = (typeof whatsappMessageTypeConst)[keyof typeof whatsappMessageTypeConst];

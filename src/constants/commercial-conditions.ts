export const PAYMENT_TYPES = [
  { value: "DAILY", label: "Diária" },
  { value: "GUARANTEED", label: "Qt. Garantida" },
] as const;

export const PERIOD_TYPES = [
  { value: "WEEK_DAY", label: "Semanal (Dia)" },
  { value: "WEEK_NIGHT", label: "Semanal (Noite)" },
  { value: "WEEKEND_DAY", label: "Fim de Semana (Dia)" },
  { value: "WEEKEND_NIGHT", label: "Fim de Semana (Noite)" },
] as const;

export const COMMERCIAL_CONDITION_LABELS: Record<string, string> = {
  DAILY: "Diário",
  GUARANTEED: "Qt Garantida",
};

export type PaymentType = (typeof PAYMENT_TYPES)[number]["value"];
export type PeriodType = (typeof PERIOD_TYPES)[number]["value"];

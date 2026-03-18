export const planningPeriodConst = {
  DAYTIME: "DAYTIME",
  NIGHTTIME: "NIGHTTIME",
} as const;

export type PlanningPeriod = (typeof planningPeriodConst)[keyof typeof planningPeriodConst];

export const PlanningPeriodOptions = [
  { label: "Diurno", value: planningPeriodConst.DAYTIME },
  { label: "Noturno", value: planningPeriodConst.NIGHTTIME },
] as const;

export const PLANNING_PERIOD_LABELS: Record<PlanningPeriod, string> = {
  [planningPeriodConst.DAYTIME]: "Diurno",
  [planningPeriodConst.NIGHTTIME]: "Noturno",
};

export function normalizePlanningPeriod(period: string): PlanningPeriod | null {
  switch (period) {
    case planningPeriodConst.DAYTIME:
    case "diurno":
    case "daytime":
      return planningPeriodConst.DAYTIME;
    case planningPeriodConst.NIGHTTIME:
    case "noturno":
    case "nighttime":
      return planningPeriodConst.NIGHTTIME;
    default:
      return null;
  }
}

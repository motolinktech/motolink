import { normalizePlanningPeriod, planningPeriodConst } from "@/constants/planning-period";

const STATUS_SORT_ORDER: Record<string, number> = {
  OPEN: 0,
  INVITED: 1,
  CONFIRMED: 2,
  CHECKED_IN: 3,
  PENDING_COMPLETION: 4,
  COMPLETED: 5,
  ABSENT: 6,
  UNANSWERED: 7,
  REJECTED: 8,
  CANCELLED: 9,
};

const PERIOD_SORT_ORDER = {
  DAYTIME: 0,
  MIXED: 1,
  NIGHTTIME: 2,
  UNKNOWN: 3,
} as const;

interface SortableMonitoringWorkShift {
  id: string;
  status: string;
  period: string[];
  startTime: string | Date;
  endTime: string | Date;
  deliveryman?: { name?: string | null } | null;
}

const SUMMARY_COUNTABLE_STATUSES = new Set(["INVITED", "CONFIRMED", "CHECKED_IN", "PENDING_COMPLETION", "COMPLETED"]);

function getTimeSortValue(value: string | Date): number {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return timestamp;
}

function getMonitoringPeriodSortValue(periods: string[]): number {
  const normalizedPeriods = new Set(periods.map((period) => normalizePlanningPeriod(period)).filter(Boolean));

  if (normalizedPeriods.has(planningPeriodConst.DAYTIME) && normalizedPeriods.has(planningPeriodConst.NIGHTTIME)) {
    return PERIOD_SORT_ORDER.MIXED;
  }

  if (normalizedPeriods.has(planningPeriodConst.DAYTIME)) {
    return PERIOD_SORT_ORDER.DAYTIME;
  }

  if (normalizedPeriods.has(planningPeriodConst.NIGHTTIME)) {
    return PERIOD_SORT_ORDER.NIGHTTIME;
  }

  return PERIOD_SORT_ORDER.UNKNOWN;
}

export function compareMonitoringWorkShifts(a: SortableMonitoringWorkShift, b: SortableMonitoringWorkShift): number {
  const statusOrderA = STATUS_SORT_ORDER[a.status] ?? Number.MAX_SAFE_INTEGER;
  const statusOrderB = STATUS_SORT_ORDER[b.status] ?? Number.MAX_SAFE_INTEGER;
  if (statusOrderA !== statusOrderB) {
    return statusOrderA - statusOrderB;
  }

  const periodOrderA = getMonitoringPeriodSortValue(a.period);
  const periodOrderB = getMonitoringPeriodSortValue(b.period);
  if (periodOrderA !== periodOrderB) {
    return periodOrderA - periodOrderB;
  }

  const startTimeOrderA = getTimeSortValue(a.startTime);
  const startTimeOrderB = getTimeSortValue(b.startTime);
  if (startTimeOrderA !== startTimeOrderB) {
    return startTimeOrderA - startTimeOrderB;
  }

  const endTimeOrderA = getTimeSortValue(a.endTime);
  const endTimeOrderB = getTimeSortValue(b.endTime);
  if (endTimeOrderA !== endTimeOrderB) {
    return endTimeOrderA - endTimeOrderB;
  }

  const deliverymanNameA = a.deliveryman?.name?.trim() ?? "";
  const deliverymanNameB = b.deliveryman?.name?.trim() ?? "";
  const deliverymanComparison = deliverymanNameA.localeCompare(deliverymanNameB, "pt-BR", { sensitivity: "base" });
  if (deliverymanComparison !== 0) {
    return deliverymanComparison;
  }

  return a.id.localeCompare(b.id, "pt-BR", { sensitivity: "base" });
}

export function countsForMonitoringSummary(slot: Pick<SortableMonitoringWorkShift, "status" | "deliveryman">): boolean {
  if (slot.status === "OPEN") {
    return Boolean(slot.deliveryman);
  }

  return SUMMARY_COUNTABLE_STATUSES.has(slot.status);
}

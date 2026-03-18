import { dbTimeToTimeString } from "@/utils/date-time";

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
  const time = dbTimeToTimeString(value);
  if (!time) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hours * 60 + minutes;
}

export function compareMonitoringWorkShifts(a: SortableMonitoringWorkShift, b: SortableMonitoringWorkShift): number {
  const startTimeOrderA = getTimeSortValue(a.startTime);
  const startTimeOrderB = getTimeSortValue(b.startTime);
  if (startTimeOrderA === startTimeOrderB) {
    return 0;
  }

  return startTimeOrderA - startTimeOrderB;
}

export function countsForMonitoringSummary(slot: Pick<SortableMonitoringWorkShift, "status" | "deliveryman">): boolean {
  if (slot.status === "OPEN") {
    return Boolean(slot.deliveryman);
  }

  return SUMMARY_COUNTABLE_STATUSES.has(slot.status);
}

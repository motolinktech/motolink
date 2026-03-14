import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { Planning } from "../../../generated/prisma/client";

dayjs.extend(utc);

export function planningTransformer(data: Planning) {
  return {
    ...data,
    plannedDate: dayjs.utc(data.plannedDate).format("YYYY-MM-DD"),
  };
}

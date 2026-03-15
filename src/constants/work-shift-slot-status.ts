import {
  CheckCircleIcon,
  CheckIcon,
  CircleDotIcon,
  ClockIcon,
  LogInIcon,
  MessageCircleOffIcon,
  SendIcon,
  UserXIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";

export const workShiftSlotStatusConst = {
  OPEN: "OPEN",
  INVITED: "INVITED",
  CONFIRMED: "CONFIRMED",
  CHECKED_IN: "CHECKED_IN",
  PENDING_COMPLETION: "PENDING_COMPLETION",
  COMPLETED: "COMPLETED",
  ABSENT: "ABSENT",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
  UNANSWERED: "UNANSWERED",
} as const;

export type WorkShiftSlotStatus = (typeof workShiftSlotStatusConst)[keyof typeof workShiftSlotStatusConst];

export const workShiftSlotStatusTransitions: Record<WorkShiftSlotStatus, WorkShiftSlotStatus[]> = {
  OPEN: ["INVITED", "CANCELLED"],
  INVITED: ["CONFIRMED", "REJECTED", "CANCELLED", "UNANSWERED"],
  CONFIRMED: ["CHECKED_IN", "ABSENT", "CANCELLED"],
  CHECKED_IN: ["PENDING_COMPLETION", "ABSENT"],
  PENDING_COMPLETION: ["COMPLETED"],
  REJECTED: ["OPEN"],
  COMPLETED: [],
  ABSENT: [],
  CANCELLED: [],
  UNANSWERED: [],
};

export const WORK_SHIFT_SLOT_STATUS_LABELS: Record<WorkShiftSlotStatus, string> = {
  OPEN: "Aberto",
  INVITED: "Convidado",
  CONFIRMED: "Confirmado",
  CHECKED_IN: "Em turno",
  PENDING_COMPLETION: "Aguardando conclusão",
  COMPLETED: "Concluído",
  ABSENT: "Ausente",
  CANCELLED: "Cancelado",
  REJECTED: "Rejeitado",
  UNANSWERED: "Sem resposta",
};

export const WORK_SHIFT_SLOT_STATUS_COLORS: Record<WorkShiftSlotStatus, string> = {
  OPEN: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  INVITED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CHECKED_IN: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  PENDING_COMPLETION: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  COMPLETED: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  ABSENT: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  CANCELLED: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  UNANSWERED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export const WORK_SHIFT_SLOT_STATUS_ICONS: Record<WorkShiftSlotStatus, typeof CheckIcon> = {
  OPEN: CircleDotIcon,
  INVITED: SendIcon,
  CONFIRMED: CheckIcon,
  CHECKED_IN: LogInIcon,
  PENDING_COMPLETION: ClockIcon,
  COMPLETED: CheckCircleIcon,
  ABSENT: UserXIcon,
  CANCELLED: XCircleIcon,
  REJECTED: XIcon,
  UNANSWERED: MessageCircleOffIcon,
};

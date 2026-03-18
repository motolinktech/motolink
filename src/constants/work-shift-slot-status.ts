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
  REJECTED: [],
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

export const WORK_SHIFT_SLOT_PRIMARY_ACTION_LABELS: Partial<Record<WorkShiftSlotStatus, string>> = {
  OPEN: "Marcar como convidado",
  INVITED: "Marcar confirmação",
  CONFIRMED: "Check in",
  CHECKED_IN: "Check out",
  PENDING_COMPLETION: "Concluir turno",
};

export const WORK_SHIFT_SLOT_STATUS_COLORS: Record<WorkShiftSlotStatus, string> = {
  OPEN: "bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-200",
  INVITED: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  CONFIRMED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  CHECKED_IN: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-200",
  PENDING_COMPLETION: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  COMPLETED: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200",
  ABSENT: "bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200",
  CANCELLED: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200",
  UNANSWERED: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
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

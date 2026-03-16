import { BanIcon, CheckCircleIcon, CheckIcon, CircleDotIcon, PencilIcon, XCircleIcon } from "lucide-react";
import type { paymentRequestStatusConst } from "@/modules/payment-requests/payment-requests-types";

export type PaymentRequestStatus = (typeof paymentRequestStatusConst)[keyof typeof paymentRequestStatusConst];

export const paymentRequestStatusTransitions: Record<PaymentRequestStatus, PaymentRequestStatus[]> = {
  NEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["PAID", "CANCELLED"],
  EDITED: ["EDITION_APPROVED", "REJECTED", "CANCELLED"],
  EDITION_APPROVED: ["APPROVED", "REJECTED", "CANCELLED"],
  REJECTED: [],
  CANCELLED: [],
  PAID: [],
};

export const PAYMENT_REQUEST_STATUS_LABELS: Record<PaymentRequestStatus, string> = {
  NEW: "Novo",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CANCELLED: "Cancelado",
  PAID: "Pago",
  EDITED: "Editado",
  EDITION_APPROVED: "Edição Aprovada",
};

export const PAYMENT_REQUEST_STATUS_COLORS: Record<PaymentRequestStatus, string> = {
  NEW: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  EDITED: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  EDITION_APPROVED: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

export const PAYMENT_REQUEST_STATUS_ICONS: Record<PaymentRequestStatus, typeof CheckIcon> = {
  NEW: CircleDotIcon,
  APPROVED: CheckIcon,
  REJECTED: XCircleIcon,
  CANCELLED: BanIcon,
  PAID: CheckCircleIcon,
  EDITED: PencilIcon,
  EDITION_APPROVED: CheckCircleIcon,
};

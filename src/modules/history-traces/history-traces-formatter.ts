import dayjs from "dayjs";
import { PAYMENT_TYPE_LABELS } from "@/constants/commercial-conditions";
import { ContractTypeOptions } from "@/constants/contract-type";
import { PAYMENT_REQUEST_STATUS_LABELS } from "@/constants/payment-request-status";
import { PLANNING_PERIOD_LABELS } from "@/constants/planning-period";
import { WORK_SHIFT_SLOT_STATUS_LABELS } from "@/constants/work-shift-slot-status";
import { formatMoneyDisplay } from "@/utils/masks/money-mask";

const EXCLUDED_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "deliverymanId",
  "clientId",
  "logs",
  "client",
  "deliveryman",
  "inviteToken",
  "inviteExpiresAt",
  "inviteSentAt",
  "trackingConnected",
  "trackingConnectedAt",
  "auditStatus",
]);

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  contractType: "Tipo de contrato",
  period: "Período",
  shiftDate: "Data",
  startTime: "Início",
  endTime: "Fim",
  checkInAt: "Check-in",
  checkOutAt: "Check-out",
  paymentForm: "Forma de pagamento",
  amount: "Valor",
  discount: "Desconto",
  discountReason: "Motivo do desconto",
  taxReason: "Motivo da taxa",
  additionalTax: "Taxa adicional",
  additionalTaxReason: "Motivo taxa adicional",
  totalValueToPay: "Total a pagar",
  deliverymanAmountDay: "Valor diurno",
  deliverymanAmountNight: "Valor noturno",
  deliverymanPaymentType: "Tipo de pagamento",
  deliverymenPaymentValue: "Valor pagamento",
  guaranteedQuantityDay: "Qt. garantida diurno",
  guaranteedQuantityNight: "Qt. garantida noturno",
  guaranteedDayTax: "Taxa garantida diurno",
  guaranteedNightTax: "Taxa garantida noturno",
  deliverymanPerDeliveryDay: "Valor por entrega diurno",
  deliverymanPerDeliveryNight: "Valor por entrega noturno",
  isWeekendRate: "Taxa fim de semana",
  absentReason: "Motivo da ausência",
};

const MONEY_FIELDS = new Set([
  "amount",
  "discount",
  "additionalTax",
  "totalValueToPay",
  "deliverymanAmountDay",
  "deliverymanAmountNight",
  "guaranteedDayTax",
  "guaranteedNightTax",
  "deliverymanPerDeliveryDay",
  "deliverymanPerDeliveryNight",
  "deliverymenPaymentValue",
]);

const TIME_FIELDS = new Set(["startTime", "endTime", "checkInAt", "checkOutAt"]);

const ENUM_FORMATTERS: Record<string, Record<string, string>> = {
  status: { ...WORK_SHIFT_SLOT_STATUS_LABELS, ...PAYMENT_REQUEST_STATUS_LABELS },
  period: PLANNING_PERIOD_LABELS,
  paymentForm: PAYMENT_TYPE_LABELS,
};

const CONTRACT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ContractTypeOptions.map((o) => [o.value, o.label]),
);

function formatValue(field: string, val: unknown): string {
  if (val === null || val === undefined) return "—";

  if (field === "isWeekendRate") return val ? "Sim" : "Não";

  if (field === "contractType") return CONTRACT_TYPE_LABELS[String(val)] ?? String(val);

  const enumMap = ENUM_FORMATTERS[field];
  if (enumMap) return enumMap[String(val)] ?? String(val);

  if (MONEY_FIELDS.has(field)) return formatMoneyDisplay(val as string | number);

  if (field === "shiftDate") {
    const parsed = dayjs(String(val));
    return parsed.isValid() ? parsed.format("DD/MM/YYYY") : String(val);
  }

  if (TIME_FIELDS.has(field)) {
    const parsed = dayjs(String(val));
    return parsed.isValid() ? parsed.format("HH:mm") : String(val);
  }

  if (typeof val === "boolean") return val ? "Sim" : "Não";

  return String(val);
}

export function formatTraceChanges(
  action: string,
  changes: Record<string, { old: unknown; new: unknown }> | null,
): Array<{ field: string; old: string; new: string }> | null {
  if (action === "CREATED") return null;
  if (!changes) return [];

  const result: Array<{ field: string; old: string; new: string }> = [];

  for (const [field, diff] of Object.entries(changes)) {
    if (EXCLUDED_FIELDS.has(field)) continue;

    const label = FIELD_LABELS[field] ?? field;
    result.push({
      field: label,
      old: formatValue(field, diff.old),
      new: formatValue(field, diff.new),
    });
  }

  return result;
}

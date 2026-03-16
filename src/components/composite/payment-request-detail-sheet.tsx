"use client";

import dayjs from "dayjs";
import { useEffect, useState } from "react";

import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
  PAYMENT_REQUEST_STATUS_COLORS,
  PAYMENT_REQUEST_STATUS_LABELS,
  type PaymentRequestStatus,
} from "@/constants/payment-request-status";
import { cn } from "@/lib/cn";
import { formatTraceChanges } from "@/modules/history-traces/history-traces-formatter";
import { formatMoneyDisplay } from "@/utils/masks/money-mask";

interface PaymentRequestDetail {
  id: string;
  amount: number;
  discount: number;
  discountReason?: string | null;
  additionalTax: number;
  taxReason?: string | null;
  status: string;
  deliveryman?: { id: string; name: string } | null;
  workShiftSlot?: { id: string; shiftDate: string | Date } | null;
}

interface HistoryTrace {
  id: string;
  createdAt: string;
  action: string;
  user: { name?: string } | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Criado",
  UPDATED: "Atualizado",
  DELETED: "Excluído",
};

interface PaymentRequestDetailSheetProps {
  item: PaymentRequestDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentRequestDetailSheet({ item, open, onOpenChange }: PaymentRequestDetailSheetProps) {
  const [traces, setTraces] = useState<HistoryTrace[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setTracesLoading(true);
    fetch(`/api/history-traces?entityType=PAYMENT_REQUEST&entityId=${item.id}&pageSize=50`)
      .then((res) => res.json())
      .then((json) => setTraces(json.data ?? []))
      .catch(() => setTraces([]))
      .finally(() => setTracesLoading(false));
  }, [open, item?.id, item]);

  if (!item) return null;

  const status = item.status as PaymentRequestStatus;
  const statusLabel = PAYMENT_REQUEST_STATUS_LABELS[status] ?? item.status;
  const statusColor = PAYMENT_REQUEST_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
  const netTotal = item.amount - item.discount + item.additionalTax;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Detalhes da solicitação</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 px-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{item.deliveryman?.name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">
                {item.workShiftSlot?.shiftDate ? dayjs(item.workShiftSlot.shiftDate).format("DD/MM/YYYY") : "—"}
              </p>
            </div>
            <span
              className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusColor)}
            >
              {statusLabel}
            </span>
          </div>

          {/* Financial breakdown */}
          <Separator />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Detalhamento financeiro
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valor base</span>
                <span className="font-medium tabular-nums">{formatMoneyDisplay(item.amount)}</span>
              </div>
              {item.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="font-medium tabular-nums text-destructive">
                    - {formatMoneyDisplay(item.discount)}
                  </span>
                </div>
              )}
              {item.discountReason && <p className="pl-0 text-xs text-muted-foreground/70">{item.discountReason}</p>}
              {item.additionalTax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Taxa adicional</span>
                  <span className="font-medium tabular-nums">+ {formatMoneyDisplay(item.additionalTax)}</span>
                </div>
              )}
              {item.taxReason && <p className="pl-0 text-xs text-muted-foreground/70">{item.taxReason}</p>}
              <div className="border-t my-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Total líquido</span>
                <span className="font-bold text-primary tabular-nums">{formatMoneyDisplay(netTotal)}</span>
              </div>
            </div>
          </div>

          {/* History traces */}
          <Separator />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Histórico</p>
            {tracesLoading ? (
              <div className="flex justify-center py-4">
                <Spinner className="size-4" />
              </div>
            ) : traces.length > 0 ? (
              <div className="relative space-y-3 pl-4">
                <div className="absolute top-1 bottom-1 left-[5px] w-px bg-border" />
                {traces.map((trace) => {
                  const formattedChanges = formatTraceChanges(trace.action, trace.changes);
                  const userName = trace.user?.name;
                  return (
                    <div key={trace.id} className="relative">
                      <div className="absolute -left-4 top-1.5 size-2 rounded-full bg-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">{dayjs(trace.createdAt).format("DD/MM HH:mm")}</p>
                      <p className="text-sm">
                        <span className="font-medium">{ACTION_LABELS[trace.action] ?? trace.action}</span>
                        {userName && <span className="text-muted-foreground"> por {userName}</span>}
                      </p>
                      {formattedChanges && formattedChanges.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {formattedChanges.map((change) => (
                            <p key={change.field} className="text-xs text-muted-foreground">
                              <span className="font-medium">{change.field}:</span> {change.old} → {change.new}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import dayjs from "dayjs";
import { BanIcon, ClockIcon, MessageCircleOffIcon, PencilIcon, Trash2Icon, UserXIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WorkShiftSlotForm } from "@/components/forms/work-shift-slot-form";
import { WorkShiftSlotTimesForm } from "@/components/forms/work-shift-slot-times-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { ContractTypeOptions } from "@/constants/contract-type";
import { PLANNING_PERIOD_LABELS, type PlanningPeriod } from "@/constants/planning-period";
import {
  WORK_SHIFT_SLOT_STATUS_COLORS,
  WORK_SHIFT_SLOT_STATUS_ICONS,
  WORK_SHIFT_SLOT_STATUS_LABELS,
  type WorkShiftSlotStatus,
  workShiftSlotStatusTransitions,
} from "@/constants/work-shift-slot-status";
import { cn } from "@/lib/cn";
import { formatTraceChanges } from "@/modules/history-traces/history-traces-formatter";
import { updateWorkShiftSlotStatusAction } from "@/modules/work-shift-slots/work-shift-slots-actions";
import { formatMoneyDisplay } from "@/utils/masks/money-mask";

export interface DetailSheetSlot {
  id: string;
  status: string;
  contractType: string;
  period: string[];
  startTime: string;
  endTime: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  deliverymenPaymentValue: string;
  totalValueToPay?: number | string;
  deliveryman?: { id: string; name: string } | null;
  deliverymanAmountDay?: number | string;
  deliverymanAmountNight?: number | string;
  deliverymanPaymentType?: string;
  paymentForm?: string;
  guaranteedQuantityDay?: number;
  guaranteedQuantityNight?: number;
  guaranteedDayTax?: number | string;
  guaranteedNightTax?: number | string;
  deliverymanPerDeliveryDay?: number | string;
  deliverymanPerDeliveryNight?: number | string;
  additionalTax?: number | string;
  additionalTaxReason?: string;
  isWeekendRate?: boolean;
}

type FormClient = Parameters<typeof WorkShiftSlotForm>[0]["client"];

interface MonitoringWorkShiftDetailSheetProps {
  slot: DetailSheetSlot;
  client: FormClient;
  shiftDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
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
  COPIED: "Copiado",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(val: string | null | undefined): string {
  if (!val) return "--:--";
  return dayjs(val).format("HH:mm");
}

function isNonZero(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const num = typeof val === "string" ? Number.parseFloat(val) : val;
  return typeof num === "number" && !Number.isNaN(num) && num !== 0;
}

export function MonitoringWorkShiftDetailSheet({
  slot,
  client,
  shiftDate,
  open,
  onOpenChange,
  onRefresh,
}: MonitoringWorkShiftDetailSheetProps) {
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editTimesSheetOpen, setEditTimesSheetOpen] = useState(false);
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  const [unansweredDialogOpen, setUnansweredDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [traces, setTraces] = useState<HistoryTrace[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);
  const { executeAsync, isExecuting } = useAction(updateWorkShiftSlotStatusAction);

  useEffect(() => {
    if (!open) return;
    setTracesLoading(true);
    fetch(`/api/history-traces?entityType=WORK_SHIFT_SLOT&entityId=${slot.id}&pageSize=50`)
      .then((res) => res.json())
      .then((json) => setTraces(json.data ?? []))
      .catch(() => setTraces([]))
      .finally(() => setTracesLoading(false));
  }, [open, slot.id]);

  const terminalStatuses: WorkShiftSlotStatus[] = ["ABSENT", "CANCELLED", "REJECTED", "UNANSWERED", "COMPLETED"];
  const status = slot.status as WorkShiftSlotStatus;
  const isTerminal = terminalStatuses.includes(status);
  const statusLabel = WORK_SHIFT_SLOT_STATUS_LABELS[status] ?? slot.status;
  const statusColor = WORK_SHIFT_SLOT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
  const contractLabel = ContractTypeOptions.find((o) => o.value === slot.contractType)?.label ?? slot.contractType;
  const nextTransitions = workShiftSlotStatusTransitions[status] ?? [];
  const primaryTransition = nextTransitions[0] as WorkShiftSlotStatus | undefined;
  const periodLabels = slot.period
    .map((p) => PLANNING_PERIOD_LABELS[p.toUpperCase() as PlanningPeriod])
    .filter(Boolean)
    .join(", ");
  const initials = slot.deliveryman ? getInitials(slot.deliveryman.name) : "??";
  const isDaily = slot.paymentForm === "DAILY";
  const isGuaranteed = slot.paymentForm === "GUARANTEED";

  const handleAdvanceStatus = async () => {
    if (!primaryTransition) return;
    const result = await executeAsync({ id: slot.id, status: primaryTransition });
    if (result?.data?.error) {
      toast.error(result.data.error);
    } else {
      toast.success(`Status atualizado para ${WORK_SHIFT_SLOT_STATUS_LABELS[primaryTransition]}`);
      onRefresh?.();
    }
  };

  const handleMarkAbsent = async () => {
    const result = await executeAsync({ id: slot.id, status: "ABSENT" });
    if (result?.data?.error) {
      toast.error(result.data.error);
    } else {
      toast.success(`Status atualizado para ${WORK_SHIFT_SLOT_STATUS_LABELS.ABSENT}`);
      onRefresh?.();
    }
  };

  const handleMarkUnanswered = async () => {
    const result = await executeAsync({ id: slot.id, status: "UNANSWERED" });
    if (result?.data?.error) {
      toast.error(result.data.error);
    } else {
      toast.success(`Status atualizado para ${WORK_SHIFT_SLOT_STATUS_LABELS.UNANSWERED}`);
      onRefresh?.();
    }
  };

  const handleCancelShift = async () => {
    const result = await executeAsync({ id: slot.id, status: "CANCELLED" });
    if (result?.data?.error) {
      toast.error(result.data.error);
    } else {
      toast.success(`Status atualizado para ${WORK_SHIFT_SLOT_STATUS_LABELS.CANCELLED}`);
      onRefresh?.();
    }
  };

  type FormulaRow = {
    label: string;
    detail?: string;
    value: string;
    isAddition?: boolean;
  };

  const formulaRows: FormulaRow[] = [];

  if (isDaily) {
    if (isNonZero(slot.deliverymanAmountDay)) {
      formulaRows.push({ label: "Diurno", value: formatMoneyDisplay(slot.deliverymanAmountDay) });
    }
    if (isNonZero(slot.deliverymanAmountNight)) {
      formulaRows.push({ label: "Noturno", value: formatMoneyDisplay(slot.deliverymanAmountNight) });
    }
  }

  if (isGuaranteed) {
    if (
      isNonZero(slot.deliverymanPerDeliveryDay) &&
      slot.guaranteedQuantityDay != null &&
      slot.guaranteedQuantityDay > 0
    ) {
      formulaRows.push({
        label: "Diurno",
        detail: `${slot.guaranteedQuantityDay} × ${formatMoneyDisplay(slot.deliverymanPerDeliveryDay)}`,
        value: formatMoneyDisplay(slot.guaranteedQuantityDay * Number(slot.deliverymanPerDeliveryDay)),
      });
    }
    if (
      isNonZero(slot.deliverymanPerDeliveryNight) &&
      slot.guaranteedQuantityNight != null &&
      slot.guaranteedQuantityNight > 0
    ) {
      formulaRows.push({
        label: "Noturno",
        detail: `${slot.guaranteedQuantityNight} × ${formatMoneyDisplay(slot.deliverymanPerDeliveryNight)}`,
        value: formatMoneyDisplay(slot.guaranteedQuantityNight * Number(slot.deliverymanPerDeliveryNight)),
      });
    }
  }

  if (isNonZero(slot.additionalTax)) {
    formulaRows.push({
      label: "Taxa adicional",
      value: formatMoneyDisplay(slot.additionalTax),
      isAddition: true,
    });
  }

  const paymentFormLabel = isDaily ? "Diária" : isGuaranteed ? "Qt. Garantida" : (slot.paymentForm ?? "—");
  const hasPaymentSection = formulaRows.length > 0 || isNonZero(slot.totalValueToPay);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex flex-col overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detalhes do turno</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-5 px-4">
            {/* Deliveryman section */}
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarFallback className={cn("text-xs", statusColor)}>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{slot.deliveryman?.name ?? "Sem entregador"}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {contractLabel}
                  </Badge>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      statusColor,
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Time section */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Período</p>
                <p className="text-sm font-medium">{periodLabels}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Forma de pagamento</p>
                <p className="text-sm font-medium">{paymentFormLabel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horário planejado</p>
                <p className="text-sm font-medium">
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horário real</p>
                <p className="text-sm font-medium">
                  {formatTime(slot.checkInAt)} - {formatTime(slot.checkOutAt)}
                </p>
              </div>
            </div>

            {/* Payment breakdown */}
            {hasPaymentSection && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pagamento</p>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{paymentFormLabel}</Badge>
                    {slot.isWeekendRate && <Badge variant="secondary">Fim de semana</Badge>}
                  </div>
                  <div className="space-y-1.5">
                    {formulaRows.map((row) => (
                      <div key={row.label + (row.detail ?? "")} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-3 shrink-0 text-muted-foreground">{row.isAddition ? "+" : ""}</span>
                          <div className="min-w-0">
                            <span className="text-muted-foreground">{row.label}</span>
                            {row.detail && <span className="ml-2 text-xs text-muted-foreground/70">{row.detail}</span>}
                          </div>
                        </div>
                        <span className="shrink-0 font-medium tabular-nums">{row.value}</span>
                      </div>
                    ))}
                    {isNonZero(slot.totalValueToPay) && (
                      <>
                        <div className="border-t my-2" />
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 shrink-0" />
                            <span className="font-semibold">Total</span>
                          </div>
                          <span className="shrink-0 font-bold text-primary tabular-nums">
                            {formatMoneyDisplay(slot.totalValueToPay)}
                          </span>
                        </div>
                      </>
                    )}
                    {slot.additionalTaxReason && (
                      <p className="mt-2 text-xs text-muted-foreground/70 pl-[18px]">{slot.additionalTaxReason}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* History traces section */}
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
                    const userName = (trace.user as { name?: string } | null)?.name;
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

          {/* Action footer */}
          <SheetFooter className="border-t px-4 py-3">
            <div className="flex w-full flex-col gap-2">
              {primaryTransition && (
                <Button size="sm" onClick={handleAdvanceStatus} disabled={isExecuting} className="w-full">
                  {isExecuting ? (
                    <Spinner className="mr-1 size-3" />
                  ) : (
                    (() => {
                      const TransitionIcon = WORK_SHIFT_SLOT_STATUS_ICONS[primaryTransition];
                      return <TransitionIcon className="mr-1 size-3.5" />;
                    })()
                  )}
                  {WORK_SHIFT_SLOT_STATUS_LABELS[primaryTransition]}
                </Button>
              )}
              {!isTerminal && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setEditSheetOpen(true)}>
                  <PencilIcon className="mr-1 size-3.5" />
                  Editar
                </Button>
              )}
              {!isTerminal && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setEditTimesSheetOpen(true)}>
                  <ClockIcon className="mr-1 size-3.5" />
                  Editar horários
                </Button>
              )}
              {nextTransitions.includes("UNANSWERED" as WorkShiftSlotStatus) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-gray-600"
                  onClick={() => setUnansweredDialogOpen(true)}
                >
                  <MessageCircleOffIcon className="mr-1 size-3.5" />
                  Sem resposta
                </Button>
              )}
              {nextTransitions.includes("ABSENT" as WorkShiftSlotStatus) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-orange-600"
                  onClick={() => setAbsentDialogOpen(true)}
                >
                  <UserXIcon className="mr-1 size-3.5" />
                  Marcar ausência
                </Button>
              )}
              {(status === "OPEN" || status === "INVITED") && (
                <Button variant="destructive" size="sm" className="w-full" onClick={() => setCancelDialogOpen(true)}>
                  <Trash2Icon className="mr-1 size-3.5" />
                  Excluir turno
                </Button>
              )}
              <Button variant="destructive" size="sm" className="w-full">
                <BanIcon className="mr-1 size-3.5" />
                Banir entregador
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit shift Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-[30vw]">
          <SheetHeader>
            <SheetTitle>Editar turno</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <WorkShiftSlotForm
              client={client}
              shiftDate={shiftDate}
              isEditing
              defaultValues={{
                id: slot.id,
                status: slot.status,
                deliverymanId: slot.deliveryman?.id,
                deliverymanName: slot.deliveryman?.name,
                contractType: slot.contractType,
                period: slot.period,
                startTime: slot.startTime,
                endTime: slot.endTime,
                deliverymenPaymentValue: slot.deliverymenPaymentValue,
              }}
              onSuccess={() => {
                setEditSheetOpen(false);
                onRefresh?.();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit times Sheet */}
      <Sheet open={editTimesSheetOpen} onOpenChange={setEditTimesSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar horários</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <WorkShiftSlotTimesForm
              slotId={slot.id}
              checkInAt={slot.checkInAt}
              checkOutAt={slot.checkOutAt}
              onSuccess={() => {
                setEditTimesSheetOpen(false);
                onRefresh?.();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Absent confirmation dialog */}
      <AlertDialog open={absentDialogOpen} onOpenChange={setAbsentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar ausência</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar este entregador como ausente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleMarkAbsent}>
              Confirmar ausência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unanswered confirmation dialog */}
      <AlertDialog open={unansweredDialogOpen} onOpenChange={setUnansweredDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar sem resposta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar este entregador como sem resposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleMarkUnanswered}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel shift confirmation dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar turno</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este turno? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleCancelShift}>
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

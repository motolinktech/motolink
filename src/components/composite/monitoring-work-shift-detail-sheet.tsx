"use client";

import dayjs from "dayjs";
import {
  BanIcon,
  ClockIcon,
  MessageCircleOffIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserXIcon,
  XIcon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WorkShiftSlotForm } from "@/components/forms/work-shift-slot-form";
import { WorkShiftSlotTimesForm } from "@/components/forms/work-shift-slot-times-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
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
import { banDeliverymanAction } from "@/modules/client-blocks/client-blocks-actions";
import { formatTraceChanges } from "@/modules/history-traces/history-traces-formatter";
import {
  cancelDiscountAction,
  createDiscountAction,
  updateWorkShiftSlotStatusAction,
} from "@/modules/work-shift-slots/work-shift-slots-actions";
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
  absentReason?: string | null;
  isDeliverymanBannedForClient?: boolean;
  discounts?: {
    id: string;
    amount: number | string;
    reason: string;
    status: string;
    createdByName: string;
    createdAt: string;
  }[];
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
  const [banSheetOpen, setBanSheetOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  const [absentReason, setAbsentReason] = useState("");
  const [unansweredDialogOpen, setUnansweredDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [traces, setTraces] = useState<HistoryTrace[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [discountFormOpen, setDiscountFormOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const { executeAsync, isExecuting } = useAction(updateWorkShiftSlotStatusAction);
  const { executeAsync: executeBanDeliveryman, isExecuting: isBanningDeliveryman } = useAction(banDeliverymanAction);
  const { executeAsync: executeCreateDiscount, isExecuting: isCreatingDiscount } = useAction(createDiscountAction);
  const { executeAsync: executeCancelDiscount } = useAction(cancelDiscountAction);

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
  const isBannedAssigned = Boolean(slot.deliveryman && slot.isDeliverymanBannedForClient);
  const isCurrentShiftDate = shiftDate === dayjs().format("YYYY-MM-DD");
  const isBannedLocked = isBannedAssigned && !isCurrentShiftDate;

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
    const result = await executeAsync({ id: slot.id, status: "ABSENT", absentReason: absentReason.trim() });
    if (result?.data?.error) {
      toast.error(result.data.error);
    } else {
      toast.success(`Status atualizado para ${WORK_SHIFT_SLOT_STATUS_LABELS.ABSENT}`);
      setAbsentReason("");
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

  const handleBanDeliveryman = async () => {
    if (!slot.deliveryman) return;

    const reason = banReason.trim();
    if (!reason) {
      toast.error("Informe o motivo do banimento");
      return;
    }

    const result = await executeBanDeliveryman({
      deliverymanId: slot.deliveryman.id,
      clientId: client.id,
      reason,
    });

    if (result?.data?.error) {
      toast.error(result.data.error);
      return;
    }

    toast.success("Entregador banido com sucesso");
    setBanConfirmOpen(false);
    setBanSheetOpen(false);
    setBanReason("");
    onRefresh?.();
  };

  const handleCreateDiscount = async () => {
    const amount = Number.parseFloat(discountAmount);
    if (!amount || amount <= 0 || !discountReason.trim()) return;

    const result = await executeCreateDiscount({ workShiftSlotId: slot.id, amount, reason: discountReason.trim() });
    if (result?.data?.error) {
      toast.error(result.data.error);
    } else {
      toast.success("Desconto adicionado");
      setDiscountAmount("");
      setDiscountReason("");
      setDiscountFormOpen(false);
      onRefresh?.();
    }
  };

  const handleCancelDiscount = async (discountId: string) => {
    const result = await executeCancelDiscount({ id: discountId });
    if (result?.data?.error) {
      toast.error(result.data.error);
    } else {
      toast.success("Desconto cancelado");
      onRefresh?.();
    }
  };

  const discounts = slot.discounts ?? [];
  const activeDiscounts = discounts.filter((d) => d.status === "ACTIVE");
  const totalDiscounts = activeDiscounts.reduce((sum, d) => sum + Number(d.amount), 0);

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
            {isBannedAssigned && (
              <Alert variant="destructive">
                <BanIcon className="size-4" />
                <AlertTitle>Entregador banido para este cliente</AlertTitle>
                <AlertDescription>
                  {isBannedLocked
                    ? "Este turno permanece ativo para consulta, mas não pode mais ser editado enquanto esse banimento estiver ativo."
                    : "O entregador está banido para este cliente, mas o turno de hoje ainda pode ser ajustado manualmente."}
                </AlertDescription>
              </Alert>
            )}
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

            {slot.status === "ABSENT" && slot.absentReason && (
              <div>
                <p className="text-xs text-muted-foreground">Motivo da ausência</p>
                <p className="text-sm font-medium">{slot.absentReason}</p>
              </div>
            )}

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

            {/* Discounts section */}
            <Separator />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descontos</p>
                {!discountFormOpen && !isBannedLocked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setDiscountFormOpen(true)}
                  >
                    <PlusIcon className="mr-1 size-3" />
                    Adicionar
                  </Button>
                )}
              </div>

              {discountFormOpen && !isBannedLocked && (
                <div className="mb-3 space-y-2 rounded-md border p-3">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Valor (R$)"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                  />
                  <Input
                    placeholder="Motivo do desconto"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={handleCreateDiscount} disabled={isCreatingDiscount}>
                      {isCreatingDiscount ? <Spinner className="mr-1 size-3" /> : null}
                      Salvar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDiscountFormOpen(false);
                        setDiscountAmount("");
                        setDiscountReason("");
                      }}
                    >
                      <XIcon className="size-3" />
                    </Button>
                  </div>
                </div>
              )}

              {discounts.length > 0 ? (
                <div className="space-y-2">
                  {discounts.map((discount) => {
                    const isCancelled = discount.status === "CANCELLED";
                    return (
                      <div
                        key={discount.id}
                        className={cn(
                          "flex items-start justify-between rounded-md border p-2 text-sm",
                          isCancelled && "opacity-50",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-medium tabular-nums", isCancelled && "line-through")}>
                              {formatMoneyDisplay(discount.amount)}
                            </span>
                            {isCancelled && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Cancelado
                              </Badge>
                            )}
                          </div>
                          <p className={cn("text-xs text-muted-foreground", isCancelled && "line-through")}>
                            {discount.reason}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70">
                            {discount.createdByName} - {dayjs(discount.createdAt).format("DD/MM HH:mm")}
                          </p>
                        </div>
                        {!isCancelled && status !== "COMPLETED" && !isBannedLocked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleCancelDiscount(discount.id)}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {activeDiscounts.length > 0 && (
                    <div className="flex items-center justify-between pt-1 text-sm">
                      <span className="text-muted-foreground">Total descontos</span>
                      <span className="font-semibold tabular-nums text-destructive">
                        {formatMoneyDisplay(totalDiscounts)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum desconto registrado.</p>
              )}
            </div>

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
              {!isTerminal && !isBannedLocked && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setEditSheetOpen(true)}>
                  <PencilIcon className="mr-1 size-3.5" />
                  Editar
                </Button>
              )}
              {!isTerminal && !isBannedLocked && (
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
              {slot.deliveryman && !slot.isDeliverymanBannedForClient && (
                <Button variant="destructive" size="sm" className="w-full" onClick={() => setBanSheetOpen(true)}>
                  <BanIcon className="mr-1 size-3.5" />
                  Banir entregador
                </Button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={banSheetOpen}
        onOpenChange={(nextOpen) => {
          setBanSheetOpen(nextOpen);
          if (!nextOpen) {
            setBanConfirmOpen(false);
            setBanReason("");
          }
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Banir entregador</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">Confirme o motivo do banimento</p>
              <p className="mt-1 text-muted-foreground">
                {slot.deliveryman?.name} não poderá ser sugerido nem atribuído a novos turnos deste cliente.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Cliente</p>
              <p className="text-sm text-muted-foreground">{client.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Entregador</p>
              <p className="text-sm text-muted-foreground">{slot.deliveryman?.name ?? "—"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Motivo</p>
              <Textarea
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                placeholder="Descreva o motivo do banimento"
                rows={5}
              />
            </div>
            <Button
              variant="destructive"
              className="w-full"
              disabled={!banReason.trim()}
              onClick={() => setBanConfirmOpen(true)}
            >
              <BanIcon className="mr-1 size-4" />
              Banir entregador
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={banConfirmOpen} onOpenChange={setBanConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar banimento</AlertDialogTitle>
            <AlertDialogDescription>
              Este entregador deixará de aparecer nas sugestões e não poderá ser atribuído a novos turnos deste cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBanDeliveryman}
              disabled={isBanningDeliveryman || !banReason.trim()}
            >
              {isBanningDeliveryman ? <Spinner className="mr-1 size-3" /> : null}
              Confirmar banimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                paymentForm: slot.paymentForm,
                deliverymanPaymentType: slot.deliverymanPaymentType,
                additionalTax: Number(slot.additionalTax) || 0,
                additionalTaxReason: slot.additionalTaxReason,
                isWeekendRate: slot.isWeekendRate,
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
      <AlertDialog
        open={absentDialogOpen}
        onOpenChange={(next) => {
          setAbsentDialogOpen(next);
          if (!next) setAbsentReason("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar ausência</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar este entregador como ausente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 px-1">
            <p className="text-sm font-medium">Motivo da ausência *</p>
            <Textarea
              value={absentReason}
              onChange={(e) => setAbsentReason(e.target.value)}
              placeholder="Descreva o motivo da ausência"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleMarkAbsent}
              disabled={!absentReason.trim() || isExecuting}
            >
              {isExecuting ? <Spinner className="mr-1 size-3" /> : null}
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

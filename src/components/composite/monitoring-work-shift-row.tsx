"use client";

import {
  BanIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  MoonIcon,
  PencilIcon,
  SatelliteDishIcon,
  SendIcon,
  SunIcon,
  TagIcon,
  Trash2Icon,
  UserXIcon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { EndShiftDialog, getEndShiftOptions } from "@/components/composite/end-shift-dialog";
import { WorkShiftSlotDiscountForm } from "@/components/forms/work-shift-slot-discount-form";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ContractTypeOptions } from "@/constants/contract-type";
import { PLANNING_PERIOD_LABELS, type PlanningPeriod, planningPeriodConst } from "@/constants/planning-period";
import {
  WORK_SHIFT_SLOT_PRIMARY_ACTION_LABELS,
  WORK_SHIFT_SLOT_STATUS_COLORS,
  WORK_SHIFT_SLOT_STATUS_ICONS,
  WORK_SHIFT_SLOT_STATUS_LABELS,
  type WorkShiftSlotStatus,
  workShiftSlotStatusTransitions,
} from "@/constants/work-shift-slot-status";
import { cn } from "@/lib/cn";
import { banDeliverymanAction } from "@/modules/client-blocks/client-blocks-actions";
import {
  sendInviteAction,
  toggleTrackingConnectedAction,
  updateWorkShiftSlotStatusAction,
} from "@/modules/work-shift-slots/work-shift-slots-actions";
import { getCurrentDateKeyInSaoPaulo } from "@/utils/date-time";
import { formatWorkShiftCheckTime } from "@/utils/format-work-shift-check-time";
import { formatMoneyDisplay } from "@/utils/masks/money-mask";
import { MonitoringWorkShiftDetailSheet } from "./monitoring-work-shift-detail-sheet";

type FormClient = Parameters<typeof WorkShiftSlotForm>[0]["client"];

interface WorkShiftSlot {
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
  deliveryman?: { id: string; name: string; phone?: string } | null;
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
  absentReason?: string | null;
  isWeekendRate?: boolean;
  isDeliverymanBannedForClient?: boolean;
  trackingConnected?: boolean;
}

interface MonitoringWorkShiftRowProps {
  slot: WorkShiftSlot;
  client: FormClient;
  shiftDate: string;
  onRefresh?: () => void;
}

type PendingAction =
  | "advance-status"
  | "mark-absent"
  | "end-shift"
  | "send-invite"
  | "toggle-tracking"
  | "ban-deliveryman";

const WORK_SHIFT_SLOT_ROW_BORDER_COLORS: Record<WorkShiftSlotStatus, string> = {
  OPEN: "border-l-slate-300",
  INVITED: "border-l-sky-400",
  CONFIRMED: "border-l-emerald-400",
  CHECKED_IN: "border-l-cyan-400",
  PENDING_COMPLETION: "border-l-amber-400",
  COMPLETED: "border-l-purple-400",
  ABSENT: "border-l-orange-400",
  CANCELLED: "border-l-zinc-400",
  REJECTED: "border-l-red-400",
  UNANSWERED: "border-l-rose-400",
  DELETED: "border-l-zinc-300",
};

export function MonitoringWorkShiftRow({ slot, client, shiftDate, onRefresh }: MonitoringWorkShiftRowProps) {
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editTimesSheetOpen, setEditTimesSheetOpen] = useState(false);
  const [addDiscountSheetOpen, setAddDiscountSheetOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [banSheetOpen, setBanSheetOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  const [absentReason, setAbsentReason] = useState("");
  const [endShiftDialogOpen, setEndShiftDialogOpen] = useState(false);
  const [inviteConfirmOpen, setInviteConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const mutationLockRef = useRef(false);
  const { executeAsync } = useAction(updateWorkShiftSlotStatusAction);
  const { executeAsync: executeBanDeliveryman } = useAction(banDeliverymanAction);
  const { executeAsync: executeSendInvite } = useAction(sendInviteAction);
  const { executeAsync: executeToggleTracking } = useAction(toggleTrackingConnectedAction);

  const status = slot.status as WorkShiftSlotStatus;
  const statusLabel = WORK_SHIFT_SLOT_STATUS_LABELS[status] ?? slot.status;
  const statusColor = WORK_SHIFT_SLOT_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-800";
  const contractLabel = ContractTypeOptions.find((o) => o.value === slot.contractType)?.label ?? slot.contractType;
  const nextTransitions = workShiftSlotStatusTransitions[status] ?? [];
  const endShiftOptions = getEndShiftOptions(status);
  const primaryTransition = nextTransitions[0] as WorkShiftSlotStatus | undefined;
  const primaryActionLabel = primaryTransition
    ? (WORK_SHIFT_SLOT_PRIMARY_ACTION_LABELS[status] ?? WORK_SHIFT_SLOT_STATUS_LABELS[primaryTransition])
    : undefined;

  const isPendingAction = (action: PendingAction) => pendingAction === action;
  const isMutating = pendingAction !== null;

  const runMutation = async <T,>(action: PendingAction, callback: () => Promise<T>) => {
    if (mutationLockRef.current) return undefined;

    mutationLockRef.current = true;
    setPendingAction(action);
    try {
      return await callback();
    } finally {
      mutationLockRef.current = false;
      setPendingAction(null);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!primaryTransition) return;
    const result = await runMutation("advance-status", () => executeAsync({ id: slot.id, status: primaryTransition }));
    if (!result) return;

    if (result?.data?.error) {
      toast.error(result.data.error);
    } else {
      toast.success(`Status atualizado para ${WORK_SHIFT_SLOT_STATUS_LABELS[primaryTransition]}`);
      onRefresh?.();
    }
  };

  const handleMarkAbsent = async () => {
    const result = await runMutation("mark-absent", () =>
      executeAsync({ id: slot.id, status: "ABSENT", absentReason: absentReason.trim() }),
    );
    if (!result) return;

    if (result?.data?.error) {
      toast.error(result.data.error);
    } else {
      toast.success(`Status atualizado para ${WORK_SHIFT_SLOT_STATUS_LABELS.ABSENT}`);
      setAbsentReason("");
      onRefresh?.();
    }
  };

  const handleEndShift = async (endStatus: string, cancelledReason?: string, shouldClone?: boolean) => {
    const result = await runMutation("end-shift", () =>
      executeAsync({ id: slot.id, status: endStatus, cancelledReason, shouldClone }),
    );
    if (!result) return;

    if (result?.data?.error) {
      toast.error(result.data.error);
    } else {
      toast.success(`Status atualizado para ${WORK_SHIFT_SLOT_STATUS_LABELS[endStatus as WorkShiftSlotStatus]}`);
      setEndShiftDialogOpen(false);
      onRefresh?.();
    }
  };

  const terminalStatuses: WorkShiftSlotStatus[] = [
    "ABSENT",
    "CANCELLED",
    "REJECTED",
    "UNANSWERED",
    "COMPLETED",
    "DELETED",
  ];
  const isTerminal = terminalStatuses.includes(status);
  const isAbsent = status === "ABSENT";
  const isUnanswered = status === "UNANSWERED";
  const isCancelled = status === "CANCELLED";
  const isOpenWithoutDeliveryman = status === "OPEN" && !slot.deliveryman;
  const isBannedAssigned = Boolean(slot.deliveryman && slot.isDeliverymanBannedForClient);
  const isCurrentShiftDate = shiftDate === getCurrentDateKeyInSaoPaulo();
  const isBannedLocked = isBannedAssigned && !isCurrentShiftDate;
  const canEditTimes = !isBannedLocked && (status === "COMPLETED" || !isTerminal);
  const dimmedInfoClassName = isCancelled ? "opacity-50" : undefined;
  const rowStatusColor = isOpenWithoutDeliveryman
    ? "bg-red-100 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900/70"
    : statusColor;

  const formatTime = (val: string | null | undefined) => formatWorkShiftCheckTime(val, "--:--");

  const formatCheckTime = (val: string | null | undefined) => formatWorkShiftCheckTime(val);

  const handleBanDeliveryman = async () => {
    const deliveryman = slot.deliveryman;
    if (!deliveryman) return;

    const reason = banReason.trim();
    if (!reason) {
      toast.error("Informe o motivo do banimento");
      return;
    }

    const result = await runMutation("ban-deliveryman", () =>
      executeBanDeliveryman({
        deliverymanId: deliveryman.id,
        clientId: client.id,
        reason,
      }),
    );
    if (!result) return;

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

  return (
    <>
      <div
        className={cn(
          "flex items-center rounded-md border-transparent border-l-4 px-4 py-3 transition-colors",
          isOpenWithoutDeliveryman
            ? "bg-gradient-to-r from-red-50 via-rose-50/80 to-white dark:from-red-950/40 dark:via-rose-950/20 dark:to-background"
            : "bg-muted/30",
          isOpenWithoutDeliveryman
            ? "border-l-red-500"
            : (WORK_SHIFT_SLOT_ROW_BORDER_COLORS[status] ?? "border-l-slate-300"),
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "min-w-80 lg:border-r lg:pr-4",
              dimmedInfoClassName,
              isOpenWithoutDeliveryman ? "lg:border-red-200/80 dark:lg:border-red-900/60" : "lg:border-gray-200",
            )}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "max-w-[12rem] truncate text-sm font-medium",
                    isOpenWithoutDeliveryman && "text-red-950 dark:text-red-100",
                  )}
                >
                  {slot.deliveryman?.name ?? "Sem entregador"}
                </p>
                {isBannedAssigned && (
                  <span
                    title={
                      isBannedLocked
                        ? "Entregador banido para este cliente. Este turno não pode ser editado."
                        : "Entregador banido para este cliente. O turno de hoje ainda pode ser editado manualmente."
                    }
                  >
                    <BanIcon
                      className="size-3.5 shrink-0 text-destructive"
                      aria-label="Entregador banido para este cliente"
                    />
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "max-w-[12rem] truncate text-xs text-muted-foreground",
                  isOpenWithoutDeliveryman && "text-red-700/80 dark:text-red-200/80",
                )}
              >
                {contractLabel}
              </p>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 text-xs text-muted-foreground",
                isOpenWithoutDeliveryman && "text-red-700/80 dark:text-red-200/80",
              )}
            >
              <span className="inline-flex items-center gap-1">
                {slot.period.some((p) => p.toUpperCase() === planningPeriodConst.DAYTIME) && (
                  <SunIcon className="size-3" />
                )}
                {slot.period.some((p) => p.toUpperCase() === planningPeriodConst.NIGHTTIME) && (
                  <MoonIcon className="size-3" />
                )}
                {slot.period.length > 1
                  ? "Diurno + Noturno"
                  : (PLANNING_PERIOD_LABELS[slot.period[0]?.toUpperCase() as PlanningPeriod] ?? slot.period[0])}
              </span>
              {slot.totalValueToPay != null && Number(slot.totalValueToPay) > 0 && (
                <span>{formatMoneyDisplay(slot.totalValueToPay)}</span>
              )}
            </div>
          </div>

          <div
            className={cn(
              "shrink-0 text-center text-xs",
              (isAbsent || isUnanswered) && "opacity-50",
              dimmedInfoClassName,
              isOpenWithoutDeliveryman && "text-red-900 dark:text-red-100",
            )}
          >
            <p
              className={cn(
                "text-muted-foreground",
                isOpenWithoutDeliveryman && "text-red-700/80 dark:text-red-200/80",
              )}
            >
              Planejado
            </p>
            <p className="font-medium">
              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
            </p>
          </div>

          <div
            className={cn(
              "shrink-0 text-center text-xs",
              (isAbsent || isUnanswered) && "opacity-50",
              dimmedInfoClassName,
              isOpenWithoutDeliveryman && "text-red-900 dark:text-red-100",
            )}
          >
            <p
              className={cn(
                "text-muted-foreground",
                isOpenWithoutDeliveryman && "text-red-700/80 dark:text-red-200/80",
              )}
            >
              Check-in/check-out
            </p>
            <p className="font-medium">
              {isAbsent || isUnanswered || isCancelled
                ? "--:-- - --:--"
                : `${formatCheckTime(slot.checkInAt)} - ${formatCheckTime(slot.checkOutAt)}`}
            </p>
          </div>

          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2 py-1 text-sm font-medium",
              rowStatusColor,
            )}
          >
            {statusLabel}
          </span>
        </div>

        <TooltipProvider>
          <div className="ml-auto flex shrink-0 items-center gap-1 pl-6">
            {isOpenWithoutDeliveryman ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 bg-white/85 text-red-700 shadow-sm hover:bg-red-100 hover:text-red-800 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-100 dark:hover:bg-red-950/40"
                    onClick={() => setEditSheetOpen(true)}
                  >
                    <SendIcon className="mr-1 size-3.5" />
                    Selecionar entregador
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Selecionar entregador</TooltipContent>
              </Tooltip>
            ) : (
              primaryTransition &&
              primaryActionLabel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleAdvanceStatus} disabled={isMutating}>
                      {isPendingAction("advance-status") ? (
                        <Spinner className="mr-1 size-3" />
                      ) : (
                        (() => {
                          const TransitionIcon = WORK_SHIFT_SLOT_STATUS_ICONS[primaryTransition];
                          return <TransitionIcon className="mr-1 size-3.5" />;
                        })()
                      )}
                      {primaryActionLabel}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{primaryActionLabel}</TooltipContent>
                </Tooltip>
              )
            )}

            {status === "CHECKED_IN" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={isMutating}
                    onClick={async () => {
                      const result = await runMutation("toggle-tracking", () => executeToggleTracking({ id: slot.id }));
                      if (!result) return;

                      if (result?.data?.error) {
                        toast.error(result.data.error);
                      } else {
                        toast.success(slot.trackingConnected ? "Rastreamento desconectado" : "Rastreamento conectado");
                        onRefresh?.();
                      }
                    }}
                  >
                    {isPendingAction("toggle-tracking") ? (
                      <Spinner className="size-4" />
                    ) : (
                      <SatelliteDishIcon
                        className={cn("size-4", slot.trackingConnected ? "text-green-600" : "text-muted-foreground")}
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {slot.trackingConnected ? "Rastreamento conectado" : "Conectar rastreamento"}
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-8",
                    isOpenWithoutDeliveryman &&
                      "text-red-700 hover:bg-red-100/80 hover:text-red-800 dark:text-red-200 dark:hover:bg-red-950/40",
                  )}
                  onClick={() => setDetailSheetOpen(true)}
                >
                  <EyeIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Detalhes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-8",
                    isOpenWithoutDeliveryman &&
                      "text-red-700 hover:bg-red-100/80 hover:text-red-800 dark:text-red-200 dark:hover:bg-red-950/40",
                  )}
                  onClick={() => setInviteConfirmOpen(true)}
                  disabled={!slot.deliveryman || isTerminal || isMutating}
                >
                  <SendIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enviar convite por WhatsApp</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-8",
                        isOpenWithoutDeliveryman &&
                          "text-red-700 hover:bg-red-100/80 hover:text-red-800 dark:text-red-200 dark:hover:bg-red-950/40",
                      )}
                    >
                      <EllipsisVerticalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Mais ações</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-52">
                {!isTerminal && !isBannedLocked && (
                  <DropdownMenuItem onClick={() => setEditSheetOpen(true)}>
                    <PencilIcon className="mr-2 size-4" />
                    Editar turno
                  </DropdownMenuItem>
                )}
                {canEditTimes && (
                  <DropdownMenuItem onClick={() => setEditTimesSheetOpen(true)}>
                    <ClockIcon className="mr-2 size-4" />
                    Editar horários
                  </DropdownMenuItem>
                )}
                {!isTerminal && !isBannedLocked && (
                  <DropdownMenuItem onClick={() => setAddDiscountSheetOpen(true)}>
                    <TagIcon className="mr-2 size-4" />
                    Adicionar desconto
                  </DropdownMenuItem>
                )}
                {nextTransitions.includes("ABSENT" as WorkShiftSlotStatus) && (
                  <DropdownMenuItem className="text-orange-600" onClick={() => setAbsentDialogOpen(true)}>
                    <UserXIcon className="mr-2 size-4" />
                    Marcar ausência
                  </DropdownMenuItem>
                )}
                {endShiftOptions.length > 0 && (
                  <DropdownMenuItem variant="destructive" onClick={() => setEndShiftDialogOpen(true)}>
                    <Trash2Icon className="mr-2 size-4" />
                    Cancelar turno
                  </DropdownMenuItem>
                )}
                {slot.deliveryman && !slot.isDeliverymanBannedForClient && (
                  <DropdownMenuItem variant="destructive" onClick={() => setBanSheetOpen(true)}>
                    <BanIcon className="mr-2 size-4" />
                    Banir entregador
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>
      </div>

      {/* Detail Sheet */}
      <MonitoringWorkShiftDetailSheet
        slot={slot}
        client={client}
        shiftDate={shiftDate}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onRefresh={onRefresh}
      />

      {/* Send invite confirmation dialog */}
      <AlertDialog open={inviteConfirmOpen} onOpenChange={setInviteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar convite por WhatsApp</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja enviar o convite via WhatsApp para {slot.deliveryman?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const result = await runMutation("send-invite", () => executeSendInvite({ workShiftSlotId: slot.id }));
                if (!result) return;

                if (result?.data?.error) {
                  toast.error(result.data.error);
                } else {
                  toast.success("Convite enviado com sucesso");
                  setInviteConfirmOpen(false);
                  onRefresh?.();
                }
              }}
              disabled={isMutating}
            >
              {isPendingAction("send-invite") ? <Spinner className="mr-1 size-3" /> : null}
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={banSheetOpen}
        onOpenChange={(open) => {
          setBanSheetOpen(open);
          if (!open) {
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
              disabled={!banReason.trim() || isMutating}
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
              disabled={isMutating || !banReason.trim()}
            >
              {isPendingAction("ban-deliveryman") ? <Spinner className="mr-1 size-3" /> : null}
              Confirmar banimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Absent confirmation dialog */}
      <AlertDialog
        open={absentDialogOpen}
        onOpenChange={(open) => {
          setAbsentDialogOpen(open);
          if (!open) setAbsentReason("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar ausência</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar este entregador como ausente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="absent-reason" className="text-sm font-medium">
              Motivo da ausência
            </label>
            <Textarea
              id="absent-reason"
              placeholder="Descreva o motivo da ausência..."
              value={absentReason}
              onChange={(e) => setAbsentReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleMarkAbsent}
              disabled={!absentReason.trim() || isMutating}
            >
              {isPendingAction("mark-absent") ? <Spinner className="mr-1 size-3" /> : null}
              Confirmar ausência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End shift dialog (cancel / unanswered / rejected / delete) */}
      <EndShiftDialog
        open={endShiftDialogOpen}
        onOpenChange={setEndShiftDialogOpen}
        currentStatus={status}
        isMutating={isMutating}
        isPending={isPendingAction("end-shift")}
        onConfirm={handleEndShift}
      />

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

      {/* Add discount Sheet */}
      <Sheet open={addDiscountSheetOpen} onOpenChange={setAddDiscountSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Adicionar desconto</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <WorkShiftSlotDiscountForm
              slotId={slot.id}
              onSuccess={() => {
                setAddDiscountSheetOpen(false);
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
    </>
  );
}

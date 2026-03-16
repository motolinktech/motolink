"use client";

import dayjs from "dayjs";
import {
  BanIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  MessageCircleOffIcon,
  MoonIcon,
  PencilIcon,
  SendIcon,
  SunIcon,
  TagIcon,
  Trash2Icon,
  UserXIcon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { type PlanningPeriod, planningPeriodConst } from "@/constants/planning-period";
import {
  WORK_SHIFT_SLOT_STATUS_COLORS,
  WORK_SHIFT_SLOT_STATUS_ICONS,
  WORK_SHIFT_SLOT_STATUS_LABELS,
  type WorkShiftSlotStatus,
  workShiftSlotStatusTransitions,
} from "@/constants/work-shift-slot-status";
import { cn } from "@/lib/cn";
import { banDeliverymanAction } from "@/modules/client-blocks/client-blocks-actions";
import { updateWorkShiftSlotStatusAction } from "@/modules/work-shift-slots/work-shift-slots-actions";
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
  absentReason?: string | null;
  isWeekendRate?: boolean;
  isDeliverymanBannedForClient?: boolean;
}

interface MonitoringWorkShiftRowProps {
  slot: WorkShiftSlot;
  periodLabel: string;
  period: PlanningPeriod;
  client: FormClient;
  shiftDate: string;
  onRefresh?: () => void;
}

export function MonitoringWorkShiftRow({
  slot,
  periodLabel,
  period,
  client,
  shiftDate,
  onRefresh,
}: MonitoringWorkShiftRowProps) {
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editTimesSheetOpen, setEditTimesSheetOpen] = useState(false);
  const [addDiscountSheetOpen, setAddDiscountSheetOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [banSheetOpen, setBanSheetOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  const [absentReason, setAbsentReason] = useState("");
  const [unansweredDialogOpen, setUnansweredDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const { executeAsync, isExecuting } = useAction(updateWorkShiftSlotStatusAction);
  const { executeAsync: executeBanDeliveryman, isExecuting: isBanningDeliveryman } = useAction(banDeliverymanAction);

  const status = slot.status as WorkShiftSlotStatus;
  const statusLabel = WORK_SHIFT_SLOT_STATUS_LABELS[status] ?? slot.status;
  const statusColor = WORK_SHIFT_SLOT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
  const contractLabel = ContractTypeOptions.find((o) => o.value === slot.contractType)?.label ?? slot.contractType;
  const nextTransitions = workShiftSlotStatusTransitions[status] ?? [];
  const primaryTransition = nextTransitions[0] as WorkShiftSlotStatus | undefined;

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

  const terminalStatuses: WorkShiftSlotStatus[] = ["ABSENT", "CANCELLED", "REJECTED", "UNANSWERED", "COMPLETED"];
  const isTerminal = terminalStatuses.includes(status);
  const isAbsent = status === "ABSENT";
  const isUnanswered = status === "UNANSWERED";
  const isCancelled = status === "CANCELLED";
  const isOpenWithoutDeliveryman = status === "OPEN" && !slot.deliveryman;
  const isBannedAssigned = Boolean(slot.deliveryman && slot.isDeliverymanBannedForClient);
  const isCurrentShiftDate = shiftDate === dayjs().format("YYYY-MM-DD");
  const isBannedLocked = isBannedAssigned && !isCurrentShiftDate;

  const formatTime = (val: string | null | undefined) => {
    if (!val) return "";
    return dayjs(val).format("HH:mm");
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

  return (
    <>
      <div
        className={cn(
          "flex items-center rounded-md border-l-4 bg-muted/30 px-4 py-3",
          isAbsent
            ? "border-l-orange-400"
            : isUnanswered || isCancelled
              ? "border-l-gray-400"
              : status === "OPEN" && !slot.deliveryman
                ? "border-l-yellow-400"
                : "border-l-primary",
        )}
      >
        <div className="flex items-center gap-4">
          <div className="min-w-80 lg:border-r lg:border-gray-200 lg:pr-4">
            <div className="flex items-center gap-2">
              <p className="max-w-[12rem] truncate text-sm font-medium">{slot.deliveryman?.name ?? "Sem entregador"}</p>
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {period === planningPeriodConst.DAYTIME ? (
                  <SunIcon className="size-3" />
                ) : (
                  <MoonIcon className="size-3" />
                )}
                {periodLabel}
              </span>
              {slot.totalValueToPay != null && Number(slot.totalValueToPay) > 0 && (
                <span>{formatMoneyDisplay(slot.totalValueToPay)}</span>
              )}
              <Badge variant="outline" className="shrink-0">
                {contractLabel}
              </Badge>
            </div>
          </div>

          <div
            className={cn("shrink-0 text-center text-xs", (isAbsent || isUnanswered || isCancelled) && "opacity-50")}
          >
            <p className="text-muted-foreground">Planejado</p>
            <p className="font-medium">
              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
            </p>
          </div>

          <div
            className={cn("shrink-0 text-center text-xs", (isAbsent || isUnanswered || isCancelled) && "opacity-50")}
          >
            <p className="text-muted-foreground">Real</p>
            <p className="font-medium">
              {isAbsent || isUnanswered || isCancelled
                ? "--:-- - --:--"
                : `${formatTime(slot.checkInAt)} - ${formatTime(slot.checkOutAt)}`}
            </p>
          </div>

          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
              statusColor,
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
                  <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)}>
                    <SendIcon className="mr-1 size-3.5" />
                    Convidar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Selecionar entregador</TooltipContent>
              </Tooltip>
            ) : (
              primaryTransition && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleAdvanceStatus} disabled={isExecuting}>
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
                  </TooltipTrigger>
                  <TooltipContent>Avançar status</TooltipContent>
                </Tooltip>
              )
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setDetailSheetOpen(true)}>
                  <EyeIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Detalhes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setDialogType("invite")}>
                  <SendIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enviar convite</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
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
                {!isTerminal && !isBannedLocked && (
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
                {nextTransitions.includes("UNANSWERED" as WorkShiftSlotStatus) && (
                  <DropdownMenuItem className="text-gray-600" onClick={() => setUnansweredDialogOpen(true)}>
                    <MessageCircleOffIcon className="mr-2 size-4" />
                    Sem resposta
                  </DropdownMenuItem>
                )}
                {nextTransitions.includes("ABSENT" as WorkShiftSlotStatus) && (
                  <DropdownMenuItem className="text-orange-600" onClick={() => setAbsentDialogOpen(true)}>
                    <UserXIcon className="mr-2 size-4" />
                    Marcar ausência
                  </DropdownMenuItem>
                )}
                {(status === "OPEN" || status === "INVITED") && (
                  <DropdownMenuItem variant="destructive" onClick={() => setCancelDialogOpen(true)}>
                    <Trash2Icon className="mr-2 size-4" />
                    Excluir turno
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

      {/* Other dialogs (placeholders for non-edit-shift features) */}
      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogType === "invite" && "Enviar convite"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Funcionalidade em desenvolvimento.</p>
        </DialogContent>
      </Dialog>

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
              disabled={!absentReason.trim() || isExecuting}
            >
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

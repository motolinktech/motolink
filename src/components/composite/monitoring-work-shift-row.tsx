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
  Trash2Icon,
  UserXIcon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
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
  isWeekendRate?: boolean;
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
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  const [unansweredDialogOpen, setUnansweredDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const { executeAsync, isExecuting } = useAction(updateWorkShiftSlotStatusAction);

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

  const terminalStatuses: WorkShiftSlotStatus[] = ["ABSENT", "CANCELLED", "REJECTED", "UNANSWERED", "COMPLETED"];
  const isTerminal = terminalStatuses.includes(status);
  const isAbsent = status === "ABSENT";
  const isUnanswered = status === "UNANSWERED";
  const isCancelled = status === "CANCELLED";

  const formatTime = (val: string | null | undefined) => {
    if (!val) return "";
    return dayjs(val).format("HH:mm");
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center rounded-md border-l-4 bg-muted/30 px-4 py-3",
          isAbsent ? "border-l-orange-400" : isUnanswered || isCancelled ? "border-l-gray-400" : "border-l-primary",
        )}
      >
        <div className="flex items-center gap-4">
          <div className="min-w-80 lg:border-r lg:border-gray-200 lg:pr-4">
            <div className="flex items-center gap-2">
              <p className="max-w-[12rem] truncate text-sm font-medium">{slot.deliveryman?.name ?? "Sem entregador"}</p>
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
            {primaryTransition && (
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
                {!isTerminal && (
                  <DropdownMenuItem onClick={() => setEditSheetOpen(true)}>
                    <PencilIcon className="mr-2 size-4" />
                    Editar turno
                  </DropdownMenuItem>
                )}
                {!isTerminal && (
                  <DropdownMenuItem onClick={() => setEditTimesSheetOpen(true)}>
                    <ClockIcon className="mr-2 size-4" />
                    Editar horários
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
                <DropdownMenuItem variant="destructive" onClick={() => setDialogType("ban")}>
                  <BanIcon className="mr-2 size-4" />
                  Banir entregador
                </DropdownMenuItem>
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
            <DialogTitle>
              {dialogType === "invite" && "Enviar convite"}
              {dialogType === "ban" && "Banir entregador"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Funcionalidade em desenvolvimento.</p>
        </DialogContent>
      </Dialog>

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
    </>
  );
}

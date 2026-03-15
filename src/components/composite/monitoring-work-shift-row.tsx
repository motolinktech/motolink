"use client";

import dayjs from "dayjs";
import {
  BanIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  MoonIcon,
  PencilIcon,
  SendIcon,
  StickyNoteIcon,
  SunIcon,
  Trash2Icon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { WorkShiftDetailSheet } from "@/components/composite/work-shift-detail-sheet";
import { WorkShiftSlotForm } from "@/components/forms/work-shift-slot-form";
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
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
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

  const formatTime = (val: string | null | undefined) => {
    if (!val) return "";
    return dayjs(val).format("HH:mm");
  };

  return (
    <>
      <div className="flex items-center rounded-md border-l-4 border-l-primary bg-muted/30 px-4 py-3">
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

          <div className="shrink-0 text-center text-xs">
            <p className="text-muted-foreground">Planejado</p>
            <p className="font-medium">
              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
            </p>
          </div>

          <div className="shrink-0 text-center text-xs">
            <p className="text-muted-foreground">Real</p>
            <p className="font-medium">
              {formatTime(slot.checkInAt)} - {formatTime(slot.checkOutAt)}
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
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setDetailsSheetOpen(true)}>
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
                <DropdownMenuItem onClick={() => setDialogType("annotation")}>
                  <StickyNoteIcon className="mr-2 size-4" />
                  Adicionar anotação
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditSheetOpen(true)}>
                  <PencilIcon className="mr-2 size-4" />
                  Editar turno
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialogType("edit-times")}>
                  <ClockIcon className="mr-2 size-4" />
                  Editar horários
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setDialogType("delete-shift")}>
                  <Trash2Icon className="mr-2 size-4" />
                  Excluir turno
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setDialogType("ban")}>
                  <BanIcon className="mr-2 size-4" />
                  Banir entregador
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>
      </div>

      {/* Details sheet */}
      <WorkShiftDetailSheet
        open={detailsSheetOpen}
        onClose={() => setDetailsSheetOpen(false)}
        slot={slot}
        date={shiftDate}
        clientName={client.name}
        onEdit={() => {
          setDetailsSheetOpen(false);
          setEditSheetOpen(true);
        }}
      />

      {/* Other dialogs (placeholders for non-edit-shift features) */}
      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "invite" && "Enviar convite"}
              {dialogType === "annotation" && "Adicionar anotação"}
              {dialogType === "edit-times" && "Editar horários"}
              {dialogType === "delete-shift" && "Excluir turno"}
              {dialogType === "ban" && "Banir entregador"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Funcionalidade em desenvolvimento.</p>
        </DialogContent>
      </Dialog>

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
    </>
  );
}

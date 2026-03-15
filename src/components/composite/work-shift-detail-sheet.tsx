"use client";

import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import {
  BanknoteIcon,
  BuildingIcon,
  CalendarIcon,
  ClockIcon,
  LogInIcon,
  LogOutIcon,
  MoonIcon,
  PencilIcon,
  SunIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ContractTypeOptions } from "@/constants/contract-type";
import { PLANNING_PERIOD_LABELS, type PlanningPeriod } from "@/constants/planning-period";
import {
  WORK_SHIFT_SLOT_STATUS_COLORS,
  WORK_SHIFT_SLOT_STATUS_ICONS,
  WORK_SHIFT_SLOT_STATUS_LABELS,
  type WorkShiftSlotStatus,
} from "@/constants/work-shift-slot-status";
import { cn } from "@/lib/cn";
import { formatMoneyDisplay } from "@/utils/masks/money-mask";

dayjs.locale("pt-br");

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

interface WorkShiftDetailSheetProps {
  open: boolean;
  onClose: () => void;
  slot: WorkShiftSlot;
  date: string;
  clientName?: string;
  onEdit?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(val: string | null | undefined): string {
  if (!val) return "";
  return dayjs(val).format("HH:mm");
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
        <Icon className={cn("size-4", muted ? "text-muted-foreground/50" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-medium", muted && "text-muted-foreground/60")}>{value}</p>
      </div>
    </div>
  );
}

export function WorkShiftDetailSheet({ open, onClose, slot, date, clientName, onEdit }: WorkShiftDetailSheetProps) {
  const status = slot.status as WorkShiftSlotStatus;
  const statusLabel = WORK_SHIFT_SLOT_STATUS_LABELS[status] ?? slot.status;
  const statusColor = WORK_SHIFT_SLOT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
  const StatusIcon = WORK_SHIFT_SLOT_STATUS_ICONS[status];
  const contractLabel = ContractTypeOptions.find((o) => o.value === slot.contractType)?.label ?? slot.contractType;

  const periodLabels = slot.period
    .map((p) => PLANNING_PERIOD_LABELS[p.toUpperCase() as PlanningPeriod])
    .filter(Boolean)
    .join(", ");

  const hasDaytime = slot.period.some((p) => p.toUpperCase() === "DAYTIME");
  const PeriodIcon = hasDaytime ? SunIcon : MoonIcon;

  const formattedDate = dayjs(date).format("dddd, DD [de] MMMM");
  const formattedDateCapitalized = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const plannedStart = formatTime(slot.startTime);
  const plannedEnd = formatTime(slot.endTime);
  const realCheckIn = formatTime(slot.checkInAt);
  const realCheckOut = formatTime(slot.checkOutAt);

  const hasPayment = slot.totalValueToPay != null && Number(slot.totalValueToPay) > 0;

  const deliverymanName = slot.deliveryman?.name ?? "Sem entregador";
  const initials = slot.deliveryman ? getInitials(slot.deliveryman.name) : "??";

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="flex flex-col overflow-hidden p-0 sm:max-w-[420px]">
        {/* Header */}
        <SheetHeader className="border-b p-6 pb-5">
          <div className="flex items-start gap-4">
            <Avatar className="size-14 shrink-0">
              <AvatarFallback className={cn("text-sm font-semibold", statusColor)}>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-1">
              <SheetTitle className="truncate text-base font-semibold">{deliverymanName}</SheetTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    statusColor,
                  )}
                >
                  {StatusIcon && <StatusIcon className="size-3" />}
                  {statusLabel}
                </span>
                <Badge variant="outline" className="text-xs font-normal">
                  {contractLabel}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{formattedDateCapitalized}</p>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Turno section */}
          <div className="space-y-3">
            <SectionLabel>Turno</SectionLabel>
            <div className="space-y-2.5">
              <InfoRow icon={PeriodIcon} label="Período" value={periodLabels} />
              <InfoRow icon={CalendarIcon} label="Data" value={formattedDateCapitalized} />
            </div>
          </div>

          <Separator />

          {/* Horários section */}
          <div className="space-y-3">
            <SectionLabel>Horários</SectionLabel>
            <div className="space-y-2.5">
              <InfoRow
                icon={ClockIcon}
                label="Planejado"
                value={plannedStart && plannedEnd ? `${plannedStart} → ${plannedEnd}` : "—"}
              />
              <InfoRow icon={LogInIcon} label="Entrada real" value={realCheckIn || "—"} muted={!realCheckIn} />
              <InfoRow icon={LogOutIcon} label="Saída real" value={realCheckOut || "—"} muted={!realCheckOut} />
            </div>
          </div>

          {/* Pagamento section */}
          {hasPayment && (
            <>
              <Separator />
              <div className="space-y-3">
                <SectionLabel>Pagamento</SectionLabel>
                <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/50">
                    <BanknoteIcon className="size-4 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">Valor a pagar</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                      {formatMoneyDisplay(slot.totalValueToPay)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Cliente section */}
          {clientName && (
            <>
              <Separator />
              <div className="space-y-3">
                <SectionLabel>Cliente</SectionLabel>
                <InfoRow icon={BuildingIcon} label="Estabelecimento" value={clientName} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {onEdit && (
          <SheetFooter className="border-t px-6 py-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onClose();
                onEdit();
              }}
            >
              <PencilIcon className="mr-2 size-4" />
              Editar turno
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

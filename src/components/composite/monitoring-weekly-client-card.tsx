"use client";

import dayjs from "dayjs";
import {
  BanknoteIcon,
  ClipboardPasteIcon,
  CloudRainIcon,
  CopyIcon,
  CreditCardIcon,
  MapPinIcon,
  MoonIcon,
  PackageIcon,
  PlusIcon,
  ShieldCheckIcon,
  SunIcon,
  TruckIcon,
  UserIcon,
  UtensilsIcon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { WorkShiftSlotForm } from "@/components/forms/work-shift-slot-form";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PAYMENT_TYPE_LABELS, PERIOD_TYPE_LABELS } from "@/constants/commercial-conditions";
import { PLANNING_PERIOD_LABELS, type PlanningPeriod, planningPeriodConst } from "@/constants/planning-period";
import {
  WORK_SHIFT_SLOT_STATUS_COLORS,
  WORK_SHIFT_SLOT_STATUS_LABELS,
  type WorkShiftSlotStatus,
} from "@/constants/work-shift-slot-status";
import { cn } from "@/lib/cn";
import { compareMonitoringWorkShifts, countsForMonitoringSummary } from "@/modules/monitoring/monitoring-sort";
import { copyWorkShiftSlotsAction } from "@/modules/work-shift-slots/work-shift-slots-actions";
import { formatMoneyDisplay } from "@/utils/masks/money-mask";
import { Text } from "../ui/text";
import { MonitoringWorkShiftDetailSheet } from "./monitoring-work-shift-detail-sheet";

interface CommercialCondition {
  bagsStatus?: string;
  bagsAllocated?: number;
  paymentForm?: string[];
  dailyPeriods?: string[];
  guaranteedPeriods?: string[];
  deliveryAreaKm?: number;
  isMotolinkCovered?: boolean;
  rainTax?: number | string;
  guaranteedDay?: number;
  guaranteedDayWeekend?: number;
  guaranteedNight?: number;
  guaranteedNightWeekend?: number;
  guaranteedDayTax?: number | string;
  guaranteedNightTax?: number | string;
  guaranteedDayWeekendTax?: number | string;
  guaranteedNightWeekendTax?: number | string;
  clientDailyDay?: number | string;
  clientDailyDayWknd?: number | string;
  clientDailyNight?: number | string;
  clientDailyNightWknd?: number | string;
  clientPerDelivery?: number | string;
  clientAdditionalKm?: number | string;
  deliverymanDailyDay?: number | string;
  deliverymanDailyDayWknd?: number | string;
  deliverymanDailyNight?: number | string;
  deliverymanDailyNightWknd?: number | string;
  deliverymanPerDelivery?: number | string;
  deliverymanAdditionalKm?: number | string;
}

interface WorkShiftSlot {
  id: string;
  clientId: string;
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
}

interface PlanningRecord {
  clientId: string;
  period: string;
  plannedCount: number;
}

interface ClientData {
  id: string;
  name: string;
  street: string;
  number: string;
  complement?: string | null;
  city: string;
  neighborhood: string;
  uf: string;
  provideMeal: boolean;
  commercialCondition?: CommercialCondition | null;
  days: Record<string, { planned: PlanningRecord[]; workShifts: WorkShiftSlot[] }>;
}

interface MonitoringWeeklyClientCardProps {
  client: ClientData;
  weekDays: string[];
  dayLabels: string[];
  onRefresh?: () => void;
  copySource?: { clientId: string; date: string } | null;
  onCopy?: (date: string) => void;
  onCancelCopy?: () => void;
}

function isNonEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") return val !== "" && val !== "0" && val !== "0.00";
  if (Array.isArray(val)) return val.length > 0;
  return Boolean(val);
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

export function MonitoringWeeklyClientCard({
  client,
  weekDays,
  dayLabels,
  onRefresh,
  copySource,
  onCopy,
  onCancelCopy,
}: MonitoringWeeklyClientCardProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ slot: WorkShiftSlot; date: string } | null>(null);
  const [addSheet, setAddSheet] = useState<{ date: string; period?: string } | null>(null);
  const [editSheet, setEditSheet] = useState<{ slot: WorkShiftSlot; date: string } | null>(null);
  const [confirmPasteDate, setConfirmPasteDate] = useState<string | null>(null);

  const { executeAsync: executeCopy, isExecuting: isCopying } = useAction(copyWorkShiftSlotsAction);

  const cc = client.commercialCondition;
  const today = dayjs().format("YYYY-MM-DD");

  const handlePaste = async (targetDate: string) => {
    if (!copySource) return;
    const result = await executeCopy({
      sourceDate: new Date(copySource.date),
      targetDate: new Date(targetDate),
      clientId: client.id,
    });
    if (result?.data?.error) {
      toast.error(result.data.error);
    } else {
      const degradedCount = result?.data?.degradedCount ?? 0;
      if (degradedCount > 0) {
        toast.warning(
          `Turnos copiados. ${degradedCount} turno(s) copiado(s) como aberto(s) devido a conflitos de horário.`,
        );
      } else {
        toast.success("Turnos copiados com sucesso");
      }
      onCancelCopy?.();
      onRefresh?.();
    }
  };

  const handlePasteClick = (targetDate: string, hasShifts: boolean) => {
    if (hasShifts) {
      setConfirmPasteDate(targetDate);
    } else {
      handlePaste(targetDate);
    }
  };

  const addressParts = [client.street, client.number].filter(Boolean).join(", ");
  const addressSuffix = [client.complement, client.neighborhood, `${client.city}/${client.uf}`]
    .filter(Boolean)
    .join(" - ");
  const address = [addressParts, addressSuffix].filter(Boolean).join(" - ");

  const conditions: Array<{ icon: React.ComponentType<{ className?: string }>; label: string }> = [];
  if (client.provideMeal) conditions.push({ icon: UtensilsIcon, label: "Fornece refeição" });
  if (cc) {
    if (isNonEmpty(cc.bagsAllocated))
      conditions.push({ icon: PackageIcon, label: `Bags: ${cc.bagsAllocated} (${cc.bagsStatus})` });
    if (isNonEmpty(cc.deliveryAreaKm))
      conditions.push({ icon: MapPinIcon, label: `Área de entrega: ${cc.deliveryAreaKm} km` });
    if (cc.isMotolinkCovered) conditions.push({ icon: ShieldCheckIcon, label: "Cobertura Motolink" });
    if (isNonEmpty(cc.rainTax))
      conditions.push({ icon: CloudRainIcon, label: `Taxa chuva: ${formatMoneyDisplay(cc.rainTax)}` });
    if (isNonEmpty(cc.paymentForm))
      conditions.push({
        icon: CreditCardIcon,
        label: `Pagamento: ${cc.paymentForm?.map((v) => PAYMENT_TYPE_LABELS[v] ?? v).join(", ")}`,
      });
    if (isNonEmpty(cc.dailyPeriods))
      conditions.push({
        icon: SunIcon,
        label: `Períodos diários: ${cc.dailyPeriods?.map((v) => PERIOD_TYPE_LABELS[v] ?? v).join(", ")}`,
      });
    if (isNonEmpty(cc.guaranteedPeriods))
      conditions.push({
        icon: MoonIcon,
        label: `Períodos garantidos: ${cc.guaranteedPeriods?.map((v) => PERIOD_TYPE_LABELS[v] ?? v).join(", ")}`,
      });
    if (isNonEmpty(cc.guaranteedDay) || isNonEmpty(cc.guaranteedNight))
      conditions.push({
        icon: BanknoteIcon,
        label: `Garantidos: Dia ${cc.guaranteedDay ?? 0} / Noite ${cc.guaranteedNight ?? 0}`,
      });
    if (isNonEmpty(cc.clientDailyDay) || isNonEmpty(cc.deliverymanDailyDay))
      conditions.push({
        icon: TruckIcon,
        label: `Diária: Cliente ${formatMoneyDisplay(cc.clientDailyDay)} / Entregador ${formatMoneyDisplay(cc.deliverymanDailyDay)}`,
      });
  }

  const periods: PlanningPeriod[] = [planningPeriodConst.DAYTIME, planningPeriodConst.NIGHTTIME];

  const handleSlotClick = (slot: WorkShiftSlot, date: string) => {
    setSelectedSlot({ slot, date });
  };

  const handlePlannedClick = (date: string, period: string) => {
    setAddSheet({ date, period });
  };

  const handleAddClick = (date: string) => {
    setAddSheet({ date });
  };

  const handleFormSuccess = () => {
    setAddSheet(null);
    setEditSheet(null);
    setSelectedSlot(null);
    onRefresh?.();
  };

  const formClient = {
    id: client.id,
    name: client.name,
    street: client.street,
    number: client.number,
    complement: client.complement,
    city: client.city,
    neighborhood: client.neighborhood,
    uf: client.uf,
    provideMeal: client.provideMeal,
    commercialCondition: client.commercialCondition,
  };

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>{client.name}</CardTitle>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{address}</p>
          </div>
          {conditions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {conditions.map((c) => (
                <Badge key={c.label} variant="secondary" className="gap-1 text-xs font-normal">
                  <c.icon className="size-3" />
                  {c.label}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <div className="grid min-w-[700px] grid-cols-7 gap-1">
                {weekDays.map((dateStr, i) => {
                  const isToday = dateStr === today;
                  const isPast = dateStr < today;
                  const dayData = client.days[dateStr] ?? { planned: [], workShifts: [] };
                  const isCopySource = copySource?.date === dateStr;
                  const isCopyTarget = copySource !== null && !isCopySource && !isPast;

                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        "relative rounded-lg border p-2",
                        isPast && "opacity-40",
                        isToday ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20" : "bg-muted/20",
                        isCopySource && "border-2 border-primary",
                        isCopyTarget && "border-2 border-dashed border-primary/50",
                      )}
                      {...(isCopyTarget && !isCopying
                        ? {
                            role: "button",
                            tabIndex: 0,
                            onClick: () => handlePasteClick(dateStr, dayData.workShifts.length > 0),
                            onKeyDown: (e: React.KeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handlePasteClick(dateStr, dayData.workShifts.length > 0);
                              }
                            },
                          }
                        : {})}
                    >
                      {!isPast && !copySource && dayData.workShifts.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onCopy?.(dateStr)}
                              className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-primary/10 hover:text-primary"
                            >
                              <CopyIcon className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Copiar turnos</TooltipContent>
                        </Tooltip>
                      )}

                      {isCopyTarget && (
                        <div className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <ClipboardPasteIcon className="size-3.5" />
                        </div>
                      )}

                      {(() => {
                        const totalPlanned = periods.reduce((sum, period) => {
                          const planning = dayData.planned.find((p) => p.period.toUpperCase() === period);
                          return sum + (planning?.plannedCount ?? 0);
                        }, 0);
                        const totalAssigned = dayData.workShifts.filter(countsForMonitoringSummary).length;

                        return (
                          <div className="mb-2 text-center">
                            <p className={cn("text-xs font-semibold", isToday && "text-primary")}>{dayLabels[i]}</p>
                            <p className="text-xs text-muted-foreground">{dayjs(dateStr).format("DD/MM")}</p>
                            {(totalPlanned > 0 || totalAssigned > 0) && (
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {totalAssigned}/{totalPlanned}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex flex-wrap items-center gap-1">
                        {(() => {
                          const renderedSlotIds = new Set<string>();
                          return periods.flatMap((period) => {
                            const planning = dayData.planned.find((p) => p.period.toUpperCase() === period);
                            const plannedCount = planning?.plannedCount ?? 0;
                            const periodSlots = dayData.workShifts
                              .filter((s) => s.period.some((p) => p.toUpperCase() === period))
                              .toSorted(compareMonitoringWorkShifts);
                            const vacantCount = Math.max(0, plannedCount - periodSlots.length);

                            const items: React.ReactNode[] = [];

                            for (const slot of periodSlots) {
                              if (renderedSlotIds.has(slot.id)) continue;
                              renderedSlotIds.add(slot.id);

                              const status = slot.status as WorkShiftSlotStatus;
                              const statusColor = WORK_SHIFT_SLOT_STATUS_COLORS[status] ?? "";
                              const statusLabel = WORK_SHIFT_SLOT_STATUS_LABELS[status] ?? slot.status;
                              const name = slot.deliveryman?.name ?? "Sem entregador";
                              const initials = slot.deliveryman ? getInitials(slot.deliveryman.name) : "??";
                              const slotPeriodLabels = slot.period
                                .map((p) => PLANNING_PERIOD_LABELS[p.toUpperCase() as PlanningPeriod])
                                .filter(Boolean)
                                .join(" / ");

                              items.push(
                                <Tooltip key={slot.id}>
                                  <TooltipTrigger asChild>
                                    <button type="button" onClick={() => handleSlotClick(slot, dateStr)}>
                                      <Avatar size="default">
                                        <AvatarFallback className={cn("text-[10px]", statusColor)}>
                                          {initials}
                                        </AvatarFallback>
                                      </Avatar>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <Text variant="small" className="text-center">
                                      <span>{name}</span>
                                      <br />
                                      <span className="text-muted">
                                        {slotPeriodLabels} - {statusLabel}
                                        <br />
                                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                      </span>
                                    </Text>
                                  </TooltipContent>
                                </Tooltip>,
                              );
                            }

                            for (let idx = 0; idx < vacantCount; idx++) {
                              items.push(
                                <Tooltip key={`vacant-${period}-${idx}`}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => handlePlannedClick(dateStr, period)}
                                      className="flex size-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 transition-colors hover:border-primary/60 hover:bg-primary/5"
                                    >
                                      <UserIcon className="size-4 text-muted-foreground/60" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Vaga aberta - {PLANNING_PERIOD_LABELS[period]}</TooltipContent>
                                </Tooltip>,
                              );
                            }

                            return items;
                          });
                        })()}

                        {!isPast && !copySource && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleAddClick(dateStr)}
                                className="flex size-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground/50 transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
                              >
                                <PlusIcon className="size-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Adicionar entregador</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {selectedSlot && (
        <MonitoringWorkShiftDetailSheet
          slot={selectedSlot.slot}
          client={formClient}
          shiftDate={selectedSlot.date}
          open
          onOpenChange={(open) => !open && setSelectedSlot(null)}
          onRefresh={onRefresh}
        />
      )}

      <Sheet open={addSheet !== null} onOpenChange={(open) => !open && setAddSheet(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-[30vw]">
          <SheetHeader>
            <SheetTitle>Adicionar entregador</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            {addSheet && (
              <WorkShiftSlotForm
                client={formClient}
                shiftDate={addSheet.date}
                defaultPeriod={addSheet.period}
                onSuccess={handleFormSuccess}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={editSheet !== null} onOpenChange={(open) => !open && setEditSheet(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-[30vw]">
          <SheetHeader>
            <SheetTitle>Editar turno</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            {editSheet && (
              <WorkShiftSlotForm
                client={formClient}
                shiftDate={editSheet.date}
                isEditing
                defaultValues={{
                  id: editSheet.slot.id,
                  status: editSheet.slot.status,
                  deliverymanId: editSheet.slot.deliveryman?.id,
                  deliverymanName: editSheet.slot.deliveryman?.name,
                  contractType: editSheet.slot.contractType,
                  period: editSheet.slot.period,
                  startTime: editSheet.slot.startTime,
                  endTime: editSheet.slot.endTime,
                  deliverymenPaymentValue: editSheet.slot.deliverymenPaymentValue,
                  paymentForm: editSheet.slot.paymentForm,
                  deliverymanPaymentType: editSheet.slot.deliverymanPaymentType,
                  additionalTax: Number(editSheet.slot.additionalTax) || 0,
                  additionalTaxReason: editSheet.slot.additionalTaxReason,
                  isWeekendRate: editSheet.slot.isWeekendRate,
                }}
                onSuccess={handleFormSuccess}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmPasteDate !== null} onOpenChange={(open) => !open && setConfirmPasteDate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Colar turnos</AlertDialogTitle>
            <AlertDialogDescription>
              Este dia já possui turnos. Deseja colar os turnos mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmPasteDate) handlePaste(confirmPasteDate);
                setConfirmPasteDate(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import dayjs from "dayjs";
import {
  BanknoteIcon,
  CloudRainIcon,
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
import { useState } from "react";
import { WorkShiftDetailSheet } from "@/components/composite/work-shift-detail-sheet";
import { WorkShiftSlotForm } from "@/components/forms/work-shift-slot-form";
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
import { formatMoneyDisplay } from "@/utils/masks/money-mask";

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
  deliveryman?: { id: string; name: string } | null;
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
}: MonitoringWeeklyClientCardProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ slot: WorkShiftSlot; date: string } | null>(null);
  const [addSheet, setAddSheet] = useState<{ date: string; period?: string } | null>(null);
  const [editSheet, setEditSheet] = useState<{ slot: WorkShiftSlot; date: string } | null>(null);

  const cc = client.commercialCondition;
  const today = dayjs().format("YYYY-MM-DD");

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

                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        "rounded-lg border p-2",
                        isPast && "opacity-40",
                        isToday ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20" : "bg-muted/20",
                      )}
                    >
                      {(() => {
                        const totalPlanned = periods.reduce((sum, period) => {
                          const planning = dayData.planned.find((p) => p.period.toUpperCase() === period);
                          return sum + (planning?.plannedCount ?? 0);
                        }, 0);
                        const totalAssigned = dayData.workShifts.length;

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
                        {periods.flatMap((period) => {
                          const planning = dayData.planned.find((p) => p.period.toUpperCase() === period);
                          const plannedCount = planning?.plannedCount ?? 0;
                          const periodSlots = dayData.workShifts.filter((s) =>
                            s.period.some((p) => p.toUpperCase() === period),
                          );
                          const vacantCount = Math.max(0, plannedCount - periodSlots.length);
                          const periodLabel = PLANNING_PERIOD_LABELS[period];

                          const items: React.ReactNode[] = [];

                          for (const slot of periodSlots) {
                            const status = slot.status as WorkShiftSlotStatus;
                            const statusColor = WORK_SHIFT_SLOT_STATUS_COLORS[status] ?? "";
                            const statusLabel = WORK_SHIFT_SLOT_STATUS_LABELS[status] ?? slot.status;
                            const name = slot.deliveryman?.name ?? "Sem entregador";
                            const initials = slot.deliveryman ? getInitials(slot.deliveryman.name) : "??";

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
                                  <p className="font-medium">{name}</p>
                                  <p className="text-xs">
                                    {periodLabel} - {statusLabel} - {formatTime(slot.startTime)} -{" "}
                                    {formatTime(slot.endTime)}
                                  </p>
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
                                <TooltipContent>Vaga aberta - {periodLabel}</TooltipContent>
                              </Tooltip>,
                            );
                          }

                          return items;
                        })}

                        {!isPast && (
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

      <WorkShiftDetailSheet
        open={selectedSlot !== null}
        onClose={() => setSelectedSlot(null)}
        slot={
          selectedSlot?.slot ?? {
            id: "",
            status: "",
            contractType: "",
            period: [],
            startTime: "",
            endTime: "",
            deliverymenPaymentValue: "",
          }
        }
        date={selectedSlot?.date ?? ""}
        clientName={client.name}
        onEdit={
          selectedSlot
            ? () => {
                setEditSheet({ slot: selectedSlot.slot, date: selectedSlot.date });
                setSelectedSlot(null);
              }
            : undefined
        }
      />

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
                }}
                onSuccess={handleFormSuccess}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

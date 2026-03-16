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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PAYMENT_TYPE_LABELS, PERIOD_TYPE_LABELS } from "@/constants/commercial-conditions";
import { PLANNING_PERIOD_LABELS, type PlanningPeriod, planningPeriodConst } from "@/constants/planning-period";
import { copyWorkShiftSlotsAction } from "@/modules/work-shift-slots/work-shift-slots-actions";
import { formatMoneyDisplay } from "@/utils/masks/money-mask";
import { MonitoringPlanningRow } from "./monitoring-planning-row";
import { MonitoringWorkShiftRow } from "./monitoring-work-shift-row";

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
  isDeliverymanBannedForClient?: boolean;
  logs?: Array<{ timestamp: string; description: string }>;
}

interface PlanningRecord {
  clientId: string;
  period: string;
  plannedCount: number;
}

interface MonitoringClientCardProps {
  client: ClientData;
  plannings: PlanningRecord[];
  workShiftSlots: WorkShiftSlot[];
  shiftDate: string;
  onRefresh?: () => void;
  copySourceDate?: string;
  isCopyTarget?: boolean;
  onCopy?: () => void;
  onCancelCopy?: () => void;
}

const STATUS_SORT_ORDER: Record<string, number> = {
  OPEN: 0,
  INVITED: 1,
  CONFIRMED: 2,
  CHECKED_IN: 3,
  PENDING_COMPLETION: 4,
  COMPLETED: 5,
  ABSENT: 6,
  UNANSWERED: 7,
  REJECTED: 8,
  CANCELLED: 9,
};

function isNonEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") return val !== "" && val !== "0" && val !== "0.00";
  if (Array.isArray(val)) return val.length > 0;
  return Boolean(val);
}

export function MonitoringClientCard({
  client,
  plannings,
  workShiftSlots,
  shiftDate,
  onRefresh,
  copySourceDate,
  isCopyTarget,
  onCopy,
  onCancelCopy,
}: MonitoringClientCardProps) {
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [confirmPasteOpen, setConfirmPasteOpen] = useState(false);

  const { executeAsync: executeCopy, isExecuting: isCopying } = useAction(copyWorkShiftSlotsAction);

  const handlePaste = async () => {
    if (!copySourceDate) return;
    const result = await executeCopy({
      sourceDate: new Date(copySourceDate),
      targetDate: new Date(shiftDate),
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

  const handlePasteClick = () => {
    if (workShiftSlots.length > 0) {
      setConfirmPasteOpen(true);
    } else {
      handlePaste();
    }
  };

  const cc = client.commercialCondition;

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

  const periodSummaries = periods
    .map((period) => {
      const planning = plannings.find((p) => p.period === period);
      const plannedCount = planning?.plannedCount ?? 0;
      const filledCount = workShiftSlots.filter((s) => s.period.some((p) => p.toUpperCase() === period)).length;
      return { period, plannedCount, filledCount };
    })
    .filter((s) => s.plannedCount > 0 || s.filledCount > 0);

  const renderPeriodRows = (period: PlanningPeriod) => {
    const planning = plannings.find((p) => p.period === period);
    const plannedCount = planning?.plannedCount ?? 0;
    const periodSlots = workShiftSlots.filter((s) => s.period.some((p) => p.toUpperCase() === period));
    const sortedSlots = [...periodSlots].sort((a, b) => {
      const orderA = STATUS_SORT_ORDER[a.status] ?? 99;
      const orderB = STATUS_SORT_ORDER[b.status] ?? 99;
      return orderA - orderB;
    });
    const periodLabel = PLANNING_PERIOD_LABELS[period];

    const rows: React.ReactNode[] = [];

    for (const slot of sortedSlots) {
      rows.push(
        <MonitoringWorkShiftRow
          key={slot.id}
          slot={slot}
          periodLabel={periodLabel}
          period={period}
          client={client}
          shiftDate={shiftDate}
          onRefresh={onRefresh}
        />,
      );
    }

    const vacantCount = Math.max(0, plannedCount - periodSlots.length);
    for (let i = 0; i < vacantCount; i++) {
      rows.push(
        <MonitoringPlanningRow
          key={`vacant-${period}-${i}`}
          periodLabel={periodLabel}
          period={period}
          client={client}
          shiftDate={shiftDate}
          onRefresh={onRefresh}
        />,
      );
    }

    return rows;
  };

  const allRows = periods.flatMap(renderPeriodRows);

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>{client.name}</CardTitle>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{address}</p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {periodSummaries.length > 0 && (
                <div className="flex items-center gap-2">
                  {periodSummaries.map((s) => {
                    const isDaytime = s.period === planningPeriodConst.DAYTIME;
                    const Icon = isDaytime ? SunIcon : MoonIcon;
                    const label = s.plannedCount > 0 ? `${s.filledCount}/${s.plannedCount}` : `${s.filledCount}`;
                    return (
                      <span
                        key={s.period}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${
                          isDaytime
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-indigo-200 bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        <Icon className="size-3.5" />
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}
              {workShiftSlots.length > 0 && !isCopyTarget && onCopy && (
                <button
                  type="button"
                  onClick={onCopy}
                  className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                  title="Copiar turnos"
                >
                  <CopyIcon className="size-4" />
                </button>
              )}
              {isCopyTarget && copySourceDate && (
                <button
                  type="button"
                  onClick={handlePasteClick}
                  disabled={isCopying}
                  className="flex size-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                  title={`Colar turnos de ${dayjs(copySourceDate).format("DD/MM")}`}
                >
                  <ClipboardPasteIcon className="size-4" />
                </button>
              )}
            </div>
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
          <div className="space-y-2">
            {allRows.length > 0 ? (
              allRows
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-dashed py-6">
                <p className="text-sm text-muted-foreground">Nenhum turno ou planejamento para este dia</p>
              </div>
            )}
          </div>
          <div className="mt-3">
            <Button variant="outline" size="sm" className="w-full" onClick={() => setAddSheetOpen(true)}>
              <PlusIcon className="mr-1 size-3.5" />
              Adicionar entregador
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-[30vw]">
          <SheetHeader>
            <SheetTitle>Adicionar entregador</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <WorkShiftSlotForm
              client={client}
              shiftDate={shiftDate}
              onSuccess={() => {
                setAddSheetOpen(false);
                onRefresh?.();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmPasteOpen} onOpenChange={setConfirmPasteOpen}>
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
                handlePaste();
                setConfirmPasteOpen(false);
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

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import {
  BanknoteIcon,
  CloudRainIcon,
  CreditCardIcon,
  MapPinIcon,
  PackageIcon,
  ShieldCheckIcon,
  UtensilsIcon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BadgeSelect } from "@/components/composite/badge-select";
import { SearchSelect } from "@/components/composite/search-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_TYPE_LABELS, PAYMENT_TYPES } from "@/constants/commercial-conditions";
import { ContractTypeOptions, contractTypeConst } from "@/constants/contract-type";
import { PlanningPeriodOptions } from "@/constants/planning-period";
import { mutateWorkShiftSlotAction } from "@/modules/work-shift-slots/work-shift-slots-actions";
import { applyMoneyMask, formatMoneyDisplay } from "@/utils/masks/money-mask";
import { applyTimeMask } from "@/utils/masks/time-mask";

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

interface DeliverymanOption {
  id: string;
  name: string;
  contractType: string;
  mainPixKey: string;
  secondPixKey?: string | null;
  thridPixKey?: string | null;
  agency?: string | null;
  account?: string | null;
}

interface WorkShiftSlotFormProps {
  client: ClientData;
  shiftDate: string;
  defaultPeriod?: string;
  defaultValues?: {
    id?: string;
    status?: string;
    deliverymanId?: string;
    deliverymanName?: string;
    contractType?: string;
    period?: string[];
    startTime?: string;
    endTime?: string;
    paymentForm?: string;
    deliverymanPaymentType?: string;
    deliverymenPaymentValue?: string;
    additionalTax?: number;
    additionalTaxReason?: string;
    rainTax?: number;
    isWeekendRate?: boolean;
    deliverymanAmountDay?: number;
    deliverymanAmountNight?: number;
    guaranteedQuantityDay?: number;
    guaranteedQuantityNight?: number;
    deliverymanPerDeliveryDay?: number;
    deliverymanPerDeliveryNight?: number;
  };
  isEditing?: boolean;
  onSuccess?: () => void;
}

const formSchema = z.object({
  deliverymanId: z.string().optional(),
  deliverymanPaymentType: z.string().default(""),
  deliverymenPaymentValue: z.string().default(""),
  period: z.array(z.string()).min(1, { message: "Selecione ao menos um período" }),
  contractType: z.string().min(1, { message: "Tipo de contrato é obrigatório" }),
  startTime: z.string().min(1, { message: "Hora de início é obrigatória" }),
  endTime: z.string().min(1, { message: "Hora de término é obrigatória" }),
  paymentForm: z.string().min(1, { message: "Forma de pagamento é obrigatória" }),
  isWeekendRate: z.boolean().default(false),
  additionalTax: z.coerce.number().default(0),
  additionalTaxReason: z.string().default(""),
  isRainTax: z.boolean().default(false),
  rainTax: z.coerce.number().default(0),
});

type FormInputValues = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

type FetchOption = { value: string; label: string };

function useFetchDeliverymen(url: string, debounceMs = 300) {
  const [options, setOptions] = useState<FetchOption[]>([]);
  const [rawData, setRawData] = useState<DeliverymanOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOptions = useCallback(
    async (search?: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const endpoint = new URL(url, window.location.origin);
        endpoint.searchParams.set("pageSize", "20");
        if (search?.trim()) endpoint.searchParams.set("search", search.trim());

        const res = await fetch(endpoint.toString(), { signal: controller.signal });
        if (!res.ok) {
          let message = "Não foi possível carregar os entregadores";

          try {
            const json = await res.json();
            if (typeof json?.error === "string" && json.error) {
              message = json.error;
            }
          } catch {}

          setRawData([]);
          setOptions([]);
          setErrorMessage(message);
          return;
        }

        const json = await res.json();
        const data: DeliverymanOption[] = json.data ?? [];
        setRawData(data);
        setOptions(data.map((d) => ({ value: d.id, label: d.name })));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Error fetching deliverymen:", error);
        setRawData([]);
        setOptions([]);
        setErrorMessage("Não foi possível carregar os entregadores");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    },
    [url],
  );

  const handleSearch = useCallback(
    (search: string) => {
      if (!hasFetched) {
        setHasFetched(true);
        fetchOptions(search);
        return;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fetchOptions(search), debounceMs);
    },
    [fetchOptions, debounceMs, hasFetched],
  );

  const ensureFetched = useCallback(() => {
    if (!hasFetched) {
      setHasFetched(true);
      fetchOptions();
    }
  }, [hasFetched, fetchOptions]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return { options, rawData, isLoading, errorMessage, handleSearch, ensureFetched };
}

function isNonEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") return val !== "" && val !== "0" && val !== "0.00";
  if (Array.isArray(val)) return val.length > 0;
  return Boolean(val);
}

function toNum(val: string | number | undefined | null): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "string" ? Number.parseFloat(val) : val;
  return Number.isNaN(n) ? 0 : n;
}

function toMoneyDisplay(value: number | undefined): string {
  const numeric = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  const cents = Math.round(numeric * 100);
  return cents > 0 ? applyMoneyMask(String(cents)) : "";
}

function onMoneyChange(rawValue: string): number {
  const masked = applyMoneyMask(rawValue);
  const digits = masked.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

export function WorkShiftSlotForm({
  client,
  shiftDate,
  defaultPeriod,
  defaultValues,
  isEditing,
  onSuccess,
}: WorkShiftSlotFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedDeliveryman, setSelectedDeliveryman] = useState<DeliverymanOption | null>(null);

  const isWeekend = dayjs(shiftDate).day() === 0 || dayjs(shiftDate).day() === 6;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormInputValues, undefined, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deliverymanId: defaultValues?.deliverymanId ?? undefined,
      deliverymanPaymentType: defaultValues?.deliverymanPaymentType ?? "",
      deliverymenPaymentValue: defaultValues?.deliverymenPaymentValue ?? "",
      period: defaultValues?.period?.map((p) => p.toUpperCase()) ?? (defaultPeriod ? [defaultPeriod] : []),
      contractType: defaultValues?.contractType ?? "",
      startTime: defaultValues?.startTime ? dayjs(defaultValues.startTime).format("HH:mm") : "",
      endTime: defaultValues?.endTime ? dayjs(defaultValues.endTime).format("HH:mm") : "",
      paymentForm: defaultValues?.paymentForm ?? "",
      isWeekendRate: defaultValues?.isWeekendRate ?? isWeekend,
      additionalTax: defaultValues?.additionalTax ?? 0,
      additionalTaxReason: defaultValues?.additionalTaxReason ?? "",
      isRainTax: (defaultValues?.rainTax ?? 0) > 0,
      rainTax: defaultValues?.rainTax ?? 0,
    },
  });

  const deliverymen = useFetchDeliverymen(`/api/deliverymen?excludeClientId=${client.id}&excludeBlocked=true`);

  // In edit mode, fetch the deliveryman data so payment method badges render
  useEffect(() => {
    if (!isEditing || !defaultValues?.deliverymanId || !defaultValues?.deliverymanName) return;
    const controller = new AbortController();
    fetch(`/api/deliverymen?pageSize=5&search=${encodeURIComponent(defaultValues.deliverymanName)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        const data: DeliverymanOption[] = json.data ?? [];
        const found = data.find((d) => d.id === defaultValues.deliverymanId);
        if (found) setSelectedDeliveryman(found);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isEditing, defaultValues?.deliverymanId, defaultValues?.deliverymanName]);

  const watchedDeliverymanId = watch("deliverymanId");
  const watchedPeriod = watch("period") ?? [];
  const watchedPaymentForm = watch("paymentForm");
  const watchedIsWeekendRate = watch("isWeekendRate");
  const watchedPaymentType = watch("deliverymanPaymentType");
  const watchedAdditionalTax = toNum(watch("additionalTax") as number | undefined);
  const watchedIsRainTax = watch("isRainTax");
  const watchedRainTax = toNum(watch("rainTax") as number | undefined);

  const { execute, isExecuting } = useAction(mutateWorkShiftSlotAction, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        setServerError(data.error);
        toast.error(data.error);
        return;
      }
      if (data?.success) {
        toast.success(isEditing ? "Turno atualizado." : "Turno criado.");
        onSuccess?.();
      }
    },
    onError: () => {
      setServerError("Ocorreu um erro inesperado.");
      toast.error("Ocorreu um erro inesperado.");
    },
  });

  // Build payment options from the selected deliveryman
  const paymentOptions: Array<{ type: string; value: string; label: string }> = [];
  if (selectedDeliveryman) {
    if (selectedDeliveryman.mainPixKey) {
      paymentOptions.push({ type: "PIX_PRINCIPAL", value: selectedDeliveryman.mainPixKey, label: "Pix Principal" });
    }
    if (selectedDeliveryman.secondPixKey) {
      paymentOptions.push({ type: "PIX_2", value: selectedDeliveryman.secondPixKey, label: "Pix 2" });
    }
    if (selectedDeliveryman.thridPixKey) {
      paymentOptions.push({ type: "PIX_3", value: selectedDeliveryman.thridPixKey, label: "Pix 3" });
    }
    if (selectedDeliveryman.agency && selectedDeliveryman.account) {
      paymentOptions.push({
        type: "CONTA_BANCARIA",
        value: `${selectedDeliveryman.agency}/${selectedDeliveryman.account}`,
        label: "Conta Bancária",
      });
    }
  }

  // Calculate payment value from client commercial conditions
  const cc = client.commercialCondition;
  const calculatedValue = (() => {
    if (!cc || !watchedPaymentForm || watchedPeriod.length === 0) return 0;

    let total = 0;
    const isWknd = watchedIsWeekendRate;

    for (const period of watchedPeriod) {
      const isDaytime = period.toUpperCase() === "DAYTIME";

      if (watchedPaymentForm === "DAILY") {
        if (isDaytime) {
          total += toNum(isWknd ? cc.deliverymanDailyDayWknd : cc.deliverymanDailyDay);
        } else {
          total += toNum(isWknd ? cc.deliverymanDailyNightWknd : cc.deliverymanDailyNight);
        }
      } else if (watchedPaymentForm === "GUARANTEED") {
        if (isDaytime) {
          const qty = toNum(isWknd ? cc.guaranteedDayWeekend : cc.guaranteedDay);
          const tax = toNum(isWknd ? cc.guaranteedDayWeekendTax : cc.guaranteedDayTax);
          total += qty * tax;
        } else {
          const qty = toNum(isWknd ? cc.guaranteedNightWeekend : cc.guaranteedNight);
          const tax = toNum(isWknd ? cc.guaranteedNightWeekendTax : cc.guaranteedNightTax);
          total += qty * tax;
        }
      }
    }

    return total;
  })();

  // Available payment forms from client
  const availablePaymentForms = (cc?.paymentForm ?? [])
    .map((v) => ({ value: v, label: PAYMENT_TYPE_LABELS[v] ?? v }))
    .filter((opt) => PAYMENT_TYPES.some((pt) => pt.value === opt.value));

  // Client info
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
    if (isNonEmpty(cc.deliveryAreaKm)) conditions.push({ icon: MapPinIcon, label: `Área: ${cc.deliveryAreaKm} km` });
    if (cc.isMotolinkCovered) conditions.push({ icon: ShieldCheckIcon, label: "Cobertura Motolink" });
    if (isNonEmpty(cc.rainTax))
      conditions.push({ icon: CloudRainIcon, label: `Chuva: ${formatMoneyDisplay(cc.rainTax)}` });
    if (isNonEmpty(cc.paymentForm))
      conditions.push({
        icon: CreditCardIcon,
        label: `${cc.paymentForm?.map((v) => PAYMENT_TYPE_LABELS[v] ?? v).join(", ")}`,
      });
    if (isNonEmpty(cc.deliverymanDailyDay))
      conditions.push({
        icon: BanknoteIcon,
        label: `Diária: ${formatMoneyDisplay(cc.deliverymanDailyDay)}`,
      });
  }

  function onSubmit(data: FormValues) {
    setServerError(null);

    const shiftDateObj = dayjs(shiftDate);
    const startTimeParts = data.startTime.split(":");
    const endTimeParts = data.endTime.split(":");

    const startTimeDate = shiftDateObj.hour(Number(startTimeParts[0])).minute(Number(startTimeParts[1])).second(0);
    const endTimeDate = shiftDateObj.hour(Number(endTimeParts[0])).minute(Number(endTimeParts[1])).second(0);

    const hasDaytime = data.period.some((p) => p.toUpperCase() === "DAYTIME");
    const hasNighttime = data.period.some((p) => p.toUpperCase() === "NIGHTTIME");

    // Build financial fields based on payment form + period + weekend rate
    let deliverymanAmountDay = 0;
    let deliverymanAmountNight = 0;
    let guaranteedQuantityDay = 0;
    let guaranteedQuantityNight = 0;
    let deliverymanPerDeliveryDay = 0;
    let deliverymanPerDeliveryNight = 0;

    if (cc && data.paymentForm === "DAILY") {
      if (hasDaytime) {
        deliverymanAmountDay = toNum(data.isWeekendRate ? cc.deliverymanDailyDayWknd : cc.deliverymanDailyDay);
      }
      if (hasNighttime) {
        deliverymanAmountNight = toNum(data.isWeekendRate ? cc.deliverymanDailyNightWknd : cc.deliverymanDailyNight);
      }
    } else if (cc && data.paymentForm === "GUARANTEED") {
      if (hasDaytime) {
        guaranteedQuantityDay = toNum(data.isWeekendRate ? cc.guaranteedDayWeekend : cc.guaranteedDay);
        deliverymanPerDeliveryDay = toNum(data.isWeekendRate ? cc.guaranteedDayWeekendTax : cc.guaranteedDayTax);
      }
      if (hasNighttime) {
        guaranteedQuantityNight = toNum(data.isWeekendRate ? cc.guaranteedNightWeekend : cc.guaranteedNight);
        deliverymanPerDeliveryNight = toNum(data.isWeekendRate ? cc.guaranteedNightWeekendTax : cc.guaranteedNightTax);
      }
    }

    const status = isEditing && defaultValues?.status ? defaultValues.status : data.deliverymanId ? "INVITED" : "OPEN";

    execute({
      ...(isEditing && defaultValues?.id ? { id: defaultValues.id } : {}),
      clientId: client.id,
      deliverymanId: data.deliverymanId || undefined,
      status,
      contractType: data.contractType,
      shiftDate: shiftDateObj.toDate(),
      startTime: startTimeDate.toDate(),
      endTime: endTimeDate.toDate(),
      period: data.period.map((p) => p.toLowerCase()),
      auditStatus: "PENDING",
      isFreelancer: data.contractType === contractTypeConst.FREELANCER,
      trackingConnected: false,
      deliverymanAmountDay,
      deliverymanAmountNight,
      deliverymanPaymentType: data.deliverymanPaymentType,
      deliverymenPaymentValue: data.deliverymenPaymentValue,
      paymentForm: data.paymentForm,
      guaranteedQuantityDay,
      guaranteedQuantityNight,
      deliverymanPerDeliveryDay,
      deliverymanPerDeliveryNight,
      isWeekendRate: data.isWeekendRate,
      additionalTax: data.additionalTax,
      additionalTaxReason: data.additionalTaxReason || undefined,
      rainTax: data.rainTax,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Client info header */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{client.name}</h3>
        <p className="text-xs text-muted-foreground">{address}</p>
        {conditions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {conditions.map((c) => (
              <Badge key={c.label} variant="secondary" className="gap-1 text-[10px] font-normal">
                <c.icon className="size-2.5" />
                {c.label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Deliveryman search */}
      <Field data-invalid={!!errors.deliverymanId}>
        <FieldLabel>Entregador</FieldLabel>
        <SearchSelect
          value={watchedDeliverymanId ?? null}
          onValueChange={(val) => {
            setValue("deliverymanId", val ?? undefined);
            const found = deliverymen.rawData.find((d) => d.id === val);
            setSelectedDeliveryman(found ?? null);
            if (found) {
              setValue("contractType", found.contractType);
            }
            setValue("deliverymanPaymentType", "");
            setValue("deliverymenPaymentValue", "");
          }}
          onOpen={deliverymen.ensureFetched}
          onSearchChange={deliverymen.handleSearch}
          options={
            defaultValues?.deliverymanId && !deliverymen.options.some((o) => o.value === defaultValues.deliverymanId)
              ? [
                  { value: defaultValues.deliverymanId, label: defaultValues.deliverymanName ?? "" },
                  ...deliverymen.options,
                ]
              : deliverymen.options
          }
          isLoading={deliverymen.isLoading}
          placeholder="Buscar entregador..."
          emptyMessage={deliverymen.errorMessage ?? "Nenhum entregador encontrado"}
          className="w-full"
        />
        <FieldError errors={[errors.deliverymanId]} />
      </Field>

      {/* Payment options from deliveryman */}
      {paymentOptions.length > 0 && (
        <Field>
          <FieldLabel>Forma de recebimento</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {paymentOptions.map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => {
                  if (watchedPaymentType === opt.type) {
                    setValue("deliverymanPaymentType", "");
                    setValue("deliverymenPaymentValue", "");
                  } else {
                    setValue("deliverymanPaymentType", opt.type);
                    setValue("deliverymenPaymentValue", opt.value);
                  }
                }}
              >
                <Badge variant={watchedPaymentType === opt.type ? "default" : "outline"} className="cursor-pointer">
                  {opt.label}
                </Badge>
              </button>
            ))}
          </div>
          {watchedPaymentType && (
            <p className="mt-1 text-xs text-muted-foreground">
              {paymentOptions.find((o) => o.type === watchedPaymentType)?.value}
            </p>
          )}
        </Field>
      )}

      {/* Period */}
      <Field data-invalid={!!errors.period}>
        <FieldLabel>Período</FieldLabel>
        <Controller
          name="period"
          control={control}
          render={({ field }) => (
            <BadgeSelect
              value={field.value ?? []}
              onChange={field.onChange}
              options={[...PlanningPeriodOptions]}
              placeholder="Selecionar período..."
            />
          )}
        />
        <FieldError errors={[errors.period]} />
      </Field>

      {/* Contract type */}
      <Field data-invalid={!!errors.contractType}>
        <FieldLabel>Tipo de contrato</FieldLabel>
        <Select value={watch("contractType") || undefined} onValueChange={(val) => setValue("contractType", val)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            {ContractTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError errors={[errors.contractType]} />
      </Field>

      {/* Rain tax toggle */}
      <Field>
        <div className="flex items-center gap-3">
          <Switch
            id="isRainTax"
            checked={watchedIsRainTax}
            disabled={!cc?.rainTax || toNum(cc.rainTax) === 0}
            onCheckedChange={(checked) => {
              const isOn = !!checked;
              setValue("isRainTax", isOn);
              setValue("rainTax", isOn ? toNum(cc?.rainTax) : 0);
            }}
          />
          <FieldLabel htmlFor="isRainTax" className="mb-0">
            Taxa de chuva
          </FieldLabel>
        </div>
        {watchedIsRainTax && (
          <p className="mt-1 text-xs text-muted-foreground">{formatMoneyDisplay(toNum(cc?.rainTax))}</p>
        )}
        {(!cc?.rainTax || toNum(cc.rainTax) === 0) && (
          <p className="mt-1 text-xs text-muted-foreground">Cliente sem taxa de chuva configurada</p>
        )}
      </Field>

      {/* Start / End time */}
      <div className="grid grid-cols-2 gap-3">
        <Field data-invalid={!!errors.startTime}>
          <FieldLabel htmlFor="startTime">Hora início</FieldLabel>
          <Controller
            name="startTime"
            control={control}
            render={({ field }) => (
              <Input
                id="startTime"
                placeholder="HH:MM"
                maxLength={5}
                value={field.value}
                onChange={(e) => field.onChange(applyTimeMask(e.target.value))}
              />
            )}
          />
          <FieldError errors={[errors.startTime]} />
        </Field>
        <Field data-invalid={!!errors.endTime}>
          <FieldLabel htmlFor="endTime">Hora término</FieldLabel>
          <Controller
            name="endTime"
            control={control}
            render={({ field }) => (
              <Input
                id="endTime"
                placeholder="HH:MM"
                maxLength={5}
                value={field.value}
                onChange={(e) => field.onChange(applyTimeMask(e.target.value))}
              />
            )}
          />
          <FieldError errors={[errors.endTime]} />
        </Field>
      </div>

      {/* Weekend rate toggle */}
      <Field>
        <div className="flex items-center gap-3">
          <Switch
            id="isWeekendRate"
            checked={watchedIsWeekendRate}
            onCheckedChange={(checked) => setValue("isWeekendRate", !!checked)}
          />
          <FieldLabel htmlFor="isWeekendRate" className="mb-0">
            Taxa de fim de semana
          </FieldLabel>
        </div>
        {isWeekend && !watchedIsWeekendRate && (
          <p className="mt-1 text-xs text-yellow-600">A data selecionada é fim de semana</p>
        )}
      </Field>

      <Separator />

      {/* Payment form */}
      <Field data-invalid={!!errors.paymentForm}>
        <FieldLabel>Tipo de pagamento</FieldLabel>
        {availablePaymentForms.length > 0 ? (
          <Controller
            name="paymentForm"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-1.5">
                {availablePaymentForms.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(field.value === opt.value ? "" : opt.value)}
                  >
                    <Badge variant={field.value === opt.value ? "default" : "outline"} className="cursor-pointer">
                      {opt.label}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          />
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma forma de pagamento cadastrada para este cliente</p>
        )}
        <FieldError errors={[errors.paymentForm]} />
      </Field>

      {/* Additional tax */}
      <Field>
        <FieldLabel>Taxa adicional</FieldLabel>
        <Controller
          name="additionalTax"
          control={control}
          render={({ field }) => (
            <Input
              type="text"
              placeholder="R$ 0,00"
              value={toMoneyDisplay(field.value as number)}
              onChange={(e) => field.onChange(onMoneyChange(e.target.value))}
            />
          )}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="additionalTaxReason">Motivo da taxa adicional</FieldLabel>
        <Textarea id="additionalTaxReason" placeholder="Descreva o motivo..." {...register("additionalTaxReason")} />
      </Field>

      {/* Payment summary */}
      {watchedPaymentForm && watchedPeriod.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Resumo do pagamento</p>
          <div className="space-y-1 text-sm">
            {watchedPeriod.map((period) => {
              const isDaytime = period.toUpperCase() === "DAYTIME";
              const label = isDaytime ? "Diurno" : "Noturno";

              if (watchedPaymentForm === "DAILY") {
                const rate = isDaytime
                  ? toNum(watchedIsWeekendRate ? cc?.deliverymanDailyDayWknd : cc?.deliverymanDailyDay)
                  : toNum(watchedIsWeekendRate ? cc?.deliverymanDailyNightWknd : cc?.deliverymanDailyNight);
                return (
                  <div key={period} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span>{formatMoneyDisplay(rate)}</span>
                  </div>
                );
              }

              const qty = isDaytime
                ? toNum(watchedIsWeekendRate ? cc?.guaranteedDayWeekend : cc?.guaranteedDay)
                : toNum(watchedIsWeekendRate ? cc?.guaranteedNightWeekend : cc?.guaranteedNight);
              const tax = isDaytime
                ? toNum(watchedIsWeekendRate ? cc?.guaranteedDayWeekendTax : cc?.guaranteedDayTax)
                : toNum(watchedIsWeekendRate ? cc?.guaranteedNightWeekendTax : cc?.guaranteedNightTax);
              const subtotal = qty * tax;
              return (
                <div key={period} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {label}: {qty} x {formatMoneyDisplay(tax)}
                  </span>
                  <span>{formatMoneyDisplay(subtotal)}</span>
                </div>
              );
            })}
            {watchedAdditionalTax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa adicional</span>
                <span>{formatMoneyDisplay(watchedAdditionalTax)}</span>
              </div>
            )}
            {watchedIsRainTax && watchedRainTax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa de chuva</span>
                <span>{formatMoneyDisplay(watchedRainTax)}</span>
              </div>
            )}
            <div className="border-t pt-1">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatMoneyDisplay(calculatedValue + watchedAdditionalTax + watchedRainTax)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" isLoading={isExecuting} className="w-full">
        {isEditing ? "Salvar Alterações" : "Criar Turno"}
      </Button>
    </form>
  );
}

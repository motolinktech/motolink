"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { BadgeSelect } from "@/components/composite/badge-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BAGS_STATUS, BAGS_STATUS_OPTIONS } from "@/constants/bags-status";
import { BRAZIL_STATES } from "@/constants/brazil-states";
import { PAYMENT_TYPES, PERIOD_TYPES } from "@/constants/commercial-conditions";
import { mutateClientAction } from "@/modules/clients/clients-actions";
import { type ClientFormValues, clientFormSchema } from "@/modules/clients/clients-types";
import { applyCepMask } from "@/utils/masks/cep-mask";
import { cleanMask } from "@/utils/masks/clean-mask";
import { applyCnpjMask } from "@/utils/masks/cnpj-mask";
import { applyMoneyMask } from "@/utils/masks/money-mask";
import { applyPhoneMask } from "@/utils/masks/phone-mask";

const EMPTY_SELECT_VALUE = "__empty__";

interface ClientFormProps {
  regions: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  defaultValues?: Partial<ClientFormValues>;
  isEditing?: boolean;
  redirectTo?: string;
}

const DAILY_PERIOD_FIELD_MAP: Record<
  string,
  { client: keyof ClientFormValues; deliveryman: keyof ClientFormValues; label: string }
> = {
  WEEK_DAY: { client: "clientDailyDay", deliveryman: "deliverymanDailyDay", label: "Semanal (Dia)" },
  WEEK_NIGHT: { client: "clientDailyNight", deliveryman: "deliverymanDailyNight", label: "Semanal (Noite)" },
  WEEKEND_DAY: { client: "clientDailyDayWknd", deliveryman: "deliverymanDailyDayWknd", label: "Fim de Semana (Dia)" },
  WEEKEND_NIGHT: {
    client: "clientDailyNightWknd",
    deliveryman: "deliverymanDailyNightWknd",
    label: "Fim de Semana (Noite)",
  },
};

const GUARANTEED_PERIOD_FIELD_MAP: Record<
  string,
  { quantity: keyof ClientFormValues; tax: keyof ClientFormValues; label: string }
> = {
  WEEK_DAY: { quantity: "guaranteedDay", tax: "guaranteedDayTax", label: "Semanal (Dia)" },
  WEEK_NIGHT: { quantity: "guaranteedNight", tax: "guaranteedNightTax", label: "Semanal (Noite)" },
  WEEKEND_DAY: { quantity: "guaranteedDayWeekend", tax: "guaranteedDayWeekendTax", label: "Fim de Semana (Dia)" },
  WEEKEND_NIGHT: {
    quantity: "guaranteedNightWeekend",
    tax: "guaranteedNightWeekendTax",
    label: "Fim de Semana (Noite)",
  },
};

export function ClientForm({ regions, groups, defaultValues, isEditing, redirectTo }: ClientFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const filledByCnpjRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      id: defaultValues?.id,
      name: defaultValues?.name ?? "",
      cnpj: defaultValues?.cnpj ?? "",
      contactName: defaultValues?.contactName ?? "",
      contactPhone: defaultValues?.contactPhone ?? "",
      observations: defaultValues?.observations ?? "",
      cep: defaultValues?.cep ?? "",
      street: defaultValues?.street ?? "",
      number: defaultValues?.number ?? "",
      complement: defaultValues?.complement ?? "",
      neighborhood: defaultValues?.neighborhood ?? "",
      city: defaultValues?.city ?? "",
      uf: defaultValues?.uf ?? "",
      regionId: defaultValues?.regionId ?? "",
      groupId: defaultValues?.groupId ?? "",
      provideMeal: defaultValues?.provideMeal ?? false,
      bagsStatus: defaultValues?.bagsStatus ?? "UNKNOWN",
      bagsAllocated: defaultValues?.bagsAllocated ?? 0,
      hasRainTax: defaultValues?.hasRainTax ?? false,
      rainTax: defaultValues?.rainTax ?? 0,
      deliveryAreaKm: defaultValues?.deliveryAreaKm ?? 0,
      isMotolinkCovered: defaultValues?.isMotolinkCovered ?? false,
      paymentForm: defaultValues?.paymentForm ?? [],
      dailyPeriods: defaultValues?.dailyPeriods ?? [],
      guaranteedPeriods: defaultValues?.guaranteedPeriods ?? [],
      clientDailyDay: defaultValues?.clientDailyDay ?? 0,
      clientDailyNight: defaultValues?.clientDailyNight ?? 0,
      clientDailyDayWknd: defaultValues?.clientDailyDayWknd ?? 0,
      clientDailyNightWknd: defaultValues?.clientDailyNightWknd ?? 0,
      deliverymanDailyDay: defaultValues?.deliverymanDailyDay ?? 0,
      deliverymanDailyNight: defaultValues?.deliverymanDailyNight ?? 0,
      deliverymanDailyDayWknd: defaultValues?.deliverymanDailyDayWknd ?? 0,
      deliverymanDailyNightWknd: defaultValues?.deliverymanDailyNightWknd ?? 0,
      clientPerDelivery: defaultValues?.clientPerDelivery ?? 0,
      clientAdditionalKm: defaultValues?.clientAdditionalKm ?? 0,
      deliverymanPerDelivery: defaultValues?.deliverymanPerDelivery ?? 0,
      deliverymanAdditionalKm: defaultValues?.deliverymanAdditionalKm ?? 0,
      guaranteedDay: defaultValues?.guaranteedDay ?? 0,
      guaranteedNight: defaultValues?.guaranteedNight ?? 0,
      guaranteedDayWeekend: defaultValues?.guaranteedDayWeekend ?? 0,
      guaranteedNightWeekend: defaultValues?.guaranteedNightWeekend ?? 0,
      guaranteedDayTax: defaultValues?.guaranteedDayTax ?? 0,
      guaranteedNightTax: defaultValues?.guaranteedNightTax ?? 0,
      guaranteedDayWeekendTax: defaultValues?.guaranteedDayWeekendTax ?? 0,
      guaranteedNightWeekendTax: defaultValues?.guaranteedNightWeekendTax ?? 0,
    },
  });

  const { execute, isExecuting } = useAction(mutateClientAction, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        setServerError(data.error);
        toast.error(data.error);
        return;
      }

      if (data?.success) {
        toast.success(isEditing ? "Cliente atualizado." : "Cliente criado.");
        if (redirectTo) {
          router.push(redirectTo);
        }
      }
    },
    onError: () => {
      setServerError("Ocorreu um erro inesperado.");
      toast.error("Ocorreu um erro inesperado.");
    },
  });

  const watchedCnpj = watch("cnpj");
  const watchedCep = watch("cep");
  const selectedUf = watch("uf");
  const selectedRegionId = watch("regionId");
  const selectedGroupId = watch("groupId");
  const selectedBagsStatus = watch("bagsStatus");
  const watchedProvideMeal = watch("provideMeal");
  const watchedHasRainTax = watch("hasRainTax");
  const watchedIsMotolinkCovered = watch("isMotolinkCovered");
  const selectedPaymentForm = watch("paymentForm") ?? [];
  const selectedDailyPeriods = watch("dailyPeriods") ?? [];
  const selectedGuaranteedPeriods = watch("guaranteedPeriods") ?? [];

  const hasDaily = selectedPaymentForm.includes("DAILY");
  const hasGuaranteed = selectedPaymentForm.includes("GUARANTEED");

  // CNPJ auto-fill
  useEffect(() => {
    const digits = cleanMask(watchedCnpj);
    if (digits.length !== 14) return;

    let cancelled = false;

    fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
      .then((res) => {
        if (!res.ok) throw new Error("CNPJ não encontrado");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        filledByCnpjRef.current = true;

        if (data.cep) setValue("cep", applyCepMask(data.cep));
        if (data.logradouro) setValue("street", data.logradouro);
        if (data.numero) setValue("number", data.numero);
        if (data.complemento) setValue("complement", data.complemento);
        if (data.bairro) setValue("neighborhood", data.bairro);
        if (data.municipio) setValue("city", data.municipio);
        if (data.uf) setValue("uf", data.uf);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [watchedCnpj, setValue]);

  // CEP auto-fill
  useEffect(() => {
    const digits = cleanMask(watchedCep);
    if (digits.length !== 8) return;

    if (filledByCnpjRef.current) {
      filledByCnpjRef.current = false;
      return;
    }

    let cancelled = false;

    fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`)
      .then((res) => {
        if (!res.ok) throw new Error("CEP não encontrado");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.street) setValue("street", data.street);
        if (data.neighborhood) setValue("neighborhood", data.neighborhood);
        if (data.city) setValue("city", data.city);
        if (data.state) setValue("uf", data.state);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [watchedCep, setValue]);

  // Clear daily periods when DAILY is deselected
  useEffect(() => {
    if (!hasDaily) {
      setValue("dailyPeriods", []);
    }
  }, [hasDaily, setValue]);

  // Clear guaranteed periods when GUARANTEED is deselected
  useEffect(() => {
    if (!hasGuaranteed) {
      setValue("guaranteedPeriods", []);
    }
  }, [hasGuaranteed, setValue]);

  function onSubmit(data: ClientFormValues) {
    setServerError(null);
    execute(data);
  }

  const cnpjRegister = register("cnpj");
  const phoneRegister = register("contactPhone");
  const cepRegister = register("cep");

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <FieldSet>
        <FieldLegend>Dados do Cliente</FieldLegend>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
          <Field className="md:col-span-2" data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <Input id="name" placeholder="Nome do cliente" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.cnpj}>
            <FieldLabel htmlFor="cnpj">CNPJ</FieldLabel>
            <Input
              id="cnpj"
              placeholder="00.000.000/0000-00"
              {...cnpjRegister}
              onChange={(event) => {
                event.target.value = applyCnpjMask(event.target.value);
                cnpjRegister.onChange(event);
              }}
            />
            <FieldError errors={[errors.cnpj]} />
          </Field>

          <Field className="md:col-span-2" data-invalid={!!errors.contactName}>
            <FieldLabel htmlFor="contactName">Nome do Contato</FieldLabel>
            <Input id="contactName" placeholder="Nome do contato" {...register("contactName")} />
            <FieldError errors={[errors.contactName]} />
          </Field>

          <Field data-invalid={!!errors.contactPhone}>
            <FieldLabel htmlFor="contactPhone">Telefone de Contato</FieldLabel>
            <Input
              id="contactPhone"
              placeholder="(00) 00000-0000"
              {...phoneRegister}
              onChange={(event) => {
                event.target.value = applyPhoneMask(event.target.value);
                phoneRegister.onChange(event);
              }}
            />
            <FieldError errors={[errors.contactPhone]} />
          </Field>

          <Field className="md:col-span-3" data-invalid={!!errors.observations}>
            <FieldLabel htmlFor="observations">Observações</FieldLabel>
            <Textarea id="observations" placeholder="Observações sobre o cliente..." {...register("observations")} />
            <FieldError errors={[errors.observations]} />
          </Field>
        </div>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Endereço</FieldLegend>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-12">
          <Field className="md:col-span-3" data-invalid={!!errors.cep}>
            <FieldLabel htmlFor="cep">CEP</FieldLabel>
            <Input
              id="cep"
              placeholder="00000-000"
              {...cepRegister}
              onChange={(event) => {
                event.target.value = applyCepMask(event.target.value);
                cepRegister.onChange(event);
              }}
            />
            <FieldError errors={[errors.cep]} />
          </Field>

          <Field className="md:col-span-9" data-invalid={!!errors.street}>
            <FieldLabel htmlFor="street">Rua</FieldLabel>
            <Input id="street" placeholder="Nome da rua" {...register("street")} />
            <FieldError errors={[errors.street]} />
          </Field>

          <Field className="md:col-span-2" data-invalid={!!errors.number}>
            <FieldLabel htmlFor="number">Número</FieldLabel>
            <Input id="number" placeholder="Nº" {...register("number")} />
            <FieldError errors={[errors.number]} />
          </Field>

          <Field className="md:col-span-4" data-invalid={!!errors.complement}>
            <FieldLabel htmlFor="complement">Complemento</FieldLabel>
            <Input id="complement" placeholder="Apto, sala, etc." {...register("complement")} />
            <FieldError errors={[errors.complement]} />
          </Field>

          <Field className="md:col-span-6" data-invalid={!!errors.neighborhood}>
            <FieldLabel htmlFor="neighborhood">Bairro</FieldLabel>
            <Input id="neighborhood" placeholder="Bairro" {...register("neighborhood")} />
            <FieldError errors={[errors.neighborhood]} />
          </Field>

          <Field className="md:col-span-6" data-invalid={!!errors.city}>
            <FieldLabel htmlFor="city">Cidade</FieldLabel>
            <Input id="city" placeholder="Cidade" {...register("city")} />
            <FieldError errors={[errors.city]} />
          </Field>

          <Field className="md:col-span-3" data-invalid={!!errors.uf}>
            <FieldLabel>UF</FieldLabel>
            <Select value={selectedUf || undefined} onValueChange={(value) => setValue("uf", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar UF..." />
              </SelectTrigger>
              <SelectContent>
                {BRAZIL_STATES.map((state) => (
                  <SelectItem key={state.uf} value={state.uf}>
                    {state.uf} - {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.uf]} />
          </Field>
        </div>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Classificação</FieldLegend>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
          <Field data-invalid={!!errors.regionId}>
            <FieldLabel>Região</FieldLabel>
            <Select
              value={selectedRegionId || undefined}
              onValueChange={(value) => setValue("regionId", value === EMPTY_SELECT_VALUE ? "" : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar região..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Sem região</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.regionId]} />
          </Field>

          <Field data-invalid={!!errors.groupId}>
            <FieldLabel>Grupo</FieldLabel>
            <Select
              value={selectedGroupId || undefined}
              onValueChange={(value) => setValue("groupId", value === EMPTY_SELECT_VALUE ? "" : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar grupo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Sem grupo</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.groupId]} />
          </Field>

          <Field data-invalid={!!errors.bagsStatus}>
            <FieldLabel>Status dos Bags</FieldLabel>
            <Select value={selectedBagsStatus || undefined} onValueChange={(value) => setValue("bagsStatus", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar status..." />
              </SelectTrigger>
              <SelectContent>
                {BAGS_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.bagsStatus]} />
          </Field>

          {selectedBagsStatus === BAGS_STATUS.COMPANY && (
            <Field data-invalid={!!errors.bagsAllocated}>
              <FieldLabel htmlFor="bagsAllocated">Quantidade de Bags</FieldLabel>
              <Input id="bagsAllocated" type="number" min={0} placeholder="0" {...register("bagsAllocated")} />
              <FieldError errors={[errors.bagsAllocated]} />
            </Field>
          )}
        </div>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Condições Comerciais</FieldLegend>
        <div className="flex flex-col gap-7">
          <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
            <Field>
              <div className="flex items-center gap-3">
                <Switch
                  id="provideMeal"
                  checked={watchedProvideMeal}
                  onCheckedChange={(checked) => setValue("provideMeal", !!checked)}
                />
                <FieldLabel htmlFor="provideMeal" className="mb-0">
                  Fornece refeição?
                </FieldLabel>
              </div>
            </Field>

            <Field>
              <div className="flex items-center gap-3">
                <Switch
                  id="hasRainTax"
                  checked={watchedHasRainTax}
                  onCheckedChange={(checked) => {
                    setValue("hasRainTax", !!checked);
                    if (!checked) setValue("rainTax", 0);
                  }}
                />
                <FieldLabel htmlFor="hasRainTax" className="mb-0">
                  Taxa de chuva?
                </FieldLabel>
              </div>
              {watchedHasRainTax && (
                <Controller
                  name="rainTax"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      className="mt-2"
                      value={toMoneyDisplay(field.value as number)}
                      onChange={(e) => field.onChange(onMoneyChange(e.target.value))}
                    />
                  )}
                />
              )}
            </Field>
          </div>

          <Field data-invalid={!!errors.deliveryAreaKm}>
            <FieldLabel htmlFor="deliveryAreaKm">Área de entrega (km)</FieldLabel>
            <Input
              id="deliveryAreaKm"
              type="number"
              step="0.1"
              min={0}
              placeholder="0"
              className="md:max-w-xs"
              {...register("deliveryAreaKm")}
            />
            <FieldError errors={[errors.deliveryAreaKm]} />
          </Field>

          <Field>
            <FieldLabel>Forma de pagamento</FieldLabel>
            <BadgeSelect
              value={selectedPaymentForm}
              onChange={(val) => setValue("paymentForm", val)}
              options={[...PAYMENT_TYPES]}
              placeholder="Selecionar formas de pagamento..."
            />
          </Field>

          {hasGuaranteed && (
            <div className="border-border bg-muted/50 rounded-lg border p-4">
              <Field>
                <div className="flex items-center gap-3">
                  <Switch
                    id="isMotolinkCovered"
                    checked={watchedIsMotolinkCovered}
                    onCheckedChange={(checked) => setValue("isMotolinkCovered", !!checked)}
                  />
                  <FieldLabel htmlFor="isMotolinkCovered" className="mb-0">
                    Coberto pela Motolink
                  </FieldLabel>
                </div>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  Caso o entregador não atinja o valor de entregas garantidas a diferença será paga pela MOTOLINK
                </p>
              </Field>
            </div>
          )}

          {/* General pricing fields */}
          {selectedPaymentForm.length > 0 && (
            <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="clientPerDelivery">Cliente - Por Entrega</FieldLabel>
                <Controller
                  name="clientPerDelivery"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="clientPerDelivery"
                      type="text"
                      placeholder="R$ 0,00"
                      value={toMoneyDisplay(field.value as number)}
                      onChange={(e) => field.onChange(onMoneyChange(e.target.value))}
                    />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="clientAdditionalKm">Cliente - Km Adicional</FieldLabel>
                <Controller
                  name="clientAdditionalKm"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="clientAdditionalKm"
                      type="text"
                      placeholder="R$ 0,00"
                      value={toMoneyDisplay(field.value as number)}
                      onChange={(e) => field.onChange(onMoneyChange(e.target.value))}
                    />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="deliverymanPerDelivery">Entregador - Por Entrega</FieldLabel>
                <Controller
                  name="deliverymanPerDelivery"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="deliverymanPerDelivery"
                      type="text"
                      placeholder="R$ 0,00"
                      value={toMoneyDisplay(field.value as number)}
                      onChange={(e) => field.onChange(onMoneyChange(e.target.value))}
                    />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="deliverymanAdditionalKm">Entregador - Km Adicional</FieldLabel>
                <Controller
                  name="deliverymanAdditionalKm"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="deliverymanAdditionalKm"
                      type="text"
                      placeholder="R$ 0,00"
                      value={toMoneyDisplay(field.value as number)}
                      onChange={(e) => field.onChange(onMoneyChange(e.target.value))}
                    />
                  )}
                />
              </Field>
            </div>
          )}
        </div>
      </FieldSet>

      {/* Section 5: Diária */}
      {hasDaily && (
        <>
          <Separator />
          <FieldSet>
            <FieldLegend>Diária</FieldLegend>
            <div className="flex flex-col gap-7">
              <Field>
                <FieldLabel>Períodos - Diária</FieldLabel>
                <BadgeSelect
                  value={selectedDailyPeriods}
                  onChange={(val) => setValue("dailyPeriods", val)}
                  options={[...PERIOD_TYPES]}
                  placeholder="Selecionar períodos..."
                />
              </Field>

              {selectedDailyPeriods.map((period) => {
                const mapping = DAILY_PERIOD_FIELD_MAP[period];
                if (!mapping) return null;
                return (
                  <div key={period} className="grid grid-cols-1 gap-7 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={mapping.client as string}>Cliente - {mapping.label}</FieldLabel>
                      <Controller
                        name={mapping.client}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={mapping.client as string}
                            type="text"
                            placeholder="R$ 0,00"
                            value={toMoneyDisplay(field.value as number)}
                            onChange={(e) => field.onChange(onMoneyChange(e.target.value))}
                          />
                        )}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={mapping.deliveryman as string}>Entregador - {mapping.label}</FieldLabel>
                      <Controller
                        name={mapping.deliveryman}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={mapping.deliveryman as string}
                            type="text"
                            placeholder="R$ 0,00"
                            value={toMoneyDisplay(field.value as number)}
                            onChange={(e) => field.onChange(onMoneyChange(e.target.value))}
                          />
                        )}
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          </FieldSet>
        </>
      )}

      {/* Section 6: Qt. Garantida */}
      {hasGuaranteed && (
        <>
          <Separator />
          <FieldSet>
            <FieldLegend>Qt. Garantida</FieldLegend>
            <div className="flex flex-col gap-7">
              <Field>
                <FieldLabel>Períodos - Qt. Garantida</FieldLabel>
                <BadgeSelect
                  value={selectedGuaranteedPeriods}
                  onChange={(val) => setValue("guaranteedPeriods", val)}
                  options={[...PERIOD_TYPES]}
                  placeholder="Selecionar períodos..."
                />
              </Field>

              {selectedGuaranteedPeriods.map((period) => {
                const mapping = GUARANTEED_PERIOD_FIELD_MAP[period];
                if (!mapping) return null;
                return (
                  <div key={period} className="grid grid-cols-1 gap-7 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={mapping.quantity as string}>Qt. Garantida - {mapping.label}</FieldLabel>
                      <Input
                        id={mapping.quantity as string}
                        type="number"
                        min={0}
                        placeholder="0"
                        {...register(mapping.quantity)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={mapping.tax as string}>Taxa de Qt. Garantida - {mapping.label}</FieldLabel>
                      <Controller
                        name={mapping.tax}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={mapping.tax as string}
                            type="text"
                            placeholder="R$ 0,00"
                            value={toMoneyDisplay(field.value as number)}
                            onChange={(e) => field.onChange(onMoneyChange(e.target.value))}
                          />
                        )}
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          </FieldSet>
        </>
      )}

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" isLoading={isExecuting}>
        {isEditing ? "Salvar Alterações" : "Criar Cliente"}
      </Button>
    </form>
  );
}

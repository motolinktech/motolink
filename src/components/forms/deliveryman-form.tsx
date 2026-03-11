"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FileInput } from "@/components/composite/file-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { colorsConst } from "@/constants/colors";
import { ContractTypeOptions } from "@/constants/contract-type";
import { vehicleTypesConst } from "@/constants/vehicle-type";
import { storage } from "@/lib/firebase";
import { mutateDeliverymanAction } from "@/modules/deliverymen/deliverymen-actions";
import { type DeliverymanFormValues, deliverymanFormSchema } from "@/modules/deliverymen/deliverymen-types";
import { applyCpfMask } from "@/utils/masks/cpf-mask";
import { applyPhoneMask } from "@/utils/masks/phone-mask";

const EMPTY_SELECT_VALUE = "__empty__";

interface DeliverymanFormProps {
  regions: { id: string; name: string }[];
  defaultValues?: Partial<DeliverymanFormValues>;
  isEditing?: boolean;
  redirectTo?: string;
}

export function DeliverymanForm({ regions, defaultValues, isEditing, redirectTo }: DeliverymanFormProps) {
  const router = useRouter();
  const [formFiles, setFormFiles] = useState<(File | string)[]>(defaultValues?.files ?? []);
  const [isUploading, setIsUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DeliverymanFormValues>({
    resolver: zodResolver(deliverymanFormSchema),
    defaultValues: {
      id: defaultValues?.id,
      name: defaultValues?.name ?? "",
      document: defaultValues?.document ?? "",
      phone: defaultValues?.phone ?? "",
      contractType: defaultValues?.contractType ?? "",
      mainPixKey: defaultValues?.mainPixKey ?? "",
      secondPixKey: defaultValues?.secondPixKey ?? "",
      thridPixKey: defaultValues?.thridPixKey ?? "",
      agency: defaultValues?.agency ?? "",
      account: defaultValues?.account ?? "",
      vehicleModel: defaultValues?.vehicleModel ?? "",
      vehiclePlate: defaultValues?.vehiclePlate ?? "",
      vehicleColor: defaultValues?.vehicleColor ?? "",
      files: defaultValues?.files ?? [],
      regionId: defaultValues?.regionId ?? "",
    },
  });

  const { execute, isExecuting } = useAction(mutateDeliverymanAction, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        setServerError(data.error);
        toast.error(data.error);
        return;
      }

      if (data?.success) {
        toast.success(isEditing ? "Entregador atualizado." : "Entregador criado.");
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

  const mainPixKey = watch("mainPixKey");
  const secondPixKey = watch("secondPixKey");
  const selectedContractType = watch("contractType");
  const selectedVehicleModel = watch("vehicleModel");
  const selectedVehicleColor = watch("vehicleColor");
  const selectedRegionId = watch("regionId");

  useEffect(() => {
    if ((mainPixKey ?? "").trim().length > 0) return;
    setValue("secondPixKey", "");
    setValue("thridPixKey", "");
  }, [mainPixKey, setValue]);

  useEffect(() => {
    if ((secondPixKey ?? "").trim().length > 0) return;
    setValue("thridPixKey", "");
  }, [secondPixKey, setValue]);

  async function onSubmit(data: DeliverymanFormValues) {
    setServerError(null);

    const existingUrls = formFiles.filter((file): file is string => typeof file === "string");
    const newFiles = formFiles.filter((file): file is File => file instanceof File);

    let allFileUrls = [...existingUrls];

    if (newFiles.length > 0) {
      setIsUploading(true);

      try {
        const deliverymanStorage = storage("deliverymen");
        const uploadPromises = newFiles.map((file) => deliverymanStorage.upload(file));
        const uploadedUrls = await Promise.all(uploadPromises);
        allFileUrls = [...allFileUrls, ...uploadedUrls];
      } catch {
        toast.error("Erro ao enviar arquivos. Tente novamente.");
        return;
      } finally {
        setIsUploading(false);
      }
    }

    execute({
      ...data,
      files: allFileUrls,
    });
  }

  const documentRegister = register("document");
  const phoneRegister = register("phone");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <FieldSet>
        <FieldLegend>Informações Pessoais</FieldLegend>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <Input id="name" placeholder="Nome completo" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.contractType}>
            <FieldLabel>Tipo de contrato</FieldLabel>
            <Select
              value={selectedContractType || undefined}
              onValueChange={(value) => setValue("contractType", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar tipo de contrato..." />
              </SelectTrigger>
              <SelectContent>
                {ContractTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.contractType]} />
          </Field>

          <Field data-invalid={!!errors.document}>
            <FieldLabel htmlFor="document">Documento</FieldLabel>
            <Input
              id="document"
              placeholder="000.000.000-00"
              {...documentRegister}
              onChange={(event) => {
                event.target.value = applyCpfMask(event.target.value);
                documentRegister.onChange(event);
              }}
            />
            <FieldError errors={[errors.document]} />
          </Field>

          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="phone">Telefone</FieldLabel>
            <Input
              id="phone"
              placeholder="(00) 00000-0000"
              {...phoneRegister}
              onChange={(event) => {
                event.target.value = applyPhoneMask(event.target.value);
                phoneRegister.onChange(event);
              }}
            />
            <FieldError errors={[errors.phone]} />
          </Field>
        </div>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Dados Financeiros</FieldLegend>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
          <Field data-invalid={!!errors.mainPixKey}>
            <FieldLabel htmlFor="mainPixKey">Chave Pix principal</FieldLabel>
            <Input id="mainPixKey" placeholder="Digite a chave Pix principal" {...register("mainPixKey")} />
            <FieldError errors={[errors.mainPixKey]} />
          </Field>

          <Field data-invalid={!!errors.secondPixKey}>
            <FieldLabel
              htmlFor="secondPixKey"
              className={(mainPixKey ?? "").trim().length === 0 ? "opacity-50" : undefined}
            >
              Chave Pix secundária
            </FieldLabel>
            <Input
              id="secondPixKey"
              placeholder="Digite a chave Pix secundária"
              disabled={(mainPixKey ?? "").trim().length === 0}
              {...register("secondPixKey")}
            />
            <FieldError errors={[errors.secondPixKey]} />
          </Field>

          <Field data-invalid={!!errors.thridPixKey}>
            <FieldLabel
              htmlFor="thridPixKey"
              className={(secondPixKey ?? "").trim().length === 0 ? "opacity-50" : undefined}
            >
              Chave Pix terciária
            </FieldLabel>
            <Input
              id="thridPixKey"
              placeholder="Digite a chave Pix terciária"
              disabled={(secondPixKey ?? "").trim().length === 0}
              {...register("thridPixKey")}
            />
            <FieldError errors={[errors.thridPixKey]} />
          </Field>

          <Field data-invalid={!!errors.account}>
            <FieldLabel htmlFor="account">Conta</FieldLabel>
            <Input id="account" placeholder="Número da conta" {...register("account")} />
            <FieldError errors={[errors.account]} />
          </Field>

          <Field data-invalid={!!errors.agency}>
            <FieldLabel htmlFor="agency">Agência</FieldLabel>
            <Input id="agency" placeholder="Número da agência" {...register("agency")} />
            <FieldError errors={[errors.agency]} />
          </Field>
        </div>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Veículo</FieldLegend>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
          <Field data-invalid={!!errors.vehicleModel}>
            <FieldLabel>Modelo do veículo</FieldLabel>
            <Select
              value={selectedVehicleModel || undefined}
              onValueChange={(value) => setValue("vehicleModel", value === EMPTY_SELECT_VALUE ? "" : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar modelo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Não informado</SelectItem>
                {vehicleTypesConst.map((vehicleType) => (
                  <SelectItem key={vehicleType} value={vehicleType}>
                    {vehicleType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.vehicleModel]} />
          </Field>

          <Field data-invalid={!!errors.vehicleColor}>
            <FieldLabel>Cor do veículo</FieldLabel>
            <Select
              value={selectedVehicleColor || undefined}
              onValueChange={(value) => setValue("vehicleColor", value === EMPTY_SELECT_VALUE ? "" : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar cor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Não informado</SelectItem>
                {colorsConst.map((color) => (
                  <SelectItem key={color} value={color}>
                    {color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.vehicleColor]} />
          </Field>

          <Field data-invalid={!!errors.vehiclePlate}>
            <FieldLabel htmlFor="vehiclePlate">Placa</FieldLabel>
            <Input id="vehiclePlate" placeholder="ABC1D23" {...register("vehiclePlate")} />
            <FieldError errors={[errors.vehiclePlate]} />
          </Field>
        </div>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Documentos</FieldLegend>
        <Field className="grid gap-3">
          <FieldLabel>Arquivos</FieldLabel>
          <FileInput value={formFiles} onChange={setFormFiles} />
        </Field>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Localização</FieldLegend>
        <Field data-invalid={!!errors.regionId}>
          <FieldLabel>Região</FieldLabel>
          <Select
            value={selectedRegionId || undefined}
            onValueChange={(value) => setValue("regionId", value === EMPTY_SELECT_VALUE ? "" : value)}
          >
            <SelectTrigger className="w-full md:max-w-sm">
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
      </FieldSet>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" isLoading={isExecuting || isUploading}>
        {isEditing ? "Salvar Alterações" : "Criar Entregador"}
      </Button>
    </form>
  );
}

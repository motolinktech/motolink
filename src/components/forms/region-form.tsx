"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mutateRegionAction } from "@/modules/regions/regions-actions";
import { type RegionFormInput, regionFormSchema } from "@/modules/regions/regions-types";

interface RegionFormProps {
  defaultValues?: Partial<RegionFormInput>;
  isEditing?: boolean;
  redirectTo?: string;
}

export function RegionForm({ defaultValues, isEditing, redirectTo }: RegionFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegionFormInput>({
    resolver: zodResolver(regionFormSchema),
    defaultValues: {
      id: defaultValues?.id,
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
    },
  });

  const { execute, isExecuting } = useAction(mutateRegionAction, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        setServerError(data.error);
        toast.error(data.error);
        return;
      }

      if (data?.success) {
        toast.success(isEditing ? "Região atualizada." : "Região criada.");
        if (redirectTo) {
          router.push(redirectTo);
        }
      }
    },
    onError: () => {
      setServerError("Ocorreu um erro inesperado.");
    },
  });

  function onSubmit(data: RegionFormInput) {
    setServerError(null);
    execute(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <FieldSet>
        <FieldLegend>Informações da Região</FieldLegend>
        <div className="grid grid-cols-1 gap-7">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <Input id="name" placeholder="Nome da região" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="description">Descrição</FieldLabel>
            <Textarea id="description" placeholder="Descrição da região (opcional)" {...register("description")} />
            <FieldError errors={[errors.description]} />
          </Field>
        </div>
      </FieldSet>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" isLoading={isExecuting}>
        {isEditing ? "Salvar Alterações" : "Criar Região"}
      </Button>
    </form>
  );
}

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
import { mutateGroupAction } from "@/modules/groups/groups-actions";
import { type GroupFormInput, groupFormSchema } from "@/modules/groups/groups-types";

interface GroupFormProps {
  defaultValues?: Partial<GroupFormInput>;
  isEditing?: boolean;
  redirectTo?: string;
}

export function GroupForm({ defaultValues, isEditing, redirectTo }: GroupFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GroupFormInput>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      id: defaultValues?.id,
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
    },
  });

  const { execute, isExecuting } = useAction(mutateGroupAction, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        setServerError(data.error);
        toast.error(data.error);
        return;
      }

      if (data?.success) {
        toast.success(isEditing ? "Grupo atualizado." : "Grupo criado.");
        if (redirectTo) {
          router.push(redirectTo);
        }
      }
    },
    onError: () => {
      setServerError("Ocorreu um erro inesperado.");
    },
  });

  function onSubmit(data: GroupFormInput) {
    setServerError(null);
    execute(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <FieldSet>
        <FieldLegend>Informações do Grupo</FieldLegend>
        <div className="grid grid-cols-1 gap-7">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <Input id="name" placeholder="Nome do grupo" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="description">Descrição</FieldLabel>
            <Textarea id="description" placeholder="Descrição do grupo (opcional)" {...register("description")} />
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
        {isEditing ? "Salvar Alterações" : "Criar Grupo"}
      </Button>
    </form>
  );
}

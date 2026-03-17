"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changePasswordAction } from "@/modules/users/users-actions";
import { type ChangePasswordFormSchema, changePasswordFormSchema } from "@/modules/users/users-types";

interface ChangePasswordFormProps {
  userId: string;
}

function ChangePasswordForm({ userId }: ChangePasswordFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormSchema>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      userId,
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const { execute, isExecuting } = useAction(changePasswordAction, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        setServerError(data.error);
        toast.error(data.error);
        return;
      }

      if (data?.success) {
        setServerError(null);
        toast.success("Senha alterada com sucesso!");
        reset();
      }
    },
    onError: () => {
      setServerError("Ocorreu um erro inesperado.");
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => execute(data))} className="flex max-w-md flex-col gap-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Field data-invalid={!!errors.oldPassword}>
        <FieldLabel htmlFor="oldPassword">Senha atual</FieldLabel>
        <Input id="oldPassword" type="password" placeholder="********" {...register("oldPassword")} />
        <FieldError errors={[errors.oldPassword]} />
      </Field>

      <Field data-invalid={!!errors.newPassword}>
        <FieldLabel htmlFor="newPassword">Nova senha</FieldLabel>
        <Input id="newPassword" type="password" placeholder="********" {...register("newPassword")} />
        <FieldError errors={[errors.newPassword]} />
      </Field>

      <Field data-invalid={!!errors.confirmNewPassword}>
        <FieldLabel htmlFor="confirmNewPassword">Confirmar nova senha</FieldLabel>
        <Input id="confirmNewPassword" type="password" placeholder="********" {...register("confirmNewPassword")} />
        <FieldError errors={[errors.confirmNewPassword]} />
      </Field>

      <Button type="submit" isLoading={isExecuting} className="self-start">
        Alterar senha
      </Button>
    </form>
  );
}

export { ChangePasswordForm };

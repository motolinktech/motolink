"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction } from "@/modules/users/users-actions";
import { type ForgotPasswordDTO, forgotPasswordSchema } from "@/modules/users/users-types";

function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordDTO>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  const { execute, result, isExecuting } = useAction(forgotPasswordAction, {
    onSuccess: () => setSubmitted(true),
  });
  const actionError = result.data?.error;

  if (submitted) {
    return (
      <Alert>
        <CheckCircleIcon />
        <AlertDescription>
          Se o e-mail estiver cadastrado, enviaremos uma mensagem no WhatsApp com instruções para redefinir sua senha.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit((data) => execute(data))} className="flex flex-col gap-6">
      {actionError && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="email">E-mail</FieldLabel>
        <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} />
        <FieldError errors={[errors.email]} />
      </Field>

      <Button type="submit" isLoading={isExecuting}>
        Enviar
      </Button>
    </form>
  );
}

export { ForgotPasswordForm };

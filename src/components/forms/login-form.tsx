"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createSessionAction } from "@/modules/sessions/sessions-actions";
import { type CreateSessionDTO, createSessionSchema } from "@/modules/sessions/sessions-types";

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSessionDTO>({
    resolver: zodResolver(createSessionSchema),
  });
  const { execute, result, isExecuting } = useAction(createSessionAction);
  const actionError = result.data?.reason;

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

      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="password">Senha</FieldLabel>
        <Input id="password" type="password" placeholder="********" {...register("password")} />
        <FieldError errors={[errors.password]} />
      </Field>

      <Button type="submit" isLoading={isExecuting}>
        Entrar
      </Button>
    </form>
  );
}

export { LoginForm };

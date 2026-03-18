"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { updateWorkShiftSlotTimesAction } from "@/modules/work-shift-slots/work-shift-slots-actions";
import { formatWorkShiftCheckTime } from "@/utils/format-work-shift-check-time";
import { applyTimeMask } from "@/utils/masks/time-mask";

const formSchema = z.object({
  checkInAt: z.string(),
  checkOutAt: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface WorkShiftSlotTimesFormProps {
  slotId: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  onSuccess?: () => void;
}

function parseTimeDefault(val: string | null | undefined): string {
  return formatWorkShiftCheckTime(val);
}

export function WorkShiftSlotTimesForm({ slotId, checkInAt, checkOutAt, onSuccess }: WorkShiftSlotTimesFormProps) {
  const { executeAsync, isExecuting } = useAction(updateWorkShiftSlotTimesAction);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      checkInAt: parseTimeDefault(checkInAt),
      checkOutAt: parseTimeDefault(checkOutAt),
    },
  });

  const onSubmit = async (values: FormValues) => {
    const result = await executeAsync({
      id: slotId,
      checkInAt: values.checkInAt || null,
      checkOutAt: values.checkOutAt || null,
    });

    if (result?.data?.error) {
      toast.error(result.data.error);
      return;
    }

    toast.success("Horários atualizados com sucesso");
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field>
        <FieldLabel>Entrada (check-in)</FieldLabel>
        <Controller
          name="checkInAt"
          control={control}
          render={({ field }) => (
            <Input {...field} placeholder="HH:mm" onChange={(e) => field.onChange(applyTimeMask(e.target.value))} />
          )}
        />
        {errors.checkInAt && <FieldError>{errors.checkInAt.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel>Saída (check-out)</FieldLabel>
        <Controller
          name="checkOutAt"
          control={control}
          render={({ field }) => (
            <Input {...field} placeholder="HH:mm" onChange={(e) => field.onChange(applyTimeMask(e.target.value))} />
          )}
        />
        {errors.checkOutAt && <FieldError>{errors.checkOutAt.message}</FieldError>}
      </Field>

      <Button type="submit" disabled={isExecuting} className="w-full">
        {isExecuting && <Spinner className="mr-1 size-3" />}
        Salvar horários
      </Button>
    </form>
  );
}

"use client";

import { useAction } from "next-safe-action/hooks";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { updatePaymentRequestAction } from "@/modules/payment-requests/payment-requests-actions";
import { applyMoneyMask } from "@/utils/masks/money-mask";

export interface PaymentRequestFormItem {
  id: string;
  amount: number;
  discount: number;
  discountReason?: string | null;
  additionalTax: number;
  taxReason?: string | null;
}

interface FormValues {
  amount: number;
  discount: number;
  discountReason: string;
  additionalTax: number;
  taxReason: string;
}

interface PaymentRequestFormProps {
  item: PaymentRequestFormItem;
  onSuccess: () => void;
}

function toMoneyDisplay(value: number): string {
  if (!value) return "";
  const cents = Math.round(value * 100);
  return applyMoneyMask(String(cents));
}

function parseMoneyToNumber(masked: string): number {
  const digits = masked.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

export function PaymentRequestForm({ item, onSuccess }: PaymentRequestFormProps) {
  const { executeAsync, isExecuting } = useAction(updatePaymentRequestAction);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    values: {
      amount: item.amount,
      discount: item.discount,
      discountReason: item.discountReason ?? "",
      additionalTax: item.additionalTax,
      taxReason: item.taxReason ?? "",
    },
  });

  const amountValue = useWatch({ control, name: "amount" });
  const discountValue = useWatch({ control, name: "discount" });
  const additionalTaxValue = useWatch({ control, name: "additionalTax" });

  const total = (amountValue ?? 0) - (discountValue ?? 0) + (additionalTaxValue ?? 0);

  async function onSubmit(data: FormValues) {
    const result = await executeAsync({
      id: item.id,
      amount: data.amount,
      discount: data.discount,
      discountReason: data.discountReason || null,
      additionalTax: data.additionalTax,
      taxReason: data.taxReason || null,
    });

    if (result?.data?.error) {
      toast.error(result.data.error);
      return;
    }

    toast.success("Solicitação atualizada com sucesso");
    reset();
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Valor</Label>
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <Input
              id="amount"
              placeholder="R$ 0,00"
              value={toMoneyDisplay(field.value)}
              onChange={(e) => field.onChange(parseMoneyToNumber(e.target.value))}
            />
          )}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="discount">Desconto</Label>
        <Controller
          name="discount"
          control={control}
          render={({ field }) => (
            <Input
              id="discount"
              placeholder="R$ 0,00"
              value={toMoneyDisplay(field.value)}
              onChange={(e) => {
                const num = parseMoneyToNumber(e.target.value);
                field.onChange(num);
                if (num === 0) setValue("discountReason", "");
              }}
            />
          )}
        />
      </div>

      {discountValue > 0 && (
        <div className="space-y-2">
          <Label htmlFor="discountReason">
            Motivo do desconto <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="discountReason"
            control={control}
            rules={{ required: "Informe o motivo do desconto" }}
            render={({ field }) => <Textarea id="discountReason" rows={2} {...field} />}
          />
          {errors.discountReason && <p className="text-xs text-destructive">{errors.discountReason.message}</p>}
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="additionalTax">Taxa adicional</Label>
        <Controller
          name="additionalTax"
          control={control}
          render={({ field }) => (
            <Input
              id="additionalTax"
              placeholder="R$ 0,00"
              value={toMoneyDisplay(field.value)}
              onChange={(e) => {
                const num = parseMoneyToNumber(e.target.value);
                field.onChange(num);
                if (num === 0) setValue("taxReason", "");
              }}
            />
          )}
        />
      </div>

      {additionalTaxValue > 0 && (
        <div className="space-y-2">
          <Label htmlFor="taxReason">
            Motivo da taxa <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="taxReason"
            control={control}
            rules={{ required: "Informe o motivo da taxa adicional" }}
            render={({ field }) => <Textarea id="taxReason" rows={2} {...field} />}
          />
          {errors.taxReason && <p className="text-xs text-destructive">{errors.taxReason.message}</p>}
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between text-sm font-medium">
        <span className="text-muted-foreground">Total a pagar</span>
        <span>{toMoneyDisplay(total) || "R$ 0,00"}</span>
      </div>

      <Button type="submit" className="w-full" disabled={isExecuting}>
        {isExecuting && <Spinner className="mr-1 size-3" />}
        Salvar
      </Button>
    </form>
  );
}

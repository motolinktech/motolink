"use client";

import type { PaymentRequestFormItem } from "@/components/forms/payment-request-form";
import { PaymentRequestForm } from "@/components/forms/payment-request-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface PaymentRequestEditSheetProps {
  item: PaymentRequestFormItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PaymentRequestEditSheet({ item, open, onOpenChange, onSuccess }: PaymentRequestEditSheetProps) {
  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar solicitação</SheetTitle>
        </SheetHeader>
        <PaymentRequestForm item={item} onSuccess={onSuccess} />
      </SheetContent>
    </Sheet>
  );
}

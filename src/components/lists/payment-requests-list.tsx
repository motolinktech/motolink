"use client";

import dayjs from "dayjs";
import {
  ArrowRightIcon,
  BuildingIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  InfoIcon,
  PencilIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PAYMENT_REQUEST_STATUS_LABELS,
  type PaymentRequestStatus,
  paymentRequestStatusTransitions,
} from "@/constants/payment-request-status";
import { cn } from "@/lib/cn";
import { updatePaymentRequestStatusAction } from "@/modules/payment-requests/payment-requests-actions";
import { formatMoneyDisplay } from "@/utils/masks/money-mask";
import { Text } from "../ui/text";

export interface PaymentRequestListItem {
  id: string;
  amount: number;
  discount: number;
  discountReason?: string | null;
  additionalTax: number;
  taxReason?: string | null;
  status: string;
  deliveryman?: { id: string; name: string } | null;
  workShiftSlot?: { id: string; shiftDate: string | Date; client?: { id: string; name: string } | null } | null;
}

interface PaymentRequestsListProps {
  items: PaymentRequestListItem[];
  onViewDetails: (item: PaymentRequestListItem) => void;
  onEdit: (item: PaymentRequestListItem) => void;
  userRole?: string;
}

const TERMINAL_STATUSES = new Set<string>(["PAID", "REJECTED", "CANCELLED"]);
const PAYMENT_REQUEST_STATUS_SURFACE: Record<PaymentRequestStatus, string> = {
  NEW: "border-l-amber-400",
  APPROVED: "border-l-blue-500",
  REJECTED: "border-l-red-400",
  CANCELLED: "border-l-slate-400",
  PAID: "border-l-emerald-500",
  EDITED: "border-l-orange-400",
  EDITION_APPROVED: "border-l-teal-500",
};

const PAYMENT_REQUEST_STATUS_BADGE: Record<PaymentRequestStatus, string> = {
  NEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  CANCELLED: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  EDITED: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  EDITION_APPROVED: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
};

function getInitials(name?: string | null): string {
  if (!name) return "—";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PaymentRequestsList({ items, onViewDetails, onEdit, userRole }: PaymentRequestsListProps) {
  const [statusTarget, setStatusTarget] = useState<{ item: PaymentRequestListItem; status: string } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PaymentRequestListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdvanceStatus() {
    if (!statusTarget) return;
    startTransition(async () => {
      const result = await updatePaymentRequestStatusAction({ id: statusTarget.item.id, status: statusTarget.status });
      if (result?.data?.error) {
        toast.error(result.data.error);
      } else {
        toast.success(
          `Status atualizado para ${PAYMENT_REQUEST_STATUS_LABELS[statusTarget.status as PaymentRequestStatus] ?? statusTarget.status}`,
        );
      }
      setStatusTarget(null);
    });
  }

  function handleCancel() {
    if (!cancelTarget) return;
    startTransition(async () => {
      const result = await updatePaymentRequestStatusAction({ id: cancelTarget.id, status: "CANCELLED" });
      if (result?.data?.error) {
        toast.error(result.data.error);
      } else {
        toast.success("Solicitação cancelada");
      }
      setCancelTarget(null);
    });
  }

  if (items.length === 0) {
    return (
      <Alert>
        <InfoIcon />
        <AlertTitle>Nenhum registro</AlertTitle>
        <AlertDescription>Nenhuma solicitação de pagamento encontrada.</AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {items.map((item) => {
          const status = item.status as PaymentRequestStatus;
          const isTerminal = TERMINAL_STATUSES.has(status);
          const transitions = paymentRequestStatusTransitions[status] ?? [];
          const primaryTransition = transitions[0] as PaymentRequestStatus | undefined;
          const statusLabel = PAYMENT_REQUEST_STATUS_LABELS[status] ?? item.status;
          const statusSurface = PAYMENT_REQUEST_STATUS_SURFACE[status] ?? "border-l-primary bg-muted/40";
          const statusBadge = PAYMENT_REQUEST_STATUS_BADGE[status] ?? "bg-muted text-foreground";
          const canChangeStatus = !(status === "EDITED" && userRole !== "ADMIN");
          const netTotal = item.amount - item.discount + item.additionalTax;
          const shiftDate = item.workShiftSlot?.shiftDate
            ? dayjs(item.workShiftSlot.shiftDate).format("DD/MM/YYYY")
            : "—";
          const deliverymanName = item.deliveryman?.name ?? "Sem colaborador";

          return (
            <Card
              key={item.id}
              className="overflow-hidden border-border/70 bg-card py-0 shadow-none transition-colors hover:bg-muted/10"
            >
              <CardContent className="p-0">
                <div
                  className={cn(
                    "flex flex-col gap-2.5 border-l-4 bg-card px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-3",
                    statusSurface,
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="mt-0.5">
                      <AvatarFallback className="bg-background text-foreground">
                        {getInitials(deliverymanName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 space-y-1.5 lg:border-r border-border/70 pr-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="min-w-0 truncate text-sm font-semibold text-foreground">{deliverymanName}</p>
                        <Badge variant="outline" className={cn("border-0 text-[11px] shadow-none", statusBadge)}>
                          {statusLabel}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <BuildingIcon className="size-3.5" />
                          {item.workShiftSlot?.client?.name ?? "Sem cliente"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-1 rounded-full bg-current opacity-50" />
                          Turno: {shiftDate}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0 text-center md:text-center flex-col items-center justify-center">
                      <Text variant="muted" className="text-xs">
                        Valor líquido
                      </Text>
                      <Text variant="small">{formatMoneyDisplay(netTotal)}</Text>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:min-w-[300px] md:justify-end">
                    <div className="flex shrink-0 items-center gap-1">
                      {primaryTransition && canChangeStatus && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isTerminal || isPending}
                              onClick={() => setStatusTarget({ item, status: primaryTransition })}
                              className="border-border/70 bg-background"
                            >
                              <ArrowRightIcon className="size-4" />
                              {PAYMENT_REQUEST_STATUS_LABELS[primaryTransition]}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Avançar status</TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon-sm" onClick={() => onViewDetails(item)}>
                            <EyeIcon />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver detalhes</TooltipContent>
                      </Tooltip>

                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <EllipsisVerticalIcon />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Mais ações</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-44">
                          {!isTerminal && (
                            <>
                              <DropdownMenuItem onClick={() => onEdit(item)}>
                                <PencilIcon className="mr-2 size-4" />
                                Editar
                              </DropdownMenuItem>
                              {canChangeStatus && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem variant="destructive" onClick={() => setCancelTarget(item)}>
                                    <XIcon className="mr-2 size-4" />
                                    Cancelar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <p className="text-center text-xs text-muted-foreground">Total de {items.length} solicitação(ões)</p>
      </div>

      <AlertDialog
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar o status para{" "}
              {statusTarget
                ? (PAYMENT_REQUEST_STATUS_LABELS[statusTarget.status as PaymentRequestStatus] ?? statusTarget.status)
                : ""}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleAdvanceStatus}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta solicitação de pagamento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isPending} onClick={handleCancel}>
              Cancelar solicitação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

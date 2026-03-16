"use client";

import { AlertTriangleIcon, Building2Icon, ShieldCheckIcon, Undo2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import { unbanDeliverymanAction } from "@/modules/client-blocks/client-blocks-actions";

interface DeliverymanBanHistorySectionProps {
  deliverymanId: string;
  items: Array<{
    id: string;
    clientId: string;
    clientName: string;
    reason: string | null;
    createdAt: string;
    removedAt: string | null;
    isActive: boolean;
  }>;
  errorMessage?: string;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DeliverymanBanHistorySection({
  deliverymanId,
  items,
  errorMessage,
}: DeliverymanBanHistorySectionProps) {
  const router = useRouter();
  const [targetBanId, setTargetBanId] = useState<string | null>(null);
  const { executeAsync, isExecuting } = useAction(unbanDeliverymanAction);

  const selectedBan = useMemo(() => items.find((item) => item.id === targetBanId) ?? null, [items, targetBanId]);
  const activeCount = items.filter((item) => item.isActive).length;
  const removedCount = items.length - activeCount;

  async function handleUnban() {
    if (!selectedBan) return;

    const result = await executeAsync({
      deliverymanId,
      clientId: selectedBan.clientId,
    });

    if (result?.data?.error || result?.serverError) {
      toast.error(result.data?.error ?? "Não foi possível remover o banimento");
      return;
    }

    toast.success("Banimento removido com sucesso");
    setTargetBanId(null);
    router.refresh();
  }

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <Heading variant="h3">Banimentos</Heading>
            <CardDescription>
              Histórico completo de restrições por cliente, com motivo registrado e status atual.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={activeCount > 0 ? "destructive" : "secondary"}>{activeCount} ativos</Badge>
            <Badge variant="outline">{removedCount} removidos</Badge>
            <Badge variant="secondary">{items.length} registros</Badge>
          </div>
        </div>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>Não foi possível carregar o histórico</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {items.length === 0 ? (
          <Card className="border border-dashed bg-gradient-to-br from-card via-card to-muted/30">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="rounded-full border border-border/70 bg-background p-3 shadow-xs">
                <ShieldCheckIcon className="size-5 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <Text className="mt-0 font-medium">Nenhum banimento registrado</Text>
                <Text variant="muted" className="mt-0 max-w-2xl">
                  Este entregador não possui bloqueios por cliente. Quando houver um banimento, ele aparecerá aqui com o
                  motivo e a evolução do status.
                </Text>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <Card
                key={item.id}
                className={cn(
                  "overflow-hidden border transition-colors",
                  item.isActive
                    ? "border-destructive/30 bg-gradient-to-br from-destructive/5 via-card to-card"
                    : "border-border/70 bg-gradient-to-br from-card via-card to-muted/20",
                )}
              >
                <CardContent className="space-y-3 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={item.isActive ? "destructive" : "secondary"}>
                          {item.isActive ? "Banimento ativo" : "Banimento removido"}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2Icon className="size-4" />
                          <span>{item.clientName}</span>
                        </div>
                      </div>
                      <Text className="mt-0 leading-6">{item.reason?.trim() || "Motivo não informado."}</Text>
                    </div>
                    {item.isActive ? (
                      <Button variant="outline" size="sm" onClick={() => setTargetBanId(item.id)}>
                        <Undo2Icon data-icon="inline-start" />
                        Desbanir
                      </Button>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                        <ShieldCheckIcon className="size-4 text-emerald-600" />
                        Encerrado
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span>Aplicado em {formatDateTime(item.createdAt)}</span>
                    {item.removedAt ? <span>Removido em {formatDateTime(item.removedAt)}</span> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={!!selectedBan} onOpenChange={(open) => !open && setTargetBanId(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover banimento</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBan
                ? `Deseja remover o banimento de ${selectedBan.clientName}? O entregador voltará a poder ser sugerido e escalado para este cliente.`
                : "Confirme a remoção do banimento."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExecuting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isExecuting} onClick={handleUnban}>
              Desbanir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

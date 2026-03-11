"use client";

import { PencilIcon, ShieldBanIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { deleteDeliverymanAction, toggleBlockDeliverymanAction } from "@/modules/deliverymen/deliverymen-actions";

interface DeliverymanDetailActionsProps {
  deliverymanId: string;
  isBlocked: boolean;
}

export function DeliverymanDetailActions({ deliverymanId, isBlocked }: DeliverymanDetailActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDeliverymanAction(deliverymanId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Entregador excluído com sucesso");
        router.push("/gestao/entregadores");
      }

      setShowDeleteDialog(false);
    });
  }

  function handleToggleBlock() {
    startTransition(async () => {
      const result = await toggleBlockDeliverymanAction(deliverymanId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.isBlocked ? "Entregador bloqueado com sucesso" : "Entregador desbloqueado com sucesso");
        router.refresh();
      }

      setShowBlockDialog(false);
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/gestao/entregadores/${deliverymanId}/editar`}>
            <PencilIcon data-icon="inline-start" />
            Editar
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowBlockDialog(true)}>
          {isBlocked ? <ShieldCheckIcon data-icon="inline-start" /> : <ShieldBanIcon data-icon="inline-start" />}
          {isBlocked ? "Desbloquear" : "Bloquear"}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
          <Trash2Icon data-icon="inline-start" />
          Excluir
        </Button>
      </div>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{isBlocked ? "Desbloquear entregador" : "Bloquear entregador"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isBlocked
                ? "Tem certeza que deseja desbloquear este entregador?"
                : "Tem certeza que deseja bloquear este entregador?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleToggleBlock}>
              {isBlocked ? "Desbloquear" : "Bloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entregador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este entregador? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isPending} onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

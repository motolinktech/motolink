"use client";

import { EyeIcon, InfoIcon, PencilIcon, ShieldBanIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/composite/status-badge";
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
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { statusConst } from "@/constants/status";
import { deleteDeliverymanAction, toggleBlockDeliverymanAction } from "@/modules/deliverymen/deliverymen-actions";
import { applyCpfMask } from "@/utils/masks/cpf-mask";
import { applyPhoneMask } from "@/utils/masks/phone-mask";

interface DeliverymanTableItem {
  id: string;
  name: string;
  phone: string;
  document: string;
  isBlocked: boolean;
}

interface DeliverymenTableProps {
  deliverymen: DeliverymanTableItem[];
}

export function DeliverymenTable({ deliverymen }: DeliverymenTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<DeliverymanTableItem | null>(null);
  const [blockTarget, setBlockTarget] = useState<DeliverymanTableItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteDeliverymanAction(deleteTarget.id);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Entregador excluído com sucesso");
      }

      setDeleteTarget(null);
    });
  }

  function handleToggleBlock() {
    if (!blockTarget) return;

    startTransition(async () => {
      const result = await toggleBlockDeliverymanAction(blockTarget.id);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.isBlocked ? "Entregador bloqueado com sucesso" : "Entregador desbloqueado com sucesso");
      }

      setBlockTarget(null);
    });
  }

  if (deliverymen.length === 0) {
    return (
      <Alert>
        <InfoIcon />
        <AlertTitle>Nenhum registro</AlertTitle>
        <AlertDescription>Nenhum entregador cadastrado ainda.</AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-4/12">Nome</TableHead>
            <TableHead className="hidden w-3/12 md:table-cell">Telefone</TableHead>
            <TableHead className="hidden w-3/12 md:table-cell">Documento</TableHead>
            <TableHead className="hidden w-2/12 md:table-cell">Status</TableHead>
            <TableHead className="w-2/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliverymen.map((deliveryman) => (
            <TableRow key={deliveryman.id}>
              <TableCell className="truncate">{deliveryman.name}</TableCell>
              <TableCell className="hidden md:table-cell">{applyPhoneMask(deliveryman.phone)}</TableCell>
              <TableCell className="hidden md:table-cell">{applyCpfMask(deliveryman.document)}</TableCell>
              <TableCell className="hidden md:table-cell">
                <StatusBadge status={deliveryman.isBlocked ? statusConst.BLOCKED : statusConst.ACTIVE} />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/gestao/entregadores/${deliveryman.id}`}>
                          <EyeIcon />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ver detalhes</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/gestao/entregadores/${deliveryman.id}/editar`}>
                          <PencilIcon />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" onClick={() => setBlockTarget(deliveryman)}>
                        {deliveryman.isBlocked ? <ShieldCheckIcon /> : <ShieldBanIcon />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{deliveryman.isBlocked ? "Desbloquear" : "Bloquear"}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(deliveryman)}>
                        <Trash2Icon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableCaption>
          Total de {deliverymen.length} {deliverymen.length === 1 ? "entregador" : "entregadores"}
        </TableCaption>
      </Table>

      <AlertDialog
        open={!!blockTarget}
        onOpenChange={(open) => {
          if (!open) setBlockTarget(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blockTarget?.isBlocked ? "Desbloquear entregador" : "Bloquear entregador"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockTarget?.isBlocked
                ? "Tem certeza que deseja desbloquear este entregador?"
                : "Tem certeza que deseja bloquear este entregador?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleToggleBlock}>
              {blockTarget?.isBlocked ? "Desbloquear" : "Bloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
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
    </TooltipProvider>
  );
}

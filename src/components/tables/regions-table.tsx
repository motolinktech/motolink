"use client";

import { EyeIcon, InfoIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteRegionAction } from "@/modules/regions/regions-actions";

interface Region {
  id: string;
  name: string;
  description: string | null;
}

interface RegionsTableProps {
  regions: Region[];
}

export function RegionsTable({ regions }: RegionsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Region | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteRegionAction(deleteTarget.id);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Região excluída com sucesso");
      }

      setDeleteTarget(null);
    });
  }

  if (regions.length === 0) {
    return (
      <Alert>
        <InfoIcon />
        <AlertTitle>Nenhum registro</AlertTitle>
        <AlertDescription>
          Nenhuma região cadastrada ainda. Clique em &quot;Adicionar região&quot; para começar.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-4/12">Nome</TableHead>
            <TableHead className="hidden w-5/12 md:table-cell">Descrição</TableHead>
            <TableHead className="w-3/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {regions.map((region) => (
            <TableRow key={region.id}>
              <TableCell className="truncate">{region.name}</TableCell>
              <TableCell className="hidden truncate md:table-cell">{region.description || "—"}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/gestao/regioes/${region.id}`}>
                          <EyeIcon />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ver detalhes</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/gestao/regioes/${region.id}/editar`}>
                          <PencilIcon />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(region)}>
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
          Total de {regions.length} {regions.length === 1 ? "região" : "regiões"}
        </TableCaption>
      </Table>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir região</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta região? Essa ação não pode ser desfeita.
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

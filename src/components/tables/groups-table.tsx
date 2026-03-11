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
import { deleteGroupAction } from "@/modules/groups/groups-actions";

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface GroupsTableProps {
  groups: Group[];
}

export function GroupsTable({ groups }: GroupsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteGroupAction(deleteTarget.id);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Grupo excluído com sucesso");
      }

      setDeleteTarget(null);
    });
  }

  if (groups.length === 0) {
    return (
      <Alert>
        <InfoIcon />
        <AlertTitle>Nenhum registro</AlertTitle>
        <AlertDescription>
          Nenhum grupo cadastrado ainda. Clique em &quot;Adicionar grupo&quot; para começar.
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
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="truncate">{group.name}</TableCell>
              <TableCell className="hidden truncate md:table-cell">{group.description || "—"}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/gestao/grupos/${group.id}`}>
                          <EyeIcon />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ver detalhes</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/gestao/grupos/${group.id}/editar`}>
                          <PencilIcon />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(group)}>
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
          Total de {groups.length} {groups.length === 1 ? "grupo" : "grupos"}
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
            <AlertDialogTitle>Excluir grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este grupo? Essa ação não pode ser desfeita.
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

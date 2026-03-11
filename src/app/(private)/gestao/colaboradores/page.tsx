import { AlertCircleIcon } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { ContentHeader } from "@/components/composite/content-header";
import { SelectSearch } from "@/components/composite/select-search";
import { TablePagination } from "@/components/composite/table-pagination";
import { TextSearch } from "@/components/composite/text-search";
import { UsersTable } from "@/components/tables/users-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cookieConst } from "@/constants/cookies";
import { statusConst } from "@/constants/status";
import { usersService } from "@/modules/users/users-service";

const statusOptions = [
  { value: statusConst.ACTIVE, label: "Ativo" },
  { value: statusConst.INACTIVE, label: "Inativo" },
  { value: statusConst.PENDING, label: "Pendente" },
  { value: statusConst.BLOCKED, label: "Bloqueado" },
];

interface ColaboradoresPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function ColaboradoresPage({ searchParams }: ColaboradoresPageProps) {
  const cookieStore = await cookies();
  const branchId = cookieStore.get(cookieConst.SELECTED_BRANCH)?.value;

  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const pageSize = Number(params?.pageSize) || 10;
  const search = params?.search ?? "";
  const status = params?.status;

  const result = await usersService().listAll({
    page,
    pageSize,
    search,
    branchId,
    status,
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      {result.isErr() && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{result.error.reason}</AlertDescription>
        </Alert>
      )}

      {result.isOk() && (
        <>
          <ContentHeader breadcrumbItems={[{ title: "Colaboradores" }]} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <TextSearch placeholder="Pesquisar colaboradores..." />
              <SelectSearch options={statusOptions} placeholder="Todos os status" paramName="status" />
            </div>
            <Button asChild>
              <Link href="/gestao/colaboradores/novo">Adicionar colaborador</Link>
            </Button>
          </div>
          <UsersTable users={result.value.data} />
          <TablePagination
            page={result.value.pagination.page}
            pageSize={result.value.pagination.pageSize}
            totalPages={result.value.pagination.totalPages}
            currentSearch={search}
          />
        </>
      )}
    </main>
  );
}

import { AlertCircleIcon } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { ContentHeader } from "@/components/composite/content-header";
import { TablePagination } from "@/components/composite/table-pagination";
import { TextSearch } from "@/components/composite/text-search";
import { GroupsTable } from "@/components/tables/groups-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cookieConst } from "@/constants/cookies";
import { groupsService } from "@/modules/groups/groups-service";

interface GruposPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
  }>;
}

export default async function GruposPage({ searchParams }: GruposPageProps) {
  const cookieStore = await cookies();
  const branchId = cookieStore.get(cookieConst.SELECTED_BRANCH)?.value;

  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const pageSize = Number(params?.pageSize) || 10;
  const search = params?.search ?? "";

  const result = await groupsService().listAll({
    page,
    pageSize,
    search,
    branchId,
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
          <ContentHeader breadcrumbItems={[{ title: "Grupos" }]} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TextSearch placeholder="Pesquisar grupos..." />
            <Button asChild>
              <Link href="/gestao/grupos/novo">Adicionar grupo</Link>
            </Button>
          </div>
          <GroupsTable groups={result.value.data} />
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

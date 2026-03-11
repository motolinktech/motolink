import { cookies } from "next/headers";

import { ContentHeader } from "@/components/composite/content-header";
import { ClientForm } from "@/components/forms/client-form";
import { cookieConst } from "@/constants/cookies";
import { groupsService } from "@/modules/groups/groups-service";
import { regionsService } from "@/modules/regions/regions-service";

export default async function NovoClientePage() {
  const cookieStore = await cookies();
  const branchId = cookieStore.get(cookieConst.SELECTED_BRANCH)?.value;

  const [regionsResult, groupsResult] = await Promise.all([
    regionsService().listAll({ page: 1, pageSize: 100, branchId }),
    groupsService().listAll({ page: 1, pageSize: 100, branchId }),
  ]);

  const regions = regionsResult.isOk() ? regionsResult.value.data : [];
  const groups = groupsResult.isOk() ? groupsResult.value.data : [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader breadcrumbItems={[{ title: "Clientes", href: "/gestao/clientes" }, { title: "Novo Cliente" }]} />
      <ClientForm regions={regions} groups={groups} redirectTo="/gestao/clientes" />
    </main>
  );
}

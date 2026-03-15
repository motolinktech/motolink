import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { AccessDenied } from "@/components/composite/access-denied";
import { ContentHeader } from "@/components/composite/content-header";
import { MonitoringWeeklyContent } from "@/components/composite/monitoring-weekly-content";
import { clientsService } from "@/modules/clients/clients-service";
import { groupsService } from "@/modules/groups/groups-service";
import { checkPagePermission } from "@/utils/check-page-permission";

dayjs.extend(isoWeek);

interface MonitoramentoSemanalPageProps {
  searchParams: Promise<{
    group?: string;
    client?: string;
    week?: string;
  }>;
}

export default async function MonitoramentoSemanalPage({ searchParams }: MonitoramentoSemanalPageProps) {
  if (!(await checkPagePermission("operational.view"))) return <AccessDenied />;

  const params = await searchParams;
  const selectedGroupId = params.group || undefined;
  const selectedClientId = params.client || undefined;

  const requestedWeek = params.week ? dayjs(params.week) : dayjs();
  const weekReference = requestedWeek.isValid() ? requestedWeek : dayjs();
  const weekStart = weekReference.startOf("isoWeek").format("YYYY-MM-DD");

  const [selectedGroupResult, selectedClientResult] = await Promise.all([
    selectedGroupId ? groupsService().getById(selectedGroupId) : Promise.resolve(null),
    selectedClientId ? clientsService().getById(selectedClientId) : Promise.resolve(null),
  ]);

  const selectedGroupName =
    selectedGroupResult && "isOk" in selectedGroupResult && selectedGroupResult.isOk()
      ? selectedGroupResult.value.name
      : undefined;

  const selectedClientName =
    selectedClientResult && "isOk" in selectedClientResult && selectedClientResult.isOk()
      ? selectedClientResult.value.name
      : undefined;

  return (
    <main className="mx-auto max-w-7xl space-y-6 py-6">
      <ContentHeader
        breadcrumbItems={[
          { title: "Operacional", href: "/operacional/planejamento" },
          { title: "Monitoramento Semanal" },
        ]}
      />
      <MonitoringWeeklyContent
        selectedGroupId={selectedGroupId}
        selectedGroupName={selectedGroupName}
        selectedClientId={selectedClientId}
        selectedClientName={selectedClientName}
        weekStart={weekStart}
      />
    </main>
  );
}

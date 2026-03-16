import dayjs from "dayjs";
import { AccessDenied } from "@/components/composite/access-denied";
import { ContentHeader } from "@/components/composite/content-header";
import { FinanceiroContent } from "@/components/composite/financeiro-content";
import { clientsService } from "@/modules/clients/clients-service";
import { deliverymenService } from "@/modules/deliverymen/deliverymen-service";
import { paymentRequestsService } from "@/modules/payment-requests/payment-requests-service";
import type { PaymentRequestListQueryDTO } from "@/modules/payment-requests/payment-requests-types";
import { checkPagePermission } from "@/utils/check-page-permission";

interface ColaboradorIndependentePageProps {
  searchParams: Promise<{
    deliveryman?: string;
    client?: string;
    date?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function ColaboradorIndependentePage({ searchParams }: ColaboradorIndependentePageProps) {
  if (!(await checkPagePermission("financial.view"))) return <AccessDenied />;

  const params = await searchParams;
  const deliverymanId = params.deliveryman || undefined;
  const clientId = params.client || undefined;
  const date = params.date && dayjs(params.date).isValid() ? dayjs(params.date).format("YYYY-MM-DD") : undefined;
  const status = params.status as PaymentRequestListQueryDTO["status"];
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));

  const [deliverymanResult, clientResult, listResult] = await Promise.all([
    deliverymanId ? deliverymenService().getById(deliverymanId) : Promise.resolve(null),
    clientId ? clientsService().getById(clientId) : Promise.resolve(null),
    paymentRequestsService().listAll({
      page,
      pageSize,
      deliverymanId,
      clientId,
      status,
      date,
      contractType: "INDEPENDENT_COLLABORATOR",
    }),
  ]);

  const deliverymanName =
    deliverymanResult && "isOk" in deliverymanResult && deliverymanResult.isOk()
      ? deliverymanResult.value.name
      : undefined;

  const clientName =
    clientResult && "isOk" in clientResult && clientResult.isOk() ? clientResult.value.name : undefined;

  const { data, pagination } = listResult.isOk()
    ? listResult.value
    : { data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };

  return (
    <main className="mx-auto max-w-7xl space-y-6 py-6">
      <ContentHeader breadcrumbItems={[{ title: "Financeiro" }, { title: "Colaborador Independente" }]} />
      <FinanceiroContent
        initialData={data}
        initialPagination={pagination}
        selectedDeliverymanId={deliverymanId}
        selectedDeliverymanName={deliverymanName}
        selectedClientId={clientId}
        selectedClientName={clientName}
        selectedDate={date}
        selectedStatus={status}
      />
    </main>
  );
}

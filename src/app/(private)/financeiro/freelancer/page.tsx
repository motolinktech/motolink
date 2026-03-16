import dayjs from "dayjs";
import { cookies } from "next/headers";
import { AccessDenied } from "@/components/composite/access-denied";
import { ContentHeader } from "@/components/composite/content-header";
import { FinanceiroContent } from "@/components/composite/financeiro-content";
import { cookieConst } from "@/constants/cookies";
import { clientsService } from "@/modules/clients/clients-service";
import { deliverymenService } from "@/modules/deliverymen/deliverymen-service";
import { paymentRequestsService } from "@/modules/payment-requests/payment-requests-service";
import type { PaymentRequestListQueryDTO } from "@/modules/payment-requests/payment-requests-types";
import { usersService } from "@/modules/users/users-service";
import { checkPagePermission } from "@/utils/check-page-permission";

interface FreelancerPageProps {
  searchParams: Promise<{
    deliveryman?: string;
    client?: string;
    date?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function FreelancerPage({ searchParams }: FreelancerPageProps) {
  if (!(await checkPagePermission("financial.view"))) return <AccessDenied />;

  const params = await searchParams;
  const deliverymanId = params.deliveryman || undefined;
  const clientId = params.client || undefined;
  const date = params.date && dayjs(params.date).isValid() ? dayjs(params.date).format("YYYY-MM-DD") : undefined;
  const status = params.status as PaymentRequestListQueryDTO["status"];
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));

  const cookieStore = await cookies();
  const loggedUserId = cookieStore.get(cookieConst.USER_ID)?.value;

  const [deliverymanResult, clientResult, listResult, userResult] = await Promise.all([
    deliverymanId ? deliverymenService().getById(deliverymanId) : Promise.resolve(null),
    clientId ? clientsService().getById(clientId) : Promise.resolve(null),
    paymentRequestsService().listAll({
      page,
      pageSize,
      deliverymanId,
      clientId,
      status,
      date,
      contractType: "FREELANCER",
    }),
    loggedUserId ? usersService().getById(loggedUserId) : Promise.resolve(null),
  ]);

  const deliverymanName =
    deliverymanResult && "isOk" in deliverymanResult && deliverymanResult.isOk()
      ? deliverymanResult.value.name
      : undefined;

  const clientName =
    clientResult && "isOk" in clientResult && clientResult.isOk() ? clientResult.value.name : undefined;

  const userRole = userResult && "isOk" in userResult && userResult.isOk() ? userResult.value?.role : undefined;

  const { data, pagination } = listResult.isOk()
    ? listResult.value
    : { data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };

  return (
    <main className="mx-auto max-w-7xl space-y-6 py-6">
      <ContentHeader breadcrumbItems={[{ title: "Financeiro" }, { title: "Freelancer" }]} />
      <FinanceiroContent
        initialData={data}
        initialPagination={pagination}
        selectedDeliverymanId={deliverymanId}
        selectedDeliverymanName={deliverymanName}
        selectedClientId={clientId}
        selectedClientName={clientName}
        selectedDate={date}
        selectedStatus={status}
        userRole={userRole}
      />
    </main>
  );
}

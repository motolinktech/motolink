import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ContentHeader } from "@/components/composite/content-header";
import { DeliverymanForm } from "@/components/forms/deliveryman-form";
import { cookieConst } from "@/constants/cookies";
import { deliverymenService } from "@/modules/deliverymen/deliverymen-service";
import { regionsService } from "@/modules/regions/regions-service";
import { applyCpfMask } from "@/utils/masks/cpf-mask";
import { applyPhoneMask } from "@/utils/masks/phone-mask";

interface EditarEntregadorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarEntregadorPage({ params }: EditarEntregadorPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const branchId = cookieStore.get(cookieConst.SELECTED_BRANCH)?.value;

  const [deliverymanResult, regionsResult] = await Promise.all([
    deliverymenService().getById(id),
    regionsService().listAll({ page: 1, pageSize: 100, branchId }),
  ]);

  if (deliverymanResult.isErr() || !deliverymanResult.value) {
    notFound();
  }

  const deliveryman = deliverymanResult.value;
  const regions = regionsResult.isOk() ? regionsResult.value.data : [];

  const defaultValues = {
    id: deliveryman.id,
    name: deliveryman.name,
    document: applyCpfMask(deliveryman.document),
    phone: applyPhoneMask(deliveryman.phone),
    contractType: deliveryman.contractType,
    mainPixKey: deliveryman.mainPixKey,
    secondPixKey: deliveryman.secondPixKey ?? "",
    thridPixKey: deliveryman.thridPixKey ?? "",
    agency: deliveryman.agency ?? "",
    account: deliveryman.account ?? "",
    vehicleModel: deliveryman.vehicleModel ?? "",
    vehiclePlate: deliveryman.vehiclePlate ?? "",
    vehicleColor: deliveryman.vehicleColor ?? "",
    files: deliveryman.files ?? [],
    regionId: deliveryman.regionId ?? "",
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader
        breadcrumbItems={[
          { title: "Entregadores", href: "/gestao/entregadores" },
          { title: deliveryman.name, href: `/gestao/entregadores/${id}` },
          { title: "Editar" },
        ]}
      />
      <DeliverymanForm
        regions={regions}
        defaultValues={defaultValues}
        isEditing
        redirectTo={`/gestao/entregadores/${id}`}
      />
    </main>
  );
}

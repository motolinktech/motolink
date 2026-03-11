import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/composite/content-header";
import { DeliverymanDetailActions } from "@/components/composite/deliveryman-detail-actions";
import { StatusBadge } from "@/components/composite/status-badge";
import { Badge } from "@/components/ui/badge";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { ContractTypeOptions } from "@/constants/contract-type";
import { statusConst } from "@/constants/status";
import { deliverymenService } from "@/modules/deliverymen/deliverymen-service";
import { regionsService } from "@/modules/regions/regions-service";
import { applyCpfMask } from "@/utils/masks/cpf-mask";
import { applyPhoneMask } from "@/utils/masks/phone-mask";

interface EntregadorPageProps {
  params: Promise<{ id: string }>;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Text variant="muted">{label}</Text>
      <Text>{children}</Text>
    </div>
  );
}

function getContractTypeLabel(contractType: string) {
  return ContractTypeOptions.find((option) => option.value === contractType)?.label ?? contractType;
}

function getFileLabel(fileUrl: string, index: number) {
  try {
    const pathname = new URL(fileUrl).pathname;
    const fileName = decodeURIComponent(pathname.split("/").pop() ?? "");
    return fileName || `Documento ${index + 1}`;
  } catch {
    return `Documento ${index + 1}`;
  }
}

export default async function EntregadorPage({ params }: EntregadorPageProps) {
  const { id } = await params;

  const [deliverymanResult, regionsResult] = await Promise.all([
    deliverymenService().getById(id),
    regionsService().listAll({ page: 1, pageSize: 100 }),
  ]);

  if (deliverymanResult.isErr()) {
    notFound();
  }

  const deliveryman = deliverymanResult.value;

  if (!deliveryman) {
    notFound();
  }

  const regionMap = new Map(
    regionsResult.isOk() ? regionsResult.value.data.map((region) => [region.id, region.name]) : [],
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader
        breadcrumbItems={[{ title: "Entregadores", href: "/gestao/entregadores" }, { title: deliveryman.name }]}
      />

      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Heading variant="h2" className="border-none pb-0">
              {deliveryman.name}
            </Heading>
            <StatusBadge status={deliveryman.isBlocked ? statusConst.BLOCKED : statusConst.ACTIVE} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{getContractTypeLabel(deliveryman.contractType)}</Badge>
            <Badge variant="secondary">{regionMap.get(deliveryman.regionId ?? "") ?? "Sem região"}</Badge>
          </div>
        </div>
        <DeliverymanDetailActions deliverymanId={deliveryman.id} isBlocked={deliveryman.isBlocked} />
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Informações Pessoais</Heading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Nome">{deliveryman.name}</InfoItem>
          <InfoItem label="Documento">{applyCpfMask(deliveryman.document)}</InfoItem>
          <InfoItem label="Telefone">{applyPhoneMask(deliveryman.phone)}</InfoItem>
          <InfoItem label="Região">{regionMap.get(deliveryman.regionId ?? "") ?? "—"}</InfoItem>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Dados Financeiros</Heading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Chave Pix principal">{deliveryman.mainPixKey}</InfoItem>
          <InfoItem label="Chave Pix secundária">{deliveryman.secondPixKey || "—"}</InfoItem>
          <InfoItem label="Chave Pix terciária">{deliveryman.thridPixKey || "—"}</InfoItem>
          <InfoItem label="Conta">{deliveryman.account || "—"}</InfoItem>
          <InfoItem label="Agência">{deliveryman.agency || "—"}</InfoItem>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Veículo</Heading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Modelo">{deliveryman.vehicleModel || "—"}</InfoItem>
          <InfoItem label="Placa">{deliveryman.vehiclePlate || "—"}</InfoItem>
          <InfoItem label="Cor">{deliveryman.vehicleColor || "—"}</InfoItem>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Documentos</Heading>
        {deliveryman.files.length > 0 ? (
          <ul className="space-y-2">
            {deliveryman.files.map((fileUrl, index) => (
              <li key={fileUrl}>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {getFileLabel(fileUrl, index)}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <Text variant="muted">Nenhum documento enviado.</Text>
        )}
      </section>

      <Separator />

      <section className="flex flex-wrap gap-6">
        <Text variant="muted">Criado em: {formatDateTime(deliveryman.createdAt)}</Text>
        <Text variant="muted">Atualizado em: {formatDateTime(deliveryman.updatedAt)}</Text>
      </section>
    </main>
  );
}

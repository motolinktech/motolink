import { notFound } from "next/navigation";

import { ContentHeader } from "@/components/composite/content-header";
import { Badge } from "@/components/ui/badge";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { BAGS_STATUS_OPTIONS } from "@/constants/bags-status";
import { PAYMENT_TYPES, PERIOD_TYPES } from "@/constants/commercial-conditions";
import { clientsService } from "@/modules/clients/clients-service";
import { groupsService } from "@/modules/groups/groups-service";
import { regionsService } from "@/modules/regions/regions-service";
import { applyCepMask } from "@/utils/masks/cep-mask";
import { applyCnpjMask } from "@/utils/masks/cnpj-mask";
import { applyPhoneMask } from "@/utils/masks/phone-mask";

interface ClientePageProps {
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

function formatCurrency(value: number | { toNumber?: () => number }) {
  const num = typeof value === "number" ? value : (value?.toNumber?.() ?? Number(value));
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getBagsStatusLabel(status: string) {
  return BAGS_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function getPaymentLabel(value: string) {
  return PAYMENT_TYPES.find((p) => p.value === value)?.label ?? value;
}

function getPeriodLabel(value: string) {
  return PERIOD_TYPES.find((p) => p.value === value)?.label ?? value;
}

export default async function ClientePage({ params }: ClientePageProps) {
  const { id } = await params;

  const [clientResult, regionsResult, groupsResult] = await Promise.all([
    clientsService().getById(id),
    regionsService().listAll({ page: 1, pageSize: 100 }),
    groupsService().listAll({ page: 1, pageSize: 100 }),
  ]);

  if (clientResult.isErr()) {
    notFound();
  }

  const client = clientResult.value;

  if (!client) {
    notFound();
  }

  const regionMap = new Map(regionsResult.isOk() ? regionsResult.value.data.map((r) => [r.id, r.name]) : []);
  const groupMap = new Map(groupsResult.isOk() ? groupsResult.value.data.map((g) => [g.id, g.name]) : []);

  const comm = client.commercialCondition;

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader breadcrumbItems={[{ title: "Clientes", href: "/gestao/clientes" }, { title: client.name }]} />

      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Heading variant="h2" className="border-none pb-0">
            {client.name}
          </Heading>
          <div className="flex flex-wrap items-center gap-2">
            {client.regionId && <Badge variant="secondary">{regionMap.get(client.regionId) ?? "—"}</Badge>}
            {client.groupId && <Badge variant="outline">{groupMap.get(client.groupId) ?? "—"}</Badge>}
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Dados do Cliente</Heading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Nome">{client.name}</InfoItem>
          <InfoItem label="CNPJ">{applyCnpjMask(client.cnpj)}</InfoItem>
          <InfoItem label="Nome do Contato">{client.contactName}</InfoItem>
          <InfoItem label="Telefone">{client.contactPhone ? applyPhoneMask(client.contactPhone) : "—"}</InfoItem>
        </div>
        {client.observations && <InfoItem label="Observações">{client.observations}</InfoItem>}
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Endereço</Heading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="CEP">{applyCepMask(client.cep)}</InfoItem>
          <InfoItem label="Rua">{client.street}</InfoItem>
          <InfoItem label="Número">{client.number}</InfoItem>
          <InfoItem label="Complemento">{client.complement || "—"}</InfoItem>
          <InfoItem label="Bairro">{client.neighborhood}</InfoItem>
          <InfoItem label="Cidade">{client.city}</InfoItem>
          <InfoItem label="UF">{client.uf}</InfoItem>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Classificação</Heading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Região">{regionMap.get(client.regionId ?? "") ?? "—"}</InfoItem>
          <InfoItem label="Grupo">{groupMap.get(client.groupId ?? "") ?? "—"}</InfoItem>
          {comm && <InfoItem label="Status dos Bags">{getBagsStatusLabel(comm.bagsStatus)}</InfoItem>}
          {comm && comm.bagsStatus === "COMPANY" && <InfoItem label="Qt. de Bags">{comm.bagsAllocated}</InfoItem>}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Condições Comerciais</Heading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Fornece refeição?">{client.provideMeal ? "Sim" : "Não"}</InfoItem>
          {comm && (
            <>
              <InfoItem label="Taxa de chuva">
                {Number(comm.rainTax) > 0 ? formatCurrency(Number(comm.rainTax)) : "Não"}
              </InfoItem>
              <InfoItem label="Área de entrega">{comm.deliveryAreaKm} km</InfoItem>
              <InfoItem label="Coberta pela Motolink?">{comm.isMotolinkCovered ? "Sim" : "Não"}</InfoItem>
            </>
          )}
        </div>

        {comm && comm.paymentForm.length > 0 && (
          <div className="space-y-2">
            <Text variant="muted">Formas de pagamento</Text>
            <div className="flex flex-wrap gap-1">
              {comm.paymentForm.map((p) => (
                <Badge key={p} variant="secondary">
                  {getPaymentLabel(p)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {comm && comm.paymentForm.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem label="Cliente - Por Entrega">{formatCurrency(Number(comm.clientPerDelivery))}</InfoItem>
            <InfoItem label="Cliente - Km Adicional">{formatCurrency(Number(comm.clientAdditionalKm))}</InfoItem>
            <InfoItem label="Entregador - Por Entrega">{formatCurrency(Number(comm.deliverymanPerDelivery))}</InfoItem>
            <InfoItem label="Entregador - Km Adicional">
              {formatCurrency(Number(comm.deliverymanAdditionalKm))}
            </InfoItem>
          </div>
        )}

        {comm && comm.dailyPeriods.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Text variant="muted">Períodos - Diária</Text>
              <div className="flex flex-wrap gap-1">
                {comm.dailyPeriods.map((p) => (
                  <Badge key={p} variant="outline">
                    {getPeriodLabel(p)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {comm.dailyPeriods.includes("WEEK_DAY") && (
                <>
                  <InfoItem label="Cliente - Semanal (Dia)">{formatCurrency(Number(comm.clientDailyDay))}</InfoItem>
                  <InfoItem label="Entregador - Semanal (Dia)">
                    {formatCurrency(Number(comm.deliverymanDailyDay))}
                  </InfoItem>
                </>
              )}
              {comm.dailyPeriods.includes("WEEK_NIGHT") && (
                <>
                  <InfoItem label="Cliente - Semanal (Noite)">{formatCurrency(Number(comm.clientDailyNight))}</InfoItem>
                  <InfoItem label="Entregador - Semanal (Noite)">
                    {formatCurrency(Number(comm.deliverymanDailyNight))}
                  </InfoItem>
                </>
              )}
              {comm.dailyPeriods.includes("WEEKEND_DAY") && (
                <>
                  <InfoItem label="Cliente - Fim de Semana (Dia)">
                    {formatCurrency(Number(comm.clientDailyDayWknd))}
                  </InfoItem>
                  <InfoItem label="Entregador - Fim de Semana (Dia)">
                    {formatCurrency(Number(comm.deliverymanDailyDayWknd))}
                  </InfoItem>
                </>
              )}
              {comm.dailyPeriods.includes("WEEKEND_NIGHT") && (
                <>
                  <InfoItem label="Cliente - Fim de Semana (Noite)">
                    {formatCurrency(Number(comm.clientDailyNightWknd))}
                  </InfoItem>
                  <InfoItem label="Entregador - Fim de Semana (Noite)">
                    {formatCurrency(Number(comm.deliverymanDailyNightWknd))}
                  </InfoItem>
                </>
              )}
            </div>
          </div>
        )}

        {comm && comm.guaranteedPeriods.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Text variant="muted">Períodos - Qt. Garantida</Text>
              <div className="flex flex-wrap gap-1">
                {comm.guaranteedPeriods.map((p) => (
                  <Badge key={p} variant="outline">
                    {getPeriodLabel(p)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {comm.guaranteedPeriods.includes("WEEK_DAY") && (
                <>
                  <InfoItem label="Qt. Garantida - Semanal (Dia)">{comm.guaranteedDay}</InfoItem>
                  <InfoItem label="Taxa - Semanal (Dia)">{formatCurrency(Number(comm.guaranteedDayTax))}</InfoItem>
                </>
              )}
              {comm.guaranteedPeriods.includes("WEEK_NIGHT") && (
                <>
                  <InfoItem label="Qt. Garantida - Semanal (Noite)">{comm.guaranteedNight}</InfoItem>
                  <InfoItem label="Taxa - Semanal (Noite)">{formatCurrency(Number(comm.guaranteedNightTax))}</InfoItem>
                </>
              )}
              {comm.guaranteedPeriods.includes("WEEKEND_DAY") && (
                <>
                  <InfoItem label="Qt. Garantida - Fim de Semana (Dia)">{comm.guaranteedDayWeekend}</InfoItem>
                  <InfoItem label="Taxa - Fim de Semana (Dia)">
                    {formatCurrency(Number(comm.guaranteedDayWeekendTax))}
                  </InfoItem>
                </>
              )}
              {comm.guaranteedPeriods.includes("WEEKEND_NIGHT") && (
                <>
                  <InfoItem label="Qt. Garantida - Fim de Semana (Noite)">{comm.guaranteedNightWeekend}</InfoItem>
                  <InfoItem label="Taxa - Fim de Semana (Noite)">
                    {formatCurrency(Number(comm.guaranteedNightWeekendTax))}
                  </InfoItem>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      <Separator />

      <section className="flex flex-wrap gap-6">
        <Text variant="muted">Criado em: {formatDateTime(client.createdAt)}</Text>
        <Text variant="muted">Atualizado em: {formatDateTime(client.updatedAt)}</Text>
      </section>
    </main>
  );
}

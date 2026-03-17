import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/composite/access-denied";
import { ContentHeader } from "@/components/composite/content-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { BAGS_STATUS_OPTIONS } from "@/constants/bags-status";
import { PAYMENT_TYPES, PERIOD_TYPES } from "@/constants/commercial-conditions";
import { clientsService } from "@/modules/clients/clients-service";
import { groupsService } from "@/modules/groups/groups-service";
import { regionsService } from "@/modules/regions/regions-service";
import { checkPagePermission } from "@/utils/check-page-permission";
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

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  if (!(await checkPagePermission("clients.view"))) return <AccessDenied />;

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoItem label="Nome">{client.name}</InfoItem>
            <InfoItem label="CNPJ">{applyCnpjMask(client.cnpj)}</InfoItem>
            <InfoItem label="Nome do Contato">{client.contactName}</InfoItem>
            <InfoItem label="Telefone">{client.contactPhone ? applyPhoneMask(client.contactPhone) : "—"}</InfoItem>
            {client.observations && (
              <div className="sm:col-span-2">
                <InfoItem label="Observações">{client.observations}</InfoItem>
              </div>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoItem label="CEP">{applyCepMask(client.cep)}</InfoItem>
            <InfoItem label="Rua">{client.street}</InfoItem>
            <InfoItem label="Número">{client.number}</InfoItem>
            <InfoItem label="Complemento">{client.complement || "—"}</InfoItem>
            <InfoItem label="Bairro">{client.neighborhood}</InfoItem>
            <InfoItem label="Cidade">
              {client.city} - {client.uf}
            </InfoItem>
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Classificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Região">{regionMap.get(client.regionId ?? "") ?? "—"}</InfoItem>
          <InfoItem label="Grupo">{groupMap.get(client.groupId ?? "") ?? "—"}</InfoItem>
          {comm && <InfoItem label="Status dos Bags">{getBagsStatusLabel(comm.bagsStatus)}</InfoItem>}
          {comm && comm.bagsStatus === "COMPANY" && <InfoItem label="Qt. de Bags">{comm.bagsAllocated}</InfoItem>}
        </CardContent>
      </Card>

      <Separator />

      <section className="space-y-6">
        <Heading variant="h3">Condições Comerciais</Heading>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card size="sm">
            <CardContent className="pt-0 text-center">
              <Text variant="muted" className="mb-1">
                Refeição
              </Text>
              <Text className="font-medium">{client.provideMeal ? "Sim" : "Não"}</Text>
            </CardContent>
          </Card>
          {comm && (
            <>
              <Card size="sm">
                <CardContent className="pt-0 text-center">
                  <Text variant="muted" className="mb-1">
                    Taxa de chuva
                  </Text>
                  <Text className="font-medium">{comm.rainTax > 0 ? formatCurrency(comm.rainTax) : "Não cobrada"}</Text>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardContent className="pt-0 text-center">
                  <Text variant="muted" className="mb-1">
                    Área de entrega
                  </Text>
                  <Text className="font-medium">{comm.deliveryAreaKm} km</Text>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardContent className="pt-0 text-center">
                  <Text variant="muted" className="mb-1">
                    Coberta pela Motolink
                  </Text>
                  <Text className="font-medium">{comm.isMotolinkCovered ? "Sim" : "Não"}</Text>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {comm && comm.paymentForm.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Valores por Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="muted">Formas de pagamento:</Text>
                {comm.paymentForm.map((p) => (
                  <Badge key={p} variant="secondary">
                    {getPaymentLabel(p)}
                  </Badge>
                ))}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead />
                    <TableHead>Por Entrega</TableHead>
                    <TableHead>Km Adicional</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Cliente</TableCell>
                    <TableCell>{formatCurrency(comm.clientPerDelivery)}</TableCell>
                    <TableCell>{formatCurrency(comm.clientAdditionalKm)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Entregador</TableCell>
                    <TableCell>{formatCurrency(comm.deliverymanPerDelivery)}</TableCell>
                    <TableCell>{formatCurrency(comm.deliverymanAdditionalKm)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {comm && comm.dailyPeriods.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                Diária
                <div className="flex flex-wrap gap-1">
                  {comm.dailyPeriods.map((p) => (
                    <Badge key={p} variant="outline">
                      {getPeriodLabel(p)}
                    </Badge>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Entregador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comm.dailyPeriods.includes("WEEK_DAY") && (
                    <TableRow>
                      <TableCell className="font-medium">Semanal (Dia)</TableCell>
                      <TableCell>{formatCurrency(comm.clientDailyDay)}</TableCell>
                      <TableCell>{formatCurrency(comm.deliverymanDailyDay)}</TableCell>
                    </TableRow>
                  )}
                  {comm.dailyPeriods.includes("WEEK_NIGHT") && (
                    <TableRow>
                      <TableCell className="font-medium">Semanal (Noite)</TableCell>
                      <TableCell>{formatCurrency(comm.clientDailyNight)}</TableCell>
                      <TableCell>{formatCurrency(comm.deliverymanDailyNight)}</TableCell>
                    </TableRow>
                  )}
                  {comm.dailyPeriods.includes("WEEKEND_DAY") && (
                    <TableRow>
                      <TableCell className="font-medium">Fim de Semana (Dia)</TableCell>
                      <TableCell>{formatCurrency(comm.clientDailyDayWknd)}</TableCell>
                      <TableCell>{formatCurrency(comm.deliverymanDailyDayWknd)}</TableCell>
                    </TableRow>
                  )}
                  {comm.dailyPeriods.includes("WEEKEND_NIGHT") && (
                    <TableRow>
                      <TableCell className="font-medium">Fim de Semana (Noite)</TableCell>
                      <TableCell>{formatCurrency(comm.clientDailyNightWknd)}</TableCell>
                      <TableCell>{formatCurrency(comm.deliverymanDailyNightWknd)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {comm && comm.guaranteedPeriods.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                Qt. Garantida
                <div className="flex flex-wrap gap-1">
                  {comm.guaranteedPeriods.map((p) => (
                    <Badge key={p} variant="outline">
                      {getPeriodLabel(p)}
                    </Badge>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comm.guaranteedPeriods.includes("WEEK_DAY") && (
                    <TableRow>
                      <TableCell className="font-medium">Semanal (Dia)</TableCell>
                      <TableCell>{comm.guaranteedDay}</TableCell>
                      <TableCell>{formatCurrency(comm.guaranteedDayTax)}</TableCell>
                    </TableRow>
                  )}
                  {comm.guaranteedPeriods.includes("WEEK_NIGHT") && (
                    <TableRow>
                      <TableCell className="font-medium">Semanal (Noite)</TableCell>
                      <TableCell>{comm.guaranteedNight}</TableCell>
                      <TableCell>{formatCurrency(comm.guaranteedNightTax)}</TableCell>
                    </TableRow>
                  )}
                  {comm.guaranteedPeriods.includes("WEEKEND_DAY") && (
                    <TableRow>
                      <TableCell className="font-medium">Fim de Semana (Dia)</TableCell>
                      <TableCell>{comm.guaranteedDayWeekend}</TableCell>
                      <TableCell>{formatCurrency(comm.guaranteedDayWeekendTax)}</TableCell>
                    </TableRow>
                  )}
                  {comm.guaranteedPeriods.includes("WEEKEND_NIGHT") && (
                    <TableRow>
                      <TableCell className="font-medium">Fim de Semana (Noite)</TableCell>
                      <TableCell>{comm.guaranteedNightWeekend}</TableCell>
                      <TableCell>{formatCurrency(comm.guaranteedNightWeekendTax)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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

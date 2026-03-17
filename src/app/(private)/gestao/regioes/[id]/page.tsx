import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/composite/access-denied";
import { ContentHeader } from "@/components/composite/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { clientsService } from "@/modules/clients/clients-service";
import { deliverymenService } from "@/modules/deliverymen/deliverymen-service";
import { regionsService } from "@/modules/regions/regions-service";
import { checkPagePermission } from "@/utils/check-page-permission";
import { applyCnpjMask } from "@/utils/masks/cnpj-mask";
import { applyPhoneMask } from "@/utils/masks/phone-mask";

interface RegiaoPageProps {
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

export default async function RegiaoPage({ params }: RegiaoPageProps) {
  if (!(await checkPagePermission("regions.view"))) return <AccessDenied />;

  const { id } = await params;

  const [result, clientsResult, deliverymenResult] = await Promise.all([
    regionsService().getById(id),
    clientsService().listAll({ page: 1, pageSize: 50, regionId: id }),
    deliverymenService().listAll({ page: 1, pageSize: 50, regionId: id }),
  ]);

  if (result.isErr()) {
    notFound();
  }

  const region = result.value;

  if (!region) {
    notFound();
  }

  const clients = clientsResult.isOk() ? clientsResult.value.data : [];
  const clientsTotal = clientsResult.isOk() ? clientsResult.value.pagination.total : 0;
  const deliverymen = deliverymenResult.isOk() ? deliverymenResult.value.data : [];
  const deliverymenTotal = deliverymenResult.isOk() ? deliverymenResult.value.pagination.total : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader breadcrumbItems={[{ title: "Regiões", href: "/gestao/regioes" }, { title: region.name }]} />

      <section className="flex items-center justify-between">
        <div className="space-y-2">
          <Heading variant="h2" className="border-none pb-0">
            {region.name}
          </Heading>
          {region.description && <Text variant="muted">{region.description}</Text>}
        </div>
        <Button asChild>
          <Link href={`/gestao/regioes/${id}/editar`}>Editar</Link>
        </Button>
      </section>

      <div className="grid gap-6 sm:grid-cols-4">
        <Card size="sm">
          <CardContent className="pt-0 text-center">
            <Text variant="muted" className="mb-1">
              Clientes
            </Text>
            <p className="text-2xl font-semibold tracking-tight">{clientsTotal}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0 text-center">
            <Text variant="muted" className="mb-1">
              Entregadores
            </Text>
            <p className="text-2xl font-semibold tracking-tight">{deliverymenTotal}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0 text-center">
            <Text variant="muted" className="mb-1">
              Criado em
            </Text>
            <Text className="font-medium">{formatDateTime(region.createdAt)}</Text>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0 text-center">
            <Text variant="muted" className="mb-1">
              Atualizado em
            </Text>
            <Text className="font-medium">{formatDateTime(region.updatedAt)}</Text>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">
          Clientes{" "}
          <Badge variant="secondary" className="ml-1 align-middle">
            {clientsTotal}
          </Badge>
        </Heading>

        {clients.length > 0 ? (
          <Card size="sm">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Grupo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <Link
                          href={`/gestao/clientes/${client.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{applyCnpjMask(client.cnpj)}</TableCell>
                      <TableCell>{client.contactName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.contactPhone ? applyPhoneMask(client.contactPhone) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {client.group ? (
                          <Badge variant="outline">{client.group.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {clientsTotal > 50 && (
                <div className="mt-4 text-center">
                  <Text variant="muted">
                    Exibindo 50 de {clientsTotal} clientes.{" "}
                    <Link href="/gestao/clientes" className="text-primary hover:underline">
                      Ver todos
                    </Link>
                  </Text>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card size="sm">
            <CardContent className="py-8 text-center">
              <Text variant="muted">Nenhum cliente vinculado a esta região.</Text>
            </CardContent>
          </Card>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">
          Entregadores{" "}
          <Badge variant="secondary" className="ml-1 align-middle">
            {deliverymenTotal}
          </Badge>
        </Heading>

        {deliverymen.length > 0 ? (
          <Card size="sm">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliverymen.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Link
                          href={`/gestao/colaboradores/${d.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {d.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.phone ? applyPhoneMask(d.phone) : "—"}</TableCell>
                      <TableCell className="text-right">
                        {d.isBlocked ? (
                          <Badge variant="destructive">Bloqueado</Badge>
                        ) : (
                          <Badge variant="secondary">Ativo</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {deliverymenTotal > 50 && (
                <div className="mt-4 text-center">
                  <Text variant="muted">
                    Exibindo 50 de {deliverymenTotal} entregadores.{" "}
                    <Link href="/gestao/colaboradores" className="text-primary hover:underline">
                      Ver todos
                    </Link>
                  </Text>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card size="sm">
            <CardContent className="py-8 text-center">
              <Text variant="muted">Nenhum entregador vinculado a esta região.</Text>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}

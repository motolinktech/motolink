import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/composite/access-denied";
import { ContentHeader } from "@/components/composite/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { clientsService } from "@/modules/clients/clients-service";
import { groupsService } from "@/modules/groups/groups-service";
import { checkPagePermission } from "@/utils/check-page-permission";
import { applyCnpjMask } from "@/utils/masks/cnpj-mask";
import { applyPhoneMask } from "@/utils/masks/phone-mask";

interface GrupoPageProps {
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

export default async function GrupoPage({ params }: GrupoPageProps) {
  if (!(await checkPagePermission("groups.view"))) return <AccessDenied />;

  const { id } = await params;

  const [result, clientsResult] = await Promise.all([
    groupsService().getById(id),
    clientsService().listAll({ page: 1, pageSize: 50, groupId: id }),
  ]);

  if (result.isErr()) {
    notFound();
  }

  const group = result.value;

  if (!group) {
    notFound();
  }

  const clients = clientsResult.isOk() ? clientsResult.value.data : [];
  const clientsTotal = clientsResult.isOk() ? clientsResult.value.pagination.total : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader breadcrumbItems={[{ title: "Grupos", href: "/gestao/grupos" }, { title: group.name }]} />

      <section className="flex items-center justify-between">
        <div className="space-y-2">
          <Heading variant="h2" className="border-none pb-0">
            {group.name}
          </Heading>
          {group.description && <Text variant="muted">{group.description}</Text>}
        </div>
        <Button asChild>
          <Link href={`/gestao/grupos/${id}/editar`}>Editar</Link>
        </Button>
      </section>

      <div className="grid gap-6 sm:grid-cols-3">
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
              Criado em
            </Text>
            <Text className="font-medium">{formatDateTime(group.createdAt)}</Text>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0 text-center">
            <Text variant="muted" className="mb-1">
              Atualizado em
            </Text>
            <Text className="font-medium">{formatDateTime(group.updatedAt)}</Text>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Heading variant="h3">
            Clientes{" "}
            <Badge variant="secondary" className="ml-1 align-middle">
              {clientsTotal}
            </Badge>
          </Heading>
        </div>

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
                    <TableHead className="text-right">Região</TableHead>
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
                        {client.region ? (
                          <Badge variant="outline">{client.region.name}</Badge>
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
              <Text variant="muted">Nenhum cliente vinculado a este grupo.</Text>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}

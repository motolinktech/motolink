import { BanIcon, CheckIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/composite/access-denied";
import { ContentHeader } from "@/components/composite/content-header";
import { StatusBadge } from "@/components/composite/status-badge";
import { UserDetailActions } from "@/components/composite/user-detail-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { buildPermissionKey, PERMISSION_ACTIONS, PERMISSION_MODULES } from "@/constants/permissions";
import { branchesService } from "@/modules/branches/branches-service";
import { usersService } from "@/modules/users/users-service";
import { checkPagePermission } from "@/utils/check-page-permission";

interface ColaboradorPageProps {
  params: Promise<{ id: string }>;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
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

export default async function ColaboradorPage({ params }: ColaboradorPageProps) {
  if (!(await checkPagePermission("users.view"))) return <AccessDenied />;

  const { id } = await params;
  const result = await usersService().getById(id);

  if (result.isErr()) {
    notFound();
  }

  const user = result.value;

  if (!user) {
    notFound();
  }

  const branchesResult = await branchesService().listAll({ page: 1, pageSize: 100 });
  const branchMap = new Map(branchesResult.isOk() ? branchesResult.value.data.map((b) => [b.id, b.name]) : []);

  const files = (user.files ?? []) as { name: string; url: string }[];

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader
        breadcrumbItems={[{ title: "Colaboradores", href: "/gestao/colaboradores" }, { title: user.name }]}
      />

      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-16">
            {user.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Heading variant="h2" className="border-none pb-0">
                {user.name}
              </Heading>
              <StatusBadge status={user.status} />
            </div>
            <Text variant="muted">{user.email}</Text>
          </div>
        </div>
        <UserDetailActions userId={user.id} />
      </section>

      <Separator />

      {/* Personal Info */}
      <section className="space-y-4">
        <Heading variant="h3">Informações Pessoais</Heading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Email">{user.email}</InfoItem>
          <InfoItem label="Telefone">{user.phone || "—"}</InfoItem>
          <InfoItem label="Documento">{user.document || "—"}</InfoItem>
          <InfoItem label="Data de Nascimento">{formatDate(user.birthDate)}</InfoItem>
          <InfoItem label="Cargo">{user.role}</InfoItem>
        </div>
      </section>

      <Separator />

      {/* Access & Permissions */}
      <section className="space-y-4">
        <Heading variant="h3">Acesso e Permissões</Heading>
        <div className="space-y-4">
          <div className="space-y-1">
            <Text variant="muted">Permissões</Text>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    {PERMISSION_ACTIONS.map((action) => (
                      <TableHead key={action.key} className="text-center">
                        {action.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_MODULES.map((module) => (
                    <TableRow key={module.key}>
                      <TableCell className="font-medium">{module.label}</TableCell>
                      {PERMISSION_ACTIONS.map((action) => {
                        const key = buildPermissionKey(module.key, action.key);
                        const hasPermission = user.role === "ADMIN" || user.permissions.includes(key);

                        return (
                          <TableCell key={action.key} className="text-center">
                            {hasPermission ? (
                              <CheckIcon className="mx-auto size-4 text-green-600" />
                            ) : (
                              <BanIcon className="mx-auto size-4 text-red-600" />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="space-y-1">
            <Text variant="muted">Filiais</Text>
            {user.branches.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {user.branches.map((branchId) => (
                  <Badge key={branchId} variant="outline">
                    {branchMap.get(branchId) ?? branchId}
                  </Badge>
                ))}
              </div>
            ) : (
              <Text>Nenhuma filial atribuída</Text>
            )}
          </div>
        </div>
      </section>

      <Separator />

      {/* Files */}
      <section className="space-y-4">
        <Heading variant="h3">Arquivos</Heading>
        {files.length > 0 ? (
          <ul className="space-y-2">
            {files.map((file) => (
              <li key={file.url}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <Text variant="muted">Nenhum arquivo</Text>
        )}
      </section>

      <Separator />

      {/* Metadata */}
      <section className="flex flex-wrap gap-6">
        <Text variant="muted">Criado em: {formatDateTime(user.createdAt)}</Text>
        <Text variant="muted">Atualizado em: {formatDateTime(user.updatedAt)}</Text>
      </section>
    </main>
  );
}

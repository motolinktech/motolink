import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentHeader } from "@/components/composite/content-header";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { regionsService } from "@/modules/regions/regions-service";

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

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Text variant="muted">{label}</Text>
      <Text>{children}</Text>
    </div>
  );
}

export default async function RegiaoPage({ params }: RegiaoPageProps) {
  const { id } = await params;
  const result = await regionsService().getById(id);

  if (result.isErr()) {
    notFound();
  }

  const region = result.value;

  if (!region) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader breadcrumbItems={[{ title: "Regiões", href: "/gestao/regioes" }, { title: region.name }]} />

      <section className="flex items-center justify-between">
        <Heading variant="h2" className="border-none pb-0">
          {region.name}
        </Heading>
        <Button asChild>
          <Link href={`/gestao/regioes/${id}/editar`}>Editar</Link>
        </Button>
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Informações</Heading>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoItem label="Nome">{region.name}</InfoItem>
          <InfoItem label="Descrição">{region.description || "—"}</InfoItem>
        </div>
      </section>

      <Separator />

      <section className="flex flex-wrap gap-6">
        <Text variant="muted">Criado em: {formatDateTime(region.createdAt)}</Text>
        <Text variant="muted">Atualizado em: {formatDateTime(region.updatedAt)}</Text>
      </section>
    </main>
  );
}

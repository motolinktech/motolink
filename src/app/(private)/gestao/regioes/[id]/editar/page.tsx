import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/composite/content-header";
import { RegionForm } from "@/components/forms/region-form";
import { regionsService } from "@/modules/regions/regions-service";

interface EditarRegiaoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarRegiaoPage({ params }: EditarRegiaoPageProps) {
  const { id } = await params;
  const result = await regionsService().getById(id);

  if (result.isErr() || !result.value) {
    notFound();
  }

  const region = result.value;

  const defaultValues = {
    id: region.id,
    name: region.name,
    description: region.description ?? "",
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader
        breadcrumbItems={[
          { title: "Regiões", href: "/gestao/regioes" },
          { title: region.name, href: `/gestao/regioes/${id}` },
          { title: "Editar" },
        ]}
      />
      <RegionForm defaultValues={defaultValues} isEditing redirectTo={`/gestao/regioes/${id}`} />
    </main>
  );
}

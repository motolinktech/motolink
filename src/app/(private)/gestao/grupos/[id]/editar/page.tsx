import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/composite/content-header";
import { GroupForm } from "@/components/forms/group-form";
import { groupsService } from "@/modules/groups/groups-service";

interface EditarGrupoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarGrupoPage({ params }: EditarGrupoPageProps) {
  const { id } = await params;
  const result = await groupsService().getById(id);

  if (result.isErr() || !result.value) {
    notFound();
  }

  const group = result.value;

  const defaultValues = {
    id: group.id,
    name: group.name,
    description: group.description ?? "",
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader
        breadcrumbItems={[
          { title: "Grupos", href: "/gestao/grupos" },
          { title: group.name, href: `/gestao/grupos/${id}` },
          { title: "Editar" },
        ]}
      />
      <GroupForm defaultValues={defaultValues} isEditing redirectTo={`/gestao/grupos/${id}`} />
    </main>
  );
}

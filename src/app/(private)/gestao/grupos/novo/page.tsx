import { ContentHeader } from "@/components/composite/content-header";
import { GroupForm } from "@/components/forms/group-form";

export default function NovoGrupoPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader breadcrumbItems={[{ title: "Grupos", href: "/gestao/grupos" }, { title: "Novo Grupo" }]} />
      <GroupForm redirectTo="/gestao/grupos" />
    </main>
  );
}

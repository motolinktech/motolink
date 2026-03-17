import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/composite/content-header";
import { StatusBadge } from "@/components/composite/status-badge";
import { ThemeSwitch } from "@/components/composite/theme-switch";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { cookieConst } from "@/constants/cookies";
import { usersService } from "@/modules/users/users-service";

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

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Text variant="muted">{label}</Text>
      <Text>{children}</Text>
    </div>
  );
}

export default async function PerfilPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(cookieConst.USER_ID)?.value;

  if (!userId) {
    notFound();
  }

  const result = await usersService().getById(userId);

  if (result.isErr() || !result.value) {
    notFound();
  }

  const user = result.value;

  return (
    <main className="mx-auto max-w-6xl space-y-6 py-6">
      <ContentHeader breadcrumbItems={[{ title: "Meu Perfil" }]} />

      <section className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
            <div className="flex items-center gap-2">
              <Text variant="muted">{user.email}</Text>
              <Badge variant="outline">{user.role}</Badge>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Informações Pessoais</Heading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Email">{user.email}</InfoItem>
          <InfoItem label="Telefone">{user.phone || "—"}</InfoItem>
          <InfoItem label="Documento">{user.document || "—"}</InfoItem>
          <InfoItem label="Data de Nascimento">{formatDate(user.birthDate)}</InfoItem>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Aparência</Heading>
        <ThemeSwitch />
      </section>

      <Separator />

      <section className="space-y-4">
        <Heading variant="h3">Alterar Senha</Heading>
        <ChangePasswordForm userId={userId} />
      </section>
    </main>
  );
}

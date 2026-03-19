import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function LoginPage() {
  return (
    <main>
      <Text className="text-center mb-4" variant="muted">
        Bem-vindo ao Sistema Motolink. Faça login para acessar o painel de controle e gerenciar suas operações de forma
        simples e eficiente.
      </Text>
      <LoginForm />
      <Button variant="outline" asChild className="w-full mt-3">
        <Link href="/esqueceu-a-senha">Esqueceu a senha?</Link>
      </Button>
    </main>
  );
}

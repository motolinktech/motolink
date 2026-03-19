import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function ForgotPasswordPage() {
  return (
    <main>
      <Text className="text-center mb-4" variant="muted">
        Informe seu e-mail para receber uma mensagem no WhatsApp com as instruções para redefinir sua senha.
      </Text>
      <ForgotPasswordForm />
      <Button variant="ghost" asChild className="w-full mt-3">
        <Link href="/login">Voltar para o login</Link>
      </Button>
    </main>
  );
}

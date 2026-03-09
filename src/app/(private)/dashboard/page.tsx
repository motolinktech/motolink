"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteSessionAction } from "@/modules/sessions/sessions-actions";

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    await deleteSessionAction();
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <Button onClick={handleLogout} isLoading={isLoading}>
        Sair
      </Button>
    </main>
  );
}

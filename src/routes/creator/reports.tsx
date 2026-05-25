import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/creator/reports")({ component: Reports });

function Reports() {
  return (
    <AppShell variant="creator">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Resultados</h1>
        <p className="text-sm text-muted-foreground">Reporte alcance, performance e destaque cases no seu portfólio</p>
      </div>
      <Card className="border-dashed bg-secondary/40">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Você ainda não tem entregas publicadas para reportar.
        </CardContent>
      </Card>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";

const columns = ["Briefing", "Roteiro em Análise", "Aguardando Gravação", "Em Aprovação", "Publicado"];

export const Route = createFileRoute("/agency/kanban")({ component: Kanban });

function Kanban() {
  return (
    <AppShell variant="agency">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Kanban de Entregáveis</h1>
        <p className="text-sm text-muted-foreground">Acompanhe o status de cada peça</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((c) => (
          <div key={c} className="min-w-[240px] flex-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 px-1">{c}</div>
            <Card className="bg-secondary/40 border-dashed">
              <CardContent className="p-4 text-xs text-muted-foreground text-center">Sem entregas</CardContent>
            </Card>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Megaphone, Clock } from "lucide-react";

export const Route = createFileRoute("/agency/")({ component: AgencyDashboard });

function AgencyDashboard() {
  return (
    <AppShell variant="agency">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">Visão geral das suas campanhas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard icon={<DollarSign className="h-5 w-5" />} label="Investido (acumulado)" value="R$ 0" />
        <MetricCard icon={<Megaphone className="h-5 w-5" />} label="Campanhas ativas" value="0" />
        <MetricCard icon={<Clock className="h-5 w-5" />} label="Entregas pendentes" value="0" />
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Próximos passos</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Vamos popular o Kanban de entregáveis, o CRM de creators e os relatórios nas próximas etapas.</p>
          <p>A estrutura de banco já está pronta para receber campanhas, entregas e métricas.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-xl font-semibold">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

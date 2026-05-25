import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/agency/creators")({ component: Creators });

function Creators() {
  return (
    <AppShell variant="agency">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">CRM de Creators</h1>
        <p className="text-sm text-muted-foreground">Sua base de criadores</p>
      </div>
      <div className="relative mb-4">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar creator..." className="pl-9" />
      </div>
      <Card className="border-dashed bg-secondary/40">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Nenhum creator cadastrado ainda.
        </CardContent>
      </Card>
    </AppShell>
  );
}

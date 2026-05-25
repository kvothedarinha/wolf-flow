import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/creator/")({ component: CreatorDeliveries });

function CreatorDeliveries() {
  return (
    <AppShell variant="creator">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Minhas Entregas</h1>
        <p className="text-sm text-muted-foreground">Tudo que você precisa entregar</p>
      </div>
      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="done">Concluídas</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <EmptyState message="Nenhuma entrega pendente no momento." />
        </TabsContent>
        <TabsContent value="done">
          <EmptyState message="Você ainda não concluiu entregas." />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed bg-secondary/40">
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}

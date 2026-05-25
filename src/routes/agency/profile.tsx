import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProfileEditor } from "@/components/ProfileEditor";

export const Route = createFileRoute("/agency/profile")({ component: AgencyProfile });

function AgencyProfile() {
  return (
    <AppShell variant="agency">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">Dados da sua agência</p>
      </div>
      <ProfileEditor />
    </AppShell>
  );
}

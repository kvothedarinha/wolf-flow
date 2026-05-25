import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProfileEditor } from "@/components/ProfileEditor";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/creator/profile")({ component: CreatorProfile });

function CreatorProfile() {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? null));
  }, [user]);

  return (
    <AppShell variant="creator">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">Seus dados e seu mídia kit público</p>
      </div>

      {username && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Mídia kit público</div>
              <div className="text-sm font-medium">/p/{username}</div>
            </div>
            <a href={`/p/${username}`} target="_blank" rel="noreferrer" className="text-primary text-sm inline-flex items-center gap-1 hover:underline">
              Abrir <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </CardContent>
        </Card>
      )}

      <ProfileEditor />
    </AppShell>
  );
}

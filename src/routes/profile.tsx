import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const displayName = name ?? profile?.name ?? "";

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: displayName.trim() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil atualizado");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  }

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">Seus dados de conta</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-8">Carregando...</div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome</Label>
              <Input
                id="profile-name"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
              <Button
                variant="outline"
                onClick={() => signOut().then(() => navigate({ to: "/auth" }))}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Sun, Moon, Monitor, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { toast } from "sonner";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

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

  const { data: strava } = useQuery({
    queryKey: ["strava", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strava_connections")
        .select("athlete_id, created_at")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("strava");
    if (!status) return;
    if (status === "conectado")
      toast.success("Strava conectado! Seus treinos vão validar os hábitos marcados.");
    else toast.error("Não foi possível conectar ao Strava. Tente de novo.");
    window.history.replaceState({}, "", "/profile");
    queryClient.invalidateQueries({ queryKey: ["strava"] });
  }, [queryClient]);

  async function connectStrava() {
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("strava-auth", {
      body: { action: "start" },
    });
    setConnecting(false);
    if (error || !data?.url) toast.error("Falha ao iniciar a conexão com o Strava");
    else window.location.href = data.url;
  }

  async function disconnectStrava() {
    if (!user) return;
    const { error } = await supabase.from("strava_connections").delete().eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Strava desconectado");
      queryClient.invalidateQueries({ queryKey: ["strava"] });
    }
  }

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

  const { theme, setTheme } = useTheme();

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-[26px] font-extrabold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">Seus dados e preferências</p>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-2">
          <Label>Tema</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
                className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium transition-colors ${
                  theme === value
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4">
          <Label className="mb-2 block">Conexões</Label>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#fc4c02]/15 text-[#fc4c02] flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Strava</div>
              <div className="text-xs text-muted-foreground">
                {strava
                  ? `Conectado — atleta #${strava.athlete_id}`
                  : "Valide exercícios automaticamente com seus treinos"}
              </div>
            </div>
            {strava ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={disconnectStrava}
              >
                Desconectar
              </Button>
            ) : (
              <Button
                size="sm"
                className="rounded-full"
                onClick={connectStrava}
                disabled={connecting}
              >
                {connecting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Conectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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

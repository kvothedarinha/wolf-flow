import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { dbUpdateName } from "@/lib/local-db";
import { toast } from "sonner";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, signOut, refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme();

  const displayName = name ?? user?.name ?? "";

  function save() {
    if (!user) return;
    setSaving(true);
    try {
      dbUpdateName(user.id, displayName.trim());
      refresh();
      toast.success("Perfil atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    signOut();
    navigate({ to: "/auth" });
  }

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
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

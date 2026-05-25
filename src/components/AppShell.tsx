import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Kanban, Users, User, ListTodo, BarChart3, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const agencyNav = [
  { to: "/agency", label: "Painel", icon: LayoutDashboard },
  { to: "/agency/kanban", label: "Kanban", icon: Kanban },
  { to: "/agency/creators", label: "Creators", icon: Users },
  { to: "/agency/profile", label: "Perfil", icon: User },
];

const creatorNav = [
  { to: "/creator", label: "Entregas", icon: ListTodo },
  { to: "/creator/reports", label: "Resultados", icon: BarChart3 },
  { to: "/creator/profile", label: "Perfil", icon: User },
];

export function AppShell({ children, variant }: { children: ReactNode; variant: "agency" | "creator" }) {
  const { session, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = variant === "agency" ? agencyNav : creatorNav;

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (role && role !== variant) navigate({ to: role === "agency" ? "/agency" : "/creator" });
  }, [session, role, loading, variant, navigate]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">Creator Hub</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{variant === "agency" ? "Agência" : "Creator"}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate({ to: "/auth" }))}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-24">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur md:bg-card">
        <div className="mx-auto max-w-5xl grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0,1fr))` }}>
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || (item.to !== `/${variant}` && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 py-3 text-[11px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

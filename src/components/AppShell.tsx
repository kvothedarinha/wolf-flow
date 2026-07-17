import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CalendarCheck, ListTodo, BarChart3, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const nav = [
  { to: "/", label: "Hoje", icon: CalendarCheck },
  { to: "/habits", label: "Hábitos", icon: ListTodo },
  { to: "/stats", label: "Estatísticas", icon: BarChart3 },
  { to: "/profile", label: "Perfil", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <div>
              <div className="text-sm font-extrabold leading-tight tracking-tight">Wolf Flow</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Hábitos
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut().then(() => navigate({ to: "/auth" }))}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur md:bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-3xl grid grid-cols-4">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors ${
                  active ? "font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`flex items-center justify-center h-7 w-12 rounded-full transition-colors ${
                    active ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

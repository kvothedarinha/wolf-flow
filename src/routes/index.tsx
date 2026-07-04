import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Check, Flame, Plus } from "lucide-react";
import { useHabits, useEntries, useToggleEntry } from "@/hooks/useHabits";
import {
  isScheduledOn,
  entriesByHabit,
  currentStreak,
  completionsThisWeek,
  toDateKey,
  type Habit,
} from "@/lib/habits";

export const Route = createFileRoute("/")({ component: TodayPage });

function TodayPage() {
  const { data: habits, isLoading: loadingHabits } = useHabits();
  const { data: entries, isLoading: loadingEntries } = useEntries();
  const toggle = useToggleEntry();

  const today = new Date();
  const active = (habits ?? []).filter((h) => !h.archived);
  const scheduled = active.filter((h) => isScheduledOn(h, today));
  const byHabit = entriesByHabit(entries ?? []);
  const todayKey = toDateKey(today);
  const doneCount = scheduled.filter((h) => byHabit.get(h.id)?.has(todayKey)).length;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Hoje</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {scheduled.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-muted-foreground">Progresso do dia</span>
              <span className="font-medium">
                {doneCount}/{scheduled.length}
              </span>
            </div>
            <Progress value={scheduled.length ? (doneCount / scheduled.length) * 100 : 0} />
          </CardContent>
        </Card>
      )}

      {loadingHabits || loadingEntries ? (
        <div className="text-sm text-muted-foreground text-center py-8">Carregando...</div>
      ) : scheduled.length === 0 ? (
        <Card className="border-dashed bg-secondary/40">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {active.length === 0
                ? "Você ainda não criou nenhum hábito."
                : "Nenhum hábito agendado para hoje."}
            </p>
            <Button asChild size="sm">
              <Link to="/habits">
                <Plus className="h-4 w-4 mr-1" />
                Criar hábito
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {scheduled.map((habit) => {
            const dates = byHabit.get(habit.id) ?? new Set<string>();
            const done = dates.has(todayKey);
            return (
              <HabitRow
                key={habit.id}
                habit={habit}
                done={done}
                streak={currentStreak(habit, dates, today)}
                weekCount={completionsThisWeek(habit, dates, today)}
                pending={toggle.isPending}
                onToggle={() => toggle.mutate({ habitId: habit.id, date: today, done })}
              />
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function HabitRow({
  habit,
  done,
  streak,
  weekCount,
  pending,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  streak: number;
  weekCount: number;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className={done ? "opacity-70" : ""}>
      <CardContent className="p-3 flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: `${habit.color}20` }}
        >
          {habit.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : ""}`}
          >
            {habit.name}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {streak > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Flame className="h-3 w-3 text-orange-500" />
                {streak}{" "}
                {habit.frequency === "weekly"
                  ? streak === 1
                    ? "semana"
                    : "semanas"
                  : streak === 1
                    ? "dia"
                    : "dias"}
              </span>
            )}
            {habit.frequency === "weekly" && (
              <span>
                {weekCount}/{habit.target_per_week} esta semana
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={pending}
          aria-label={done ? `Desmarcar ${habit.name}` : `Concluir ${habit.name}`}
          className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
            done ? "text-white" : "border-border text-transparent hover:border-primary/50"
          }`}
          style={done ? { backgroundColor: habit.color, borderColor: habit.color } : undefined}
        >
          <Check className="h-5 w-5" />
        </button>
      </CardContent>
    </Card>
  );
}

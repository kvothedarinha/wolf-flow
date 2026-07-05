import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Check, Flame, Plus } from "lucide-react";
import { useHabits, useEntries, useToggleEntry } from "@/hooks/useHabits";
import { HabitIcon } from "@/lib/habit-icons";
import {
  isScheduledOn,
  entriesByHabit,
  currentStreak,
  completionsThisWeek,
  currentWeekDays,
  toDateKey,
  WEEKDAY_LABELS,
  type Habit,
} from "@/lib/habits";

export const Route = createFileRoute("/")({ component: TodayPage });

function TodayPage() {
  const { data: habits, isLoading: loadingHabits } = useHabits();
  const { data: entries, isLoading: loadingEntries } = useEntries();
  const toggle = useToggleEntry();

  const today = startOfDay(new Date());
  const [selectedDay, setSelectedDay] = useState(today);
  const isToday = isSameDay(selectedDay, today);

  const active = (habits ?? []).filter((h) => !h.archived);
  const scheduled = active.filter((h) => isScheduledOn(h, selectedDay));
  const byHabit = entriesByHabit(entries ?? []);
  const dayKey = toDateKey(selectedDay);
  const doneCount = scheduled.filter((h) => byHabit.get(h.id)?.has(dayKey)).length;

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-[26px] font-extrabold tracking-tight">
          {isToday ? "Hoje" : format(selectedDay, "EEEE", { locale: ptBR })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <WeekStrip today={today} selected={selectedDay} onSelect={setSelectedDay} />

      {scheduled.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-muted-foreground">
                {isToday ? "Progresso do dia" : "Concluídos neste dia"}
              </span>
              <span className="font-bold tabular-nums">
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
        <Card className="border-dashed bg-secondary/50 shadow-none">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {active.length === 0
                ? "Você ainda não criou nenhum hábito."
                : "Nenhum hábito agendado para este dia."}
            </p>
            <Button asChild size="sm" className="rounded-full px-5">
              <Link to="/habits">
                <Plus className="h-4 w-4 mr-1" />
                Criar hábito
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {scheduled.map((habit) => {
            const dates = byHabit.get(habit.id) ?? new Set<string>();
            const done = dates.has(dayKey);
            return (
              <HabitRow
                key={habit.id}
                habit={habit}
                done={done}
                streak={currentStreak(habit, dates, today)}
                weekCount={completionsThisWeek(habit, dates, today)}
                pending={toggle.isPending}
                onToggle={() => toggle.mutate({ habitId: habit.id, date: selectedDay, done })}
              />
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

/** Faixa da semana corrente: dias passados são selecionáveis para check-in retroativo. */
function WeekStrip({
  today,
  selected,
  onSelect,
}: {
  today: Date;
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5 mb-5">
      {currentWeekDays(today).map((day) => {
        const future = isAfter(day, today);
        const isSel = isSameDay(day, selected);
        const isTod = isSameDay(day, today);
        return (
          <button
            key={toDateKey(day)}
            disabled={future}
            onClick={() => onSelect(day)}
            className={`flex flex-col items-center gap-0.5 rounded-2xl py-2.5 transition-colors ${
              isSel
                ? "bg-accent text-accent-foreground shadow-sm"
                : future
                  ? "text-muted-foreground/40"
                  : "bg-card text-muted-foreground hover:bg-secondary"
            }`}
            aria-label={format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
            aria-pressed={isSel}
          >
            <span className="text-[10px] font-semibold uppercase">
              {WEEKDAY_LABELS[day.getDay()]}
            </span>
            <span
              className={`text-sm tabular-nums ${isSel || isTod ? "font-bold" : "font-medium"}`}
            >
              {format(day, "d")}
            </span>
            {isTod && <span className="h-1 w-1 rounded-full bg-current" />}
          </button>
        );
      })}
    </div>
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
          className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${habit.color}22`, color: habit.color }}
        >
          <HabitIcon name={habit.icon} className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-[15px] font-semibold truncate ${done ? "line-through text-muted-foreground" : ""}`}
          >
            {habit.name}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 tabular-nums">
            {streak > 0 && (
              <span className="inline-flex items-center gap-0.5 font-medium text-warning">
                <Flame className="h-3 w-3" />
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
            {streak === 0 && habit.frequency !== "weekly" && <span>Comece uma sequência</span>}
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={pending}
          aria-label={done ? `Desmarcar ${habit.name}` : `Concluir ${habit.name}`}
          className={`h-11 w-11 rounded-full border-2 flex items-center justify-center transition-all shrink-0 active:scale-90 ${
            done ? "text-white" : "border-border text-transparent hover:border-ring"
          }`}
          style={done ? { backgroundColor: habit.color, borderColor: habit.color } : undefined}
        >
          <Check className="h-5 w-5" strokeWidth={3} />
        </button>
      </CardContent>
    </Card>
  );
}

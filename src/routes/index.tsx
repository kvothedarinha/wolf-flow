import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/components/ProgressRing";
import { HabitCheckbox } from "@/components/HabitCheckbox";
import { Button } from "@/components/ui/button";
import { Flame, Plus, X, ShieldCheck } from "lucide-react";
import { useHabits, useEntries, useToggleEntry } from "@/hooks/useHabits";
import { HabitIcon } from "@/lib/habit-icons";
import {
  isScheduledOn,
  isQuit,
  entriesByHabit,
  groupHabits,
  currentStreak,
  completionsThisWeek,
  currentWeekDays,
  toDateKey,
  WEEKDAY_LABELS,
  type Habit,
} from "@/lib/habits";

export const Route = createFileRoute("/")({ component: TodayPage });

function greeting(hour: number): string {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function TodayPage() {
  const { data: habits, isLoading: loadingHabits } = useHabits();
  const { data: entries, isLoading: loadingEntries } = useEntries();
  const toggle = useToggleEntry();

  const now = new Date();
  const today = startOfDay(now);
  const [selectedDay, setSelectedDay] = useState(today);
  const isToday = isSameDay(selectedDay, today);

  const active = (habits ?? []).filter((h) => !h.archived);
  const scheduled = active.filter((h) => isScheduledOn(h, selectedDay));
  const byHabit = entriesByHabit(entries ?? []);
  const dayKey = toDateKey(selectedDay);
  const doneCount = scheduled.filter((h) => {
    const hasEntry = byHabit.get(h.id)?.has(dayKey) ?? false;
    return isQuit(h) ? !hasEntry : hasEntry;
  }).length;

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-[26px] font-extrabold tracking-tight">
          {isToday ? greeting(now.getHours()) : format(selectedDay, "EEEE", { locale: ptBR })}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <WeekStrip today={today} selected={selectedDay} onSelect={setSelectedDay} />

      {scheduled.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4 flex items-center gap-4">
            <ProgressRing
              value={scheduled.length ? doneCount / scheduled.length : 0}
              label={isToday ? "do dia" : "do dia"}
            />
            <div>
              <div className="text-lg font-extrabold tabular-nums">
                {doneCount} de {scheduled.length}
              </div>
              <p className="text-sm text-muted-foreground">
                {doneCount === scheduled.length
                  ? "Tudo concluído. Excelente!"
                  : isToday
                    ? "hábitos concluídos hoje"
                    : "hábitos concluídos neste dia"}
              </p>
            </div>
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
        <div className="space-y-4">
          {groupHabits(scheduled).map(({ group, habits: items }) => (
            <div key={group ?? "__sem_grupo"}>
              {group && (
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {group}
                </div>
              )}
              <Card className="overflow-hidden">
                <CardContent className="p-0 divide-y divide-border">
                  {items.map((habit) => {
                    const dates = byHabit.get(habit.id) ?? new Set<string>();
                    const hasEntry = dates.has(dayKey);
                    return (
                      <HabitRow
                        key={habit.id}
                        habit={habit}
                        hasEntry={hasEntry}
                        streak={currentStreak(habit, dates, today)}
                        weekCount={completionsThisWeek(habit, dates, today)}
                        pending={toggle.isPending}
                        onToggle={() =>
                          toggle.mutate({ habitId: habit.id, date: selectedDay, done: hasEntry })
                        }
                      />
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
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
  hasEntry,
  streak,
  weekCount,
  pending,
  onToggle,
}: {
  habit: Habit;
  hasEntry: boolean;
  streak: number;
  weekCount: number;
  pending: boolean;
  onToggle: () => void;
}) {
  const quit = isQuit(habit);
  const done = quit ? !hasEntry : hasEntry;
  const struck = !quit && hasEntry;
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-opacity ${struck ? "opacity-60" : ""}`}
      style={{ backgroundColor: `${habit.color}12` }}
    >
      <Link
        to="/habit/$id"
        params={{ id: habit.id }}
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${habit.color}22`, color: habit.color }}
        aria-label={`Detalhes de ${habit.name}`}
      >
        <HabitIcon name={habit.icon} className="h-4.5 w-4.5" />
      </Link>
      <Link to="/habit/$id" params={{ id: habit.id }} className="flex-1 min-w-0">
        <div
          className={`text-[15px] font-semibold truncate ${struck ? "line-through decoration-[1.5px] text-muted-foreground" : ""}`}
        >
          {habit.name}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 tabular-nums">
          {quit ? (
            hasEntry ? (
              <span className="font-medium text-destructive">Recaída registrada neste dia</span>
            ) : (
              <span className="inline-flex items-center gap-0.5 font-medium text-success">
                <ShieldCheck className="h-3 w-3" />
                {streak} {streak === 1 ? "dia livre" : "dias livre"}
              </span>
            )
          ) : (
            <>
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
            </>
          )}
        </div>
      </Link>
      {quit ? (
        <button
          onClick={onToggle}
          disabled={pending}
          aria-label={
            hasEntry ? `Remover recaída de ${habit.name}` : `Registrar recaída de ${habit.name}`
          }
          aria-pressed={hasEntry}
          className={`h-8 w-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-150 active:scale-90 ${
            hasEntry
              ? "bg-destructive border-destructive text-white"
              : "border-border text-muted-foreground/60 hover:border-destructive/50 hover:text-destructive"
          }`}
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      ) : (
        <HabitCheckbox
          done={done}
          color={habit.color}
          disabled={pending}
          onToggle={onToggle}
          label={done ? `Desmarcar ${habit.name}` : `Concluir ${habit.name}`}
        />
      )}
    </div>
  );
}

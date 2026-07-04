import { createFileRoute } from "@tanstack/react-router";
import { subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, CheckCircle2, TrendingUp } from "lucide-react";
import { useHabits, useEntries } from "@/hooks/useHabits";
import {
  entriesByHabit,
  currentStreak,
  completionRate,
  isScheduledOn,
  toDateKey,
  type Habit,
} from "@/lib/habits";

export const Route = createFileRoute("/stats")({ component: StatsPage });

function StatsPage() {
  const { data: habits, isLoading: loadingHabits } = useHabits();
  const { data: entries, isLoading: loadingEntries } = useEntries();

  const today = new Date();
  const active = (habits ?? []).filter((h) => !h.archived);
  const byHabit = entriesByHabit(entries ?? []);
  const last7 = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

  const totalLast7 = (entries ?? []).filter(
    (e) => e.entry_date >= toDateKey(subDays(today, 6)),
  ).length;
  const bestStreak = active.reduce(
    (max, h) => Math.max(max, currentStreak(h, byHabit.get(h.id) ?? new Set(), today)),
    0,
  );
  const avgRate =
    active.length === 0
      ? 0
      : active.reduce(
          (sum, h) => sum + completionRate(h, byHabit.get(h.id) ?? new Set(), 30, today),
          0,
        ) / active.length;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Estatísticas</h1>
        <p className="text-sm text-muted-foreground">Seu progresso nos últimos dias</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Check-ins (7d)"
          value={String(totalLast7)}
        />
        <SummaryCard
          icon={<Flame className="h-4 w-4" />}
          label="Maior streak"
          value={String(bestStreak)}
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Taxa (30d)"
          value={`${Math.round(avgRate * 100)}%`}
        />
      </div>

      {loadingHabits || loadingEntries ? (
        <div className="text-sm text-muted-foreground text-center py-8">Carregando...</div>
      ) : active.length === 0 ? (
        <Card className="border-dashed bg-secondary/40">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Crie hábitos para acompanhar suas estatísticas aqui.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-end gap-1 pr-3 mb-1">
            {last7.map((d) => (
              <div
                key={toDateKey(d)}
                className="w-6 text-center text-[10px] text-muted-foreground uppercase"
              >
                {format(d, "EEEEE", { locale: ptBR })}
              </div>
            ))}
          </div>
          {active.map((habit) => (
            <HabitStatsRow
              key={habit.id}
              habit={habit}
              dates={byHabit.get(habit.id) ?? new Set()}
              days={last7}
              today={today}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
          {icon}
          {label}
        </div>
        <div className="text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function HabitStatsRow({
  habit,
  dates,
  days,
  today,
}: {
  habit: Habit;
  dates: Set<string>;
  days: Date[];
  today: Date;
}) {
  const rate = completionRate(habit, dates, 30, today);
  const streak = currentStreak(habit, dates, today);

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center text-base shrink-0"
            style={{ backgroundColor: `${habit.color}20` }}
          >
            {habit.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{habit.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{Math.round(rate * 100)}% em 30 dias</span>
              {streak > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <Flame className="h-3 w-3 text-orange-500" />
                  {streak}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {days.map((day) => {
              const done = dates.has(toDateKey(day));
              const scheduled = isScheduledOn(habit, day);
              return (
                <div
                  key={toDateKey(day)}
                  title={format(day, "dd/MM")}
                  className={`h-6 w-6 rounded-md ${done ? "" : scheduled ? "bg-secondary" : "bg-secondary/40"}`}
                  style={done ? { backgroundColor: habit.color } : undefined}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

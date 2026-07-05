import { createFileRoute } from "@tanstack/react-router";
import { subDays, startOfWeek, addDays, format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, CheckCircle2, TrendingUp } from "lucide-react";
import { useHabits, useEntries, HISTORY_DAYS } from "@/hooks/useHabits";
import { HabitIcon } from "@/lib/habit-icons";
import {
  entriesByHabit,
  currentStreak,
  completionRate,
  isScheduledOn,
  toDateKey,
  WEEKDAY_LABELS,
  type Habit,
  type HabitEntry,
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
      <div className="mb-5">
        <h1 className="text-[26px] font-extrabold tracking-tight">Estatísticas</h1>
        <p className="text-sm text-muted-foreground">Seu progresso ao longo do tempo</p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-6">
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
        <Card className="border-dashed bg-secondary/50 shadow-none">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Crie hábitos para ver estatísticas aqui.
          </CardContent>
        </Card>
      ) : (
        <>
          <SectionLabel>Histórico geral</SectionLabel>
          <HistoryHeatmap habits={active} entries={entries ?? []} today={today} />

          <SectionLabel className="mt-7">Últimos 7 dias por hábito</SectionLabel>
          <div className="flex items-center justify-end gap-1 pr-4 mb-1.5">
            {last7.map((d) => (
              <div
                key={toDateKey(d)}
                className="w-6 text-center text-[10px] font-semibold text-muted-foreground uppercase"
              >
                {WEEKDAY_LABELS[d.getDay()]}
              </div>
            ))}
          </div>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {active.map((habit) => (
                <HabitStatsRow
                  key={habit.id}
                  habit={habit}
                  dates={byHabit.get(habit.id) ?? new Set()}
                  days={last7}
                  today={today}
                />
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}

function SectionLabel({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div
      className={`text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Mapa de calor de todo o histórico carregado: cada coluna é uma semana e cada
 * linha um dia; a intensidade é a fração de hábitos agendados concluídos no dia.
 */
function HistoryHeatmap({
  habits,
  entries,
  today,
}: {
  habits: Habit[];
  entries: HabitEntry[];
  today: Date;
}) {
  const doneByDay = new Map<string, number>();
  for (const e of entries) doneByDay.set(e.entry_date, (doneByDay.get(e.entry_date) ?? 0) + 1);

  const weeks = Math.ceil((HISTORY_DAYS + today.getDay() + 1) / 7);
  const firstWeek = startOfWeek(subDays(today, HISTORY_DAYS), { weekStartsOn: 0 });

  const monthMarks: { col: number; label: string }[] = [];
  const grid: { key: string; ratio: number | null; label: string }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: { key: string; ratio: number | null; label: string }[] = [];
    const weekStart = addDays(firstWeek, w * 7);
    if (weekStart.getDate() <= 7) {
      monthMarks.push({ col: w, label: format(weekStart, "MMM", { locale: ptBR }) });
    }
    for (let d = 0; d < 7; d++) {
      const day = addDays(weekStart, d);
      if (isAfter(day, today)) {
        col.push({ key: toDateKey(day), ratio: null, label: "" });
        continue;
      }
      const scheduled = habits.filter((h) => isScheduledOn(h, day)).length;
      const done = doneByDay.get(toDateKey(day)) ?? 0;
      const ratio = scheduled === 0 ? 0 : Math.min(1, done / scheduled);
      col.push({
        key: toDateKey(day),
        ratio,
        label: `${format(day, "d 'de' MMM", { locale: ptBR })}: ${done} check-in${done === 1 ? "" : "s"}`,
      });
    }
    grid.push(col);
  }

  return (
    <Card>
      <CardContent className="p-4 overflow-x-auto">
        <div className="flex gap-1 mb-1 text-[9px] font-semibold text-muted-foreground uppercase h-3">
          {grid.map((_, w) => {
            const mark = monthMarks.find((m) => m.col === w);
            return (
              <div key={w} className="w-3.5 shrink-0">
                {mark?.label}
              </div>
            );
          })}
        </div>
        <div className="flex gap-1">
          {grid.map((col, w) => (
            <div key={w} className="flex flex-col gap-1">
              {col.map((cell) => (
                <div
                  key={cell.key}
                  title={cell.label}
                  className="h-3.5 w-3.5 rounded-[4px]"
                  style={{
                    backgroundColor:
                      cell.ratio === null
                        ? "transparent"
                        : cell.ratio === 0
                          ? "var(--secondary)"
                          : `color-mix(in oklch, var(--accent) ${25 + cell.ratio * 75}%, var(--secondary))`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-muted-foreground">
          Menos
          {[0, 0.33, 0.66, 1].map((r) => (
            <div
              key={r}
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{
                backgroundColor:
                  r === 0
                    ? "var(--secondary)"
                    : `color-mix(in oklch, var(--accent) ${25 + r * 75}%, var(--secondary))`,
              }}
            />
          ))}
          Mais
        </div>
      </CardContent>
    </Card>
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
        <div className="text-[22px] font-extrabold tabular-nums">{value}</div>
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
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${habit.color}22`, color: habit.color }}
        >
          <HabitIcon name={habit.icon} className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{habit.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 tabular-nums">
            <span>{Math.round(rate * 100)}% em 30 dias</span>
            {streak > 0 && (
              <span className="inline-flex items-center gap-0.5 font-medium text-warning">
                <Flame className="h-3 w-3" />
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
                className={`h-6 w-6 rounded-lg ${done ? "" : scheduled ? "bg-secondary" : "bg-secondary/40"}`}
                style={done ? { backgroundColor: habit.color } : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

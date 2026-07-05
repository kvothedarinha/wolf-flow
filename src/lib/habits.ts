import { format, startOfWeek, addDays, subDays, isSameDay } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

export type Habit = Tables<"habits">;
export type HabitEntry = Tables<"habit_entries">;

export const HABIT_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#84cc16", // lime
];

export const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Um hábito diário só é cobrado nos dias da semana marcados; semanais valem todo dia. */
export function isScheduledOn(habit: Habit, date: Date): boolean {
  return habit.frequency === "weekly" || habit.weekdays.includes(date.getDay());
}

/** Dias da semana corrente (domingo a sábado). */
export function currentWeekDays(today = new Date()): Date[] {
  const start = startOfWeek(today, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Check-ins do hábito na semana corrente. */
export function completionsThisWeek(
  habit: Habit,
  doneDates: Set<string>,
  today = new Date(),
): number {
  return currentWeekDays(today).filter((d) => d <= today && doneDates.has(toDateKey(d))).length;
}

/**
 * Streak de dias agendados concluídos em sequência, contando de hoje para trás.
 * Dias não agendados não quebram a sequência; hoje ainda sem check-in também não.
 */
export function currentStreak(habit: Habit, doneDates: Set<string>, today = new Date()): number {
  if (habit.frequency === "weekly") return weeklyStreak(habit, doneDates, today);

  let streak = 0;
  let day = today;
  for (let i = 0; i < 365; i++) {
    if (isScheduledOn(habit, day)) {
      if (doneDates.has(toDateKey(day))) streak++;
      else if (!isSameDay(day, today)) break;
    }
    day = subDays(day, 1);
  }
  return streak;
}

/** Para hábitos semanais: semanas consecutivas batendo a meta (a semana atual conta se já bateu). */
function weeklyStreak(habit: Habit, doneDates: Set<string>, today: Date): number {
  let streak = 0;
  let weekStart = startOfWeek(today, { weekStartsOn: 0 });
  for (let i = 0; i < 104; i++) {
    const done = Array.from({ length: 7 }, (_, d) => addDays(weekStart, d)).filter((d) =>
      doneDates.has(toDateKey(d)),
    ).length;
    if (done >= habit.target_per_week) streak++;
    else if (i > 0) break; // semana atual incompleta não quebra a sequência
    weekStart = subDays(weekStart, 7);
  }
  return streak;
}

/** Maior sequência já atingida dentro da janela de histórico carregada. */
export function bestStreak(
  habit: Habit,
  doneDates: Set<string>,
  windowDays: number,
  today = new Date(),
): number {
  if (habit.frequency === "weekly") {
    let best = 0;
    let run = 0;
    let weekStart = startOfWeek(subDays(today, windowDays), { weekStartsOn: 0 });
    const currentWeek = startOfWeek(today, { weekStartsOn: 0 });
    while (weekStart <= currentWeek) {
      const done = Array.from({ length: 7 }, (_, d) => addDays(weekStart, d)).filter((d) =>
        doneDates.has(toDateKey(d)),
      ).length;
      if (done >= habit.target_per_week) {
        run++;
        best = Math.max(best, run);
      } else if (weekStart < currentWeek) {
        run = 0; // semana atual incompleta não zera a sequência em andamento
      }
      weekStart = addDays(weekStart, 7);
    }
    return best;
  }
  let best = 0;
  let run = 0;
  for (let i = windowDays; i >= 0; i--) {
    const day = subDays(today, i);
    if (!isScheduledOn(habit, day)) continue;
    if (doneDates.has(toDateKey(day))) {
      run++;
      best = Math.max(best, run);
    } else if (i > 0) {
      run = 0; // hoje sem check-in ainda não quebra
    }
  }
  return best;
}

/** Rótulo curto da agenda do hábito (ex.: "Todos os dias", "S T Q", "3x por semana"). */
export function scheduleLabel(habit: Habit): string {
  if (habit.frequency === "weekly") return `${habit.target_per_week}x por semana`;
  if (habit.weekdays.length === 7) return "Todos os dias";
  return habit.weekdays.map((d) => WEEKDAY_LABELS[d]).join(" ");
}

/** Taxa de conclusão nos últimos N dias (dias agendados concluídos / dias agendados). */
export function completionRate(
  habit: Habit,
  doneDates: Set<string>,
  days: number,
  today = new Date(),
): number {
  if (habit.frequency === "weekly") {
    const weeks = Math.max(1, Math.floor(days / 7));
    const target = weeks * habit.target_per_week;
    let done = 0;
    for (let i = 0; i < days; i++) {
      if (doneDates.has(toDateKey(subDays(today, i)))) done++;
    }
    return Math.min(1, done / target);
  }
  let scheduled = 0;
  let done = 0;
  const created = new Date(habit.created_at);
  for (let i = 0; i < days; i++) {
    const day = subDays(today, i);
    if (day < created && !isSameDay(day, created)) break;
    if (!isScheduledOn(habit, day)) continue;
    scheduled++;
    if (doneDates.has(toDateKey(day))) done++;
  }
  return scheduled === 0 ? 0 : done / scheduled;
}

/** Agrupa entries por hábito como Set de datas ("yyyy-MM-dd"). */
export function entriesByHabit(entries: HabitEntry[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const e of entries) {
    let set = map.get(e.habit_id);
    if (!set) {
      set = new Set();
      map.set(e.habit_id, set);
    }
    set.add(e.entry_date);
  }
  return map;
}

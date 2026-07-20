import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
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
  const [confetti, setConfetti] = useState<ConfettiParticle[] | null>(null);
  const wasCompleteRef = useRef<{ day: string; complete: boolean }>({ day: "", complete: false });

  const active = (habits ?? []).filter((h) => !h.archived);
  const scheduled = active.filter((h) => isScheduledOn(h, selectedDay));
  const byHabit = entriesByHabit(entries ?? []);
  const dayKey = toDateKey(selectedDay);
  const doneCount = scheduled.filter((h) => {
    const hasEntry = byHabit.get(h.id)?.has(dayKey) ?? false;
    return isQuit(h) ? !hasEntry : hasEntry;
  }).length;
  const pct = scheduled.length ? doneCount / scheduled.length : 0;
  const perfect = scheduled.length > 0 && pct >= 1;

  // Confetti burst the first time the day reaches 100% completion
  useEffect(() => {
    const prev = wasCompleteRef.current;
    if (prev.day === dayKey && perfect && !prev.complete) {
      setConfetti(makeConfetti());
      const t = setTimeout(() => setConfetti(null), 1300);
      wasCompleteRef.current = { day: dayKey, complete: perfect };
      return () => clearTimeout(t);
    }
    wasCompleteRef.current = { day: dayKey, complete: perfect };
  }, [dayKey, perfect]);

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
        <Card className="mb-4 overflow-hidden relative">
          <CardContent className="p-5 flex items-center gap-4 relative">
            {confetti && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {confetti.map((p) => (
                  <span
                    key={p.id}
                    className="absolute top-1.5 block rounded-sm"
                    style={{
                      left: `${p.left}%`,
                      width: 6,
                      height: 10,
                      background: p.color,
                      transform: `rotate(${p.rot}deg)`,
                      animation: `wf-confetti-fall 1.1s ${p.delay}ms ease-in forwards`,
                    }}
                  />
                ))}
              </div>
            )}

            <ProgressRing pct={pct} perfect={perfect} />

            <div>
              <div className="text-[28px] font-extrabold tabular-nums leading-none">
                {Math.round(pct * 100)}%
              </div>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                {perfect
                  ? "Dia perfeito!"
                  : `${doneCount} de ${scheduled.length} hábitos feitos hoje`}
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
  const days = currentWeekDays(today);
  const selIdx = days.findIndex((d) => isSameDay(d, selected));
  return (
    <div className="relative grid grid-cols-7 gap-1.5 mb-5">
      {selIdx >= 0 && (
        <div
          aria-hidden
          className="absolute top-0 left-0 h-full rounded-2xl bg-accent shadow-sm"
          style={{
            width: "calc((100% - 6 * 0.375rem) / 7)",
            transform: `translateX(calc(${selIdx} * 100% + ${selIdx} * 0.375rem))`,
            transition: "transform .28s cubic-bezier(.3,1,.4,1)",
          }}
        />
      )}
      {days.map((day) => {
        const future = isAfter(day, today);
        const isSel = isSameDay(day, selected);
        const isTod = isSameDay(day, today);
        return (
          <button
            key={toDateKey(day)}
            disabled={future}
            onClick={() => onSelect(day)}
            className={`relative z-10 flex flex-col items-center gap-0.5 rounded-2xl py-2.5 bg-transparent transition-colors duration-200 ${
              isSel
                ? "text-accent-foreground"
                : future
                  ? "text-muted-foreground/40"
                  : "text-muted-foreground"
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

  const prevStreakRef = useRef(streak);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (streak > prevStreakRef.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 500);
      prevStreakRef.current = streak;
      return () => clearTimeout(t);
    }
    prevStreakRef.current = streak;
  }, [streak]);

  const [popping, setPopping] = useState(false);
  function handleToggle() {
    setPopping(true);
    setTimeout(() => setPopping(false), 180);
    onToggle();
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-opacity ${struck ? "opacity-60" : ""}`}
    >
      <Link
        to="/habit/$id"
        params={{ id: habit.id }}
        className="habit-icon-circle h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${habit.color}1c`, color: habit.color }}
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
                <span
                  className="inline-flex items-center gap-0.5 font-medium text-warning"
                  style={{ animation: bump ? "wf-streak-flash .5s ease" : "none" }}
                >
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
          onClick={handleToggle}
          disabled={pending}
          aria-label={
            hasEntry ? `Remover recaída de ${habit.name}` : `Registrar recaída de ${habit.name}`
          }
          aria-pressed={hasEntry}
          className={`h-11 w-11 rounded-xl border-2 flex items-center justify-center shrink-0 transition-colors duration-150 ${
            hasEntry
              ? "bg-destructive border-destructive text-white"
              : "border-border text-muted-foreground/60 hover:border-destructive/50 hover:text-destructive"
          }`}
          style={{
            transform: popping ? "scale(1.15)" : "scale(1)",
            transition: "transform .18s cubic-bezier(.34,1.56,.64,1)",
          }}
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

interface ConfettiParticle {
  id: number;
  left: number;
  rot: number;
  color: string;
  delay: number;
}

const CONFETTI_COLORS = ["#4ecdc4", "#ff8c28", "#ff6496", "#38bdf8", "#a78bfa"];

function makeConfetti(): ConfettiParticle[] {
  return Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: 6 + Math.random() * 88,
    rot: -30 + Math.random() * 60,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 250,
  }));
}

/** Anel de progresso SVG do card do dia. */
function ProgressRing({ pct, perfect }: { pct: number; perfect: boolean }) {
  const r = 27;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={64}
      height={64}
      viewBox="0 0 64 64"
      className={`shrink-0 ${perfect ? "animate-[wf-ring-glow_1.6s_ease-in-out_infinite]" : ""}`}
      style={{ transform: "rotate(-90deg)" }}
    >
      <defs>
        <linearGradient id="wf-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(78,205,196)" />
          <stop offset="100%" stopColor="rgb(255,140,40)" />
        </linearGradient>
      </defs>
      <circle cx={32} cy={32} r={r} fill="none" stroke="var(--secondary)" strokeWidth={7} />
      <circle
        cx={32}
        cy={32}
        r={r}
        fill="none"
        stroke="url(#wf-ring-gradient)"
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.34,1,.4,1)" }}
      />
    </svg>
  );
}

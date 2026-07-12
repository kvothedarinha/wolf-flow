import { useState } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  getDaysInMonth,
  isAfter,
  isSameMonth,
  format,
  startOfDay,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  isScheduledOn,
  isQuit,
  toDateKey,
  WEEKDAY_LABELS,
  type Habit,
  type HabitEntry,
} from "@/lib/habits";
import { HISTORY_DAYS } from "@/hooks/useHabits";

/**
 * Calendário mensal do hábito (padrão do event_calendar do template):
 * dias concluídos pintados na cor do hábito, agendados em secondary,
 * futuros desabilitados; toque em dia passado/hoje dispara onDayClick.
 */
export function MonthCalendar({
  habit,
  entriesByDate,
  onDayClick,
}: {
  habit: Habit;
  entriesByDate: Map<string, HabitEntry>;
  onDayClick: (date: Date, entry: HabitEntry | undefined) => void;
}) {
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(startOfMonth(today));

  const minMonth = startOfMonth(subDays(today, HISTORY_DAYS));
  const canGoBack = month > minMonth;
  const canGoForward = !isSameMonth(month, today);

  const leading = month.getDay();
  const days = getDaysInMonth(month);
  const quit = isQuit(habit);
  const markColor = quit ? "var(--destructive)" : habit.color;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canGoBack}
            onClick={() => setMonth(subMonths(month, 1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-bold capitalize">
            {format(month, "MMMM yyyy", { locale: ptBR })}
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canGoForward}
            onClick={() => setMonth(addMonths(month, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="text-center text-[10px] font-semibold uppercase text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1.5">
          {Array.from({ length: leading }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
            const key = toDateKey(date);
            const entry = entriesByDate.get(key);
            const done = !!entry;
            const future = isAfter(date, today);
            const scheduled = isScheduledOn(habit, date);
            const isToday = key === toDateKey(today);
            // dia anterior também concluído e na mesma linha → conector de sequência (só "construir")
            const linked =
              !quit &&
              done &&
              date.getDay() !== 0 &&
              entriesByDate.has(toDateKey(subDays(date, 1)));
            return (
              <div key={key} className="relative flex justify-center">
                {linked && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -translate-y-1/2 h-2 -left-1/2 w-full"
                    style={{ backgroundColor: `${habit.color}55` }}
                  />
                )}
                <button
                  disabled={future}
                  onClick={() => onDayClick(date, entry)}
                  aria-label={format(date, "d 'de' MMMM", { locale: ptBR })}
                  aria-pressed={done}
                  className={`relative z-10 h-9 w-9 rounded-xl text-sm tabular-nums transition-colors ${
                    done
                      ? "text-white font-bold"
                      : future
                        ? "text-muted-foreground/35"
                        : scheduled && !quit
                          ? "bg-secondary hover:bg-secondary/70"
                          : "text-muted-foreground hover:bg-secondary/50"
                  } ${isToday && !done ? "ring-2 ring-ring" : ""}`}
                  style={done ? { backgroundColor: markColor } : undefined}
                >
                  {i + 1}
                  {entry?.note && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white/90" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useSaveHabit } from "@/hooks/useHabits";
import { HABIT_COLORS, WEEKDAY_LABELS, type Habit } from "@/lib/habits";
import { HabitIcon, HABIT_ICON_NAMES } from "@/lib/habit-icons";
import { toast } from "sonner";

interface HabitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit | null;
}

export function HabitForm({ open, onOpenChange, habit }: HabitFormProps) {
  const save = useSaveHabit();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("check");
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [targetPerWeek, setTargetPerWeek] = useState(3);
  const [group, setGroup] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? "");
    setIcon(habit?.icon ?? "check");
    setColor(habit?.color ?? HABIT_COLORS[0]);
    setFrequency((habit?.frequency as "daily" | "weekly") ?? "daily");
    setWeekdays(habit?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);
    setTargetPerWeek(habit?.target_per_week ?? 3);
    setGroup(habit?.group_name ?? "");
  }, [open, habit]);

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Dê um nome ao hábito");
    if (frequency === "daily" && weekdays.length === 0)
      return toast.error("Selecione pelo menos um dia da semana");
    save.mutate(
      {
        id: habit?.id,
        name: name.trim(),
        icon,
        color,
        frequency,
        weekdays,
        target_per_week: targetPerWeek,
        group_name: group.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(habit ? "Hábito atualizado" : "Hábito criado");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{habit ? "Editar hábito" : "Novo hábito"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="habit-name">Nome</Label>
            <Input
              id="habit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Beber 2L de água"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-1.5">
              {HABIT_ICON_NAMES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setIcon(n)}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                    icon === n
                      ? "text-accent-foreground bg-accent shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label={`Ícone ${n}`}
                  aria-pressed={icon === n}
                >
                  <HabitIcon name={n} className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-1.5">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-offset-background scale-110" : ""}`}
                  style={{ backgroundColor: c, ["--tw-ring-color" as string]: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Frequência</Label>
            <Tabs value={frequency} onValueChange={(v) => setFrequency(v as "daily" | "weekly")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="daily">Dias fixos</TabsTrigger>
                <TabsTrigger value="weekly">Meta semanal</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {frequency === "daily" ? (
            <div className="space-y-2">
              <Label>Dias da semana</Label>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    className={`h-9 rounded-lg text-xs font-medium transition-colors ${
                      weekdays.includes(day)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Quantas vezes por semana?</Label>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTargetPerWeek(n)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                      targetPerWeek === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="habit-group">Grupo (opcional)</Label>
            <Input
              id="habit-group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="Ex.: Manhã, Saúde, Estudos"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={save.isPending} className="w-full">
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {habit ? "Salvar alterações" : "Criar hábito"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

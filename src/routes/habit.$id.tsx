import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppShell } from "@/components/AppShell";
import { MonthCalendar } from "@/components/MonthCalendar";
import { StatTile } from "@/components/StatTile";
import { HabitForm } from "@/components/HabitForm";
import { HabitIcon } from "@/lib/habit-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Flame,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  useHabits,
  useEntries,
  useToggleEntry,
  useSaveHabit,
  useDeleteHabit,
  useSaveEntryNote,
  HISTORY_DAYS,
} from "@/hooks/useHabits";
import {
  currentStreak,
  bestStreak,
  completionRate,
  scheduleLabel,
  isQuit,
  type HabitEntry,
} from "@/lib/habits";
import { toast } from "sonner";

export const Route = createFileRoute("/habit/$id")({ component: HabitDetailPage });

function HabitDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: habits, isLoading: loadingHabits } = useHabits();
  const { data: entries, isLoading: loadingEntries } = useEntries();
  const toggle = useToggleEntry();
  const save = useSaveHabit();
  const remove = useDeleteHabit();
  const saveNote = useSaveEntryNote();

  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteFor, setNoteFor] = useState<{ date: Date; entry: HabitEntry } | null>(null);
  const [noteText, setNoteText] = useState("");

  const habit = (habits ?? []).find((h) => h.id === id);

  if (loadingHabits || loadingEntries) {
    return (
      <AppShell>
        <div className="text-sm text-muted-foreground text-center py-8">Carregando...</div>
      </AppShell>
    );
  }

  if (!habit) {
    return (
      <AppShell>
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-muted-foreground">Hábito não encontrado.</p>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/habits">Voltar para Hábitos</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const habitEntries = (entries ?? []).filter((e) => e.habit_id === habit.id);
  const entriesByDate = new Map(habitEntries.map((e) => [e.entry_date, e]));
  const doneDates = new Set(entriesByDate.keys());
  const today = new Date();

  const quit = isQuit(habit);
  const streak = currentStreak(habit, doneDates, today);
  const best = bestStreak(habit, doneDates, HISTORY_DAYS, today);
  const rate = completionRate(habit, doneDates, 30, today);
  const streakUnit = habit.frequency === "weekly" && !quit ? "sem" : "d";

  function handleDayClick(date: Date, entry: HabitEntry | undefined) {
    if (!entry) {
      toggle.mutate({ habitId: habit!.id, date, done: false });
    } else {
      setNoteText(entry.note ?? "");
      setNoteFor({ date, entry });
    }
  }

  return (
    <AppShell>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => history.back()} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${habit.color}22`, color: habit.color }}
        >
          <HabitIcon name={habit.icon} className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight truncate">{habit.name}</h1>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {scheduleLabel(habit)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <StatTile
          icon={<Flame className="h-4 w-4" />}
          label={quit ? "Dias livre" : "Streak atual"}
          value={`${streak}${streakUnit}`}
        />
        <StatTile
          icon={<Trophy className="h-4 w-4" />}
          label={quit ? "Melhor período" : "Melhor streak"}
          value={`${best}${streakUnit}`}
        />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4" />}
          label={quit ? "Recaídas" : "Check-ins"}
          value={String(habitEntries.length)}
        />
        <StatTile
          icon={<TrendingUp className="h-4 w-4" />}
          label="Taxa (30d)"
          value={`${Math.round(rate * 100)}%`}
        />
      </div>

      <MonthCalendar habit={habit} entriesByDate={entriesByDate} onDayClick={handleDayClick} />
      <p className="text-[11px] text-muted-foreground text-center mt-2 mb-6">
        {quit
          ? "Toque num dia para registrar uma recaída; toque num dia marcado para anotar ou remover."
          : "Toque num dia para marcar; toque num dia concluído para anotar ou desmarcar."}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setFormOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() =>
            save.mutate(
              { id: habit.id, archived: !habit.archived, name: habit.name },
              {
                onSuccess: () =>
                  toast.success(habit.archived ? "Hábito reativado" : "Hábito arquivado"),
              },
            )
          }
        >
          {habit.archived ? (
            <>
              <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />
              Reativar
            </>
          ) : (
            <>
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Arquivar
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Excluir
        </Button>
      </div>

      <HabitForm open={formOpen} onOpenChange={setFormOpen} habit={habit} />

      {/* Nota / desmarcar check-in */}
      <Dialog open={!!noteFor} onOpenChange={(open) => !open && setNoteFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {noteFor && format(noteFor.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={quit ? "O que aconteceu? (opcional)" : "Como foi? (opcional)"}
            rows={3}
          />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={toggle.isPending}
              onClick={() => {
                if (!noteFor) return;
                toggle.mutate(
                  { habitId: habit.id, date: noteFor.date, done: true },
                  { onSuccess: () => toast.success("Check-in desmarcado") },
                );
                setNoteFor(null);
              }}
            >
              {quit ? "Remover recaída" : "Desmarcar check-in"}
            </Button>
            <Button
              disabled={saveNote.isPending}
              onClick={() => {
                if (!noteFor) return;
                saveNote.mutate(
                  { habitId: habit.id, date: noteFor.date, note: noteText },
                  { onSuccess: () => toast.success("Nota salva") },
                );
                setNoteFor(null);
              }}
            >
              {saveNote.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{habit.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Todo o histórico de check-ins deste hábito será apagado. Essa ação não pode ser
              desfeita. Se quiser só pausar, prefira arquivar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                remove.mutate(habit.id, {
                  onSuccess: () => {
                    toast.success("Hábito excluído");
                    navigate({ to: "/habits" });
                  },
                })
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

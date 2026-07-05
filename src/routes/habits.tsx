import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HabitForm } from "@/components/HabitForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useHabits, useSaveHabit, useDeleteHabit } from "@/hooks/useHabits";
import { WEEKDAY_LABELS, type Habit } from "@/lib/habits";
import { HabitIcon } from "@/lib/habit-icons";
import { toast } from "sonner";

export const Route = createFileRoute("/habits")({ component: HabitsPage });

function HabitsPage() {
  const { data: habits, isLoading } = useHabits();
  const save = useSaveHabit();
  const remove = useDeleteHabit();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [deleting, setDeleting] = useState<Habit | null>(null);

  const active = (habits ?? []).filter((h) => !h.archived);
  const archived = (habits ?? []).filter((h) => h.archived);

  function toggleArchive(habit: Habit) {
    save.mutate(
      { id: habit.id, archived: !habit.archived, name: habit.name },
      { onSuccess: () => toast.success(habit.archived ? "Hábito reativado" : "Hábito arquivado") },
    );
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hábitos</h1>
          <p className="text-sm text-muted-foreground">
            Crie e organize o que você quer acompanhar
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-8">Carregando...</div>
      ) : active.length === 0 && archived.length === 0 ? (
        <Card className="border-dashed bg-secondary/40">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum hábito ainda. Crie o primeiro para começar a acompanhar.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {active.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onEdit={() => {
                  setEditing(habit);
                  setFormOpen(true);
                }}
                onArchive={() => toggleArchive(habit)}
                onDelete={() => setDeleting(habit)}
              />
            ))}
          </div>

          {archived.length > 0 && (
            <>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mt-8 mb-2">
                Arquivados
              </div>
              <div className="space-y-2 opacity-60">
                {archived.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onEdit={() => {
                      setEditing(habit);
                      setFormOpen(true);
                    }}
                    onArchive={() => toggleArchive(habit)}
                    onDelete={() => setDeleting(habit)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <HabitForm open={formOpen} onOpenChange={setFormOpen} habit={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Todo o histórico de check-ins deste hábito será apagado. Essa ação não pode ser
              desfeita. Se quiser só pausar, prefira arquivar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleting) return;
                remove.mutate(deleting.id, { onSuccess: () => toast.success("Hábito excluído") });
                setDeleting(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function HabitCard({
  habit,
  onEdit,
  onArchive,
  onDelete,
}: {
  habit: Habit;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const scheduleLabel =
    habit.frequency === "weekly"
      ? `${habit.target_per_week}x por semana`
      : habit.weekdays.length === 7
        ? "Todos os dias"
        : habit.weekdays.map((d) => WEEKDAY_LABELS[d]).join(" ");

  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${habit.color}22`, color: habit.color }}
        >
          <HabitIcon name={habit.icon} className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">{habit.name}</div>
          <div className="mt-0.5">
            <Badge variant="secondary" className="text-[10px] font-normal">
              {scheduleLabel}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Opções de ${habit.name}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}>
              {habit.archived ? (
                <>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Reativar
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

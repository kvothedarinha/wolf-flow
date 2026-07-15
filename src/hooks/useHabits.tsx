import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { toDateKey, type Habit, type HabitEntry } from "@/lib/habits";
import { toast } from "sonner";
import {
  dbGetHabits,
  dbUpsertHabit,
  dbDeleteHabit,
  dbGetEntries,
  dbToggleEntry,
  dbUpdateEntryNote,
} from "@/lib/local-db";

export const HISTORY_DAYS = 366;

export function useHabits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habits", user?.id],
    enabled: !!user,
    queryFn: (): Habit[] => dbGetHabits(user!.id),
  });
}

export function useEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habit_entries", user?.id],
    enabled: !!user,
    queryFn: (): HabitEntry[] => {
      const since = toDateKey(subDays(new Date(), HISTORY_DAYS));
      return dbGetEntries(user!.id, since);
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    queryClient.invalidateQueries({ queryKey: ["habit_entries"] });
  };
}

export function useSaveHabit() {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (habit: Partial<Habit> & { name: string }) => {
      if (!user) throw new Error("Sem sessão");
      dbUpsertHabit(user.id, habit);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHabit() {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sem sessão");
      dbDeleteHabit(user.id, id);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveEntryNote() {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ habitId, date, note }: { habitId: string; date: Date; note: string }) => {
      if (!user) throw new Error("Sem sessão");
      dbUpdateEntryNote(user.id, habitId, date, note);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleEntry() {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ habitId, date, done }: { habitId: string; date: Date; done: boolean }) => {
      if (!user) throw new Error("Sem sessão");
      dbToggleEntry(user.id, habitId, date, done);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
}

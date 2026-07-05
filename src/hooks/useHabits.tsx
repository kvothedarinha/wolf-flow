import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toDateKey, type Habit, type HabitEntry } from "@/lib/habits";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

/** Janela de histórico carregada para streaks e estatísticas. */
export const HISTORY_DAYS = 120;

export function useHabits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habits", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Habit[]> => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habit_entries", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<HabitEntry[]> => {
      const since = toDateKey(subDays(new Date(), HISTORY_DAYS));
      const { data, error } = await supabase
        .from("habit_entries")
        .select("*")
        .gte("entry_date", since);
      if (error) throw error;
      return data;
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
    mutationFn: async (habit: Omit<TablesInsert<"habits">, "user_id"> & { id?: string }) => {
      if (!user) throw new Error("Sem sessão");
      if (habit.id) {
        const { id, ...fields } = habit;
        const { error } = await supabase
          .from("habits")
          .update(fields as TablesUpdate<"habits">)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("habits").insert({ ...habit, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHabit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Salva a nota de um check-in existente. */
export function useSaveEntryNote() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ habitId, date, note }: { habitId: string; date: Date; note: string }) => {
      const { error } = await supabase
        .from("habit_entries")
        .update({ note: note.trim() || null })
        .eq("habit_id", habitId)
        .eq("entry_date", toDateKey(date));
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Marca/desmarca o check-in de um hábito em uma data. */
export function useToggleEntry() {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ habitId, date, done }: { habitId: string; date: Date; done: boolean }) => {
      if (!user) throw new Error("Sem sessão");
      const entryDate = toDateKey(date);
      if (done) {
        const { error } = await supabase
          .from("habit_entries")
          .delete()
          .eq("habit_id", habitId)
          .eq("entry_date", entryDate);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("habit_entries")
          .insert({ habit_id: habitId, user_id: user.id, entry_date: entryDate });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
}

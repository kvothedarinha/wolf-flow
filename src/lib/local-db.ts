/**
 * Banco de dados local via localStorage.
 * Substitui Supabase enquanto o backend não está configurado.
 */
import { toDateKey } from "./habits";
import type { Habit, HabitEntry } from "./habits";

// ─── Contas ───────────────────────────────────────────────────────────────

export interface LocalAccount {
  id: string;
  name: string;
  email: string;
  password: string;
}

const ACCOUNTS_KEY = "wf-accounts";
const SESSION_KEY = "wf-session";

function loadAccounts(): LocalAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveAccounts(accounts: LocalAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function dbSignUp(name: string, email: string, password: string): LocalAccount {
  const accounts = loadAccounts();
  if (accounts.find((a) => a.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Este e-mail já está cadastrado.");
  }
  const account: LocalAccount = { id: crypto.randomUUID(), name, email, password };
  saveAccounts([...accounts, account]);
  localStorage.setItem(SESSION_KEY, account.id);
  return account;
}

export function dbSignIn(email: string, password: string): LocalAccount {
  const account = loadAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!account) throw new Error("E-mail não encontrado.");
  if (account.password !== password) throw new Error("Senha incorreta.");
  localStorage.setItem(SESSION_KEY, account.id);
  return account;
}

export function dbSignOut() {
  localStorage.removeItem(SESSION_KEY);
}

export function dbCurrentAccount(): LocalAccount | null {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return loadAccounts().find((a) => a.id === id) ?? null;
}

export function dbUpdateName(userId: string, name: string) {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.id === userId);
  if (idx === -1) throw new Error("Conta não encontrada.");
  accounts[idx] = { ...accounts[idx], name };
  saveAccounts(accounts);
}

// ─── Hábitos ──────────────────────────────────────────────────────────────

function habitsKey(userId: string) {
  return `wf-habits-${userId}`;
}

function entriesKey(userId: string) {
  return `wf-entries-${userId}`;
}

function loadHabits(userId: string): Habit[] {
  try {
    return JSON.parse(localStorage.getItem(habitsKey(userId)) ?? "[]");
  } catch {
    return [];
  }
}

function saveHabits(userId: string, habits: Habit[]) {
  localStorage.setItem(habitsKey(userId), JSON.stringify(habits));
}

function loadEntries(userId: string): HabitEntry[] {
  try {
    return JSON.parse(localStorage.getItem(entriesKey(userId)) ?? "[]");
  } catch {
    return [];
  }
}

function saveEntries(userId: string, entries: HabitEntry[]) {
  localStorage.setItem(entriesKey(userId), JSON.stringify(entries));
}

export function dbGetHabits(userId: string): Habit[] {
  return loadHabits(userId).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function dbUpsertHabit(userId: string, habit: Partial<Habit> & { name: string }): Habit {
  const habits = loadHabits(userId);
  const now = new Date().toISOString();

  if (habit.id) {
    const idx = habits.findIndex((h) => h.id === habit.id);
    if (idx === -1) throw new Error("Hábito não encontrado.");
    const updated = { ...habits[idx], ...habit, updated_at: now };
    habits[idx] = updated;
    saveHabits(userId, habits);
    return updated;
  }

  const newHabit: Habit = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: habit.name,
    description: habit.description ?? null,
    icon: habit.icon ?? "check",
    color: habit.color ?? "#6366f1",
    kind: habit.kind ?? "build",
    frequency: habit.frequency ?? "daily",
    weekdays: habit.weekdays ?? [0, 1, 2, 3, 4, 5, 6],
    target_per_week: habit.target_per_week ?? 3,
    group_name: habit.group_name ?? null,
    auto_source: habit.auto_source ?? null,
    archived: habit.archived ?? false,
    created_at: now,
    updated_at: now,
  };
  saveHabits(userId, [...habits, newHabit]);
  return newHabit;
}

export function dbDeleteHabit(userId: string, habitId: string) {
  saveHabits(
    userId,
    loadHabits(userId).filter((h) => h.id !== habitId)
  );
  saveEntries(
    userId,
    loadEntries(userId).filter((e) => e.habit_id !== habitId)
  );
}

export function dbGetEntries(userId: string, sinceDate: string): HabitEntry[] {
  return loadEntries(userId).filter((e) => e.entry_date >= sinceDate);
}

export function dbToggleEntry(userId: string, habitId: string, date: Date, done: boolean) {
  const entries = loadEntries(userId);
  const entryDate = toDateKey(date);

  if (done) {
    // remove
    saveEntries(
      userId,
      entries.filter((e) => !(e.habit_id === habitId && e.entry_date === entryDate))
    );
  } else {
    // add (se não existir)
    const exists = entries.some((e) => e.habit_id === habitId && e.entry_date === entryDate);
    if (!exists) {
      const entry: HabitEntry = {
        id: crypto.randomUUID(),
        habit_id: habitId,
        user_id: userId,
        entry_date: entryDate,
        note: null,
        created_at: new Date().toISOString(),
      };
      saveEntries(userId, [...entries, entry]);
    }
  }
}

export function dbUpdateEntryNote(userId: string, habitId: string, date: Date, note: string) {
  const entries = loadEntries(userId);
  const entryDate = toDateKey(date);
  const idx = entries.findIndex((e) => e.habit_id === habitId && e.entry_date === entryDate);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], note: note.trim() || null };
    saveEntries(userId, entries);
  }
}

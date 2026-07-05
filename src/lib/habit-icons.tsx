import {
  Check,
  Droplets,
  Footprints,
  Dumbbell,
  BookOpen,
  Brain,
  Moon,
  PenLine,
  Salad,
  Music,
  HeartPulse,
  Languages,
  Sun,
  type LucideIcon,
} from "lucide-react";

/** Ícones disponíveis para hábitos; o nome é o valor salvo na coluna `habits.icon`. */
export const HABIT_ICONS: Record<string, LucideIcon> = {
  check: Check,
  droplets: Droplets,
  footprints: Footprints,
  dumbbell: Dumbbell,
  "book-open": BookOpen,
  brain: Brain,
  moon: Moon,
  "pen-line": PenLine,
  salad: Salad,
  music: Music,
  "heart-pulse": HeartPulse,
  languages: Languages,
  sun: Sun,
};

export const HABIT_ICON_NAMES = Object.keys(HABIT_ICONS);

export function HabitIcon({ name, className }: { name: string; className?: string }) {
  const Icon = HABIT_ICONS[name] ?? Check;
  return <Icon className={className} />;
}

import { Check } from "lucide-react";

/** Checkbox quadrado arredondado com animação (estilo do template todo). */
export function HabitCheckbox({
  done,
  color,
  label,
  disabled,
  onToggle,
}: {
  done: boolean;
  color: string;
  label: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={done}
      className={`h-8 w-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-150 active:scale-90 ${
        done ? "text-white" : "border-border text-transparent hover:border-ring"
      }`}
      style={done ? { backgroundColor: color, borderColor: color } : undefined}
    >
      <Check
        className={`h-4.5 w-4.5 transition-transform duration-150 ${done ? "scale-100" : "scale-50"}`}
        strokeWidth={3.5}
      />
    </button>
  );
}

import { useState } from "react";
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
  const [popping, setPopping] = useState(false);

  function handleClick() {
    setPopping(true);
    setTimeout(() => setPopping(false), 180);
    onToggle();
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={done}
      className={`h-11 w-11 rounded-xl border-2 flex items-center justify-center shrink-0 transition-colors duration-150 ${
        done ? "text-white" : "border-border text-transparent hover:border-ring"
      }`}
      style={{
        ...(done ? { backgroundColor: color, borderColor: color } : undefined),
        transform: popping ? "scale(1.15)" : "scale(1)",
        transition: "transform .18s cubic-bezier(.34,1.56,.64,1), background-color .15s, border-color .15s",
      }}
    >
      <Check
        className="h-4.5 w-4.5"
        strokeWidth={3.5}
        style={{
          transform: `scale(${done ? (popping ? 1.1 : 1) : 0.5})`,
          transition: "transform .18s",
        }}
      />
    </button>
  );
}

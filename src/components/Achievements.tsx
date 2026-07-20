import { useEffect, useRef, useState } from "react";
import { Flame, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STREAK_MILESTONES = [2, 5, 7, 14, 30, 60, 90, 180, 365];
const CHECKIN_MILESTONES = [7, 30, 100, 250, 500, 1000];

/** Badges de conquistas (padrão da tela "Conquistas" da referência). */
export function Achievements({
  longestStreakDays,
  totalCheckins,
}: {
  longestStreakDays: number;
  totalCheckins: number;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <BadgeRow
          title="Sequência mais longa"
          icon={<Flame className="h-5 w-5" />}
          milestones={STREAK_MILESTONES}
          reached={longestStreakDays}
          unit="dias"
        />
        <BadgeRow
          title="Check-ins totais"
          icon={<CheckCircle2 className="h-5 w-5" />}
          milestones={CHECKIN_MILESTONES}
          reached={totalCheckins}
          unit=""
        />
      </CardContent>
    </Card>
  );
}

function BadgeRow({
  title,
  icon,
  milestones,
  reached,
  unit,
}: {
  title: string;
  icon: React.ReactNode;
  milestones: number[];
  reached: number;
  unit: string;
}) {
  return (
    <div>
      <div className="text-xs font-bold text-muted-foreground mb-2">{title}</div>
      <div className="grid grid-cols-3 gap-2">
        {milestones.map((m) => (
          <Medal key={m} milestone={m} reached={reached} unit={unit} icon={icon} />
        ))}
      </div>
    </div>
  );
}

function Medal({
  milestone,
  reached,
  unit,
  icon,
}: {
  milestone: number;
  reached: number;
  unit: string;
  icon: React.ReactNode;
}) {
  const unlocked = reached >= milestone;
  const wasUnlockedRef = useRef(unlocked);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (unlocked && !wasUnlockedRef.current) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 900);
      wasUnlockedRef.current = unlocked;
      return () => clearTimeout(t);
    }
    wasUnlockedRef.current = unlocked;
  }, [unlocked]);

  return (
    <div
      className="flex flex-col items-center gap-1"
      title={unlocked ? "Conquistado" : `Alcance ${milestone}${unit ? ` ${unit}` : ""}`}
    >
      <div
        className="h-12 w-12 rounded-full flex items-center justify-center transition-colors"
        style={{
          background: unlocked
            ? "linear-gradient(135deg, var(--warning), color-mix(in oklch, var(--warning) 80%, black))"
            : "var(--secondary)",
          color: unlocked ? "#fff" : "var(--muted-foreground)",
          animation: flashing
            ? "wf-unlock-bounce .6s ease, wf-glow-pulse 1.1s ease"
            : "none",
        }}
      >
        {icon}
      </div>
      <span
        className={`text-[11px] tabular-nums mt-1 ${
          unlocked ? "font-bold" : "text-muted-foreground"
        }`}
      >
        {milestone}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}

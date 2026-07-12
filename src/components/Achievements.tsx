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
        {milestones.map((m) => {
          const unlocked = reached >= m;
          return (
            <div
              key={m}
              className="flex flex-col items-center gap-1"
              title={unlocked ? "Conquistado" : `Alcance ${m}${unit ? ` ${unit}` : ""}`}
            >
              <div
                className={`h-12 w-12 rounded-2xl rotate-45 flex items-center justify-center transition-colors ${
                  unlocked
                    ? "bg-warning text-white shadow-sm"
                    : "bg-secondary text-muted-foreground/50"
                }`}
              >
                <span className="-rotate-45">{icon}</span>
              </div>
              <span
                className={`text-[11px] tabular-nums mt-1 ${
                  unlocked ? "font-bold" : "text-muted-foreground"
                }`}
              >
                {m}
                {unit ? ` ${unit}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

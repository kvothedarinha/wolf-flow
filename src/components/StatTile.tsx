import { Card, CardContent } from "@/components/ui/card";

export function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
          {icon}
          {label}
        </div>
        <div className="text-[22px] font-extrabold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

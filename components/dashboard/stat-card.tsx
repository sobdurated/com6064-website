import { Card } from "@/components/retroui/Card";
import { Text } from "@/components/retroui/Text";

type StatCardProps = {
  title: string;
  value: string;
  change: string;
  tone?: "up" | "down" | "flat";
};

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  up: "text-emerald-700",
  down: "text-rose-700",
  flat: "text-zinc-700",
};

export function StatCard({ title, value, change, tone = "flat" }: StatCardProps) {
  return (
    <Card className="w-full">
      <Card.Content className="space-y-1">
        <Text className="text-muted-foreground">{title}</Text>
        <Text as="h3">{value}</Text>
        <Text className={toneClass[tone]}>{change}</Text>
      </Card.Content>
    </Card>
  );
}

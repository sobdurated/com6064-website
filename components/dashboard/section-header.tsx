import { Text } from "@/components/retroui/Text";

type SectionHeaderProps = {
  title: string;
  description?: string;
};

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="space-y-1">
      <Text as="h3">{title}</Text>
      {description ? <Text className="text-muted-foreground">{description}</Text> : null}
    </div>
  );
}

import { Badge } from "@/components/retroui/Badge";

export type Sentiment = "positive" | "negative";

const sentimentStyles: Record<Sentiment, string> = {
  positive: "bg-emerald-300 text-black",
  negative: "bg-rose-300 text-black",
};

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return (
    <Badge className={sentimentStyles[sentiment]} variant="solid" size="sm">
      {sentiment}
    </Badge>
  );
}

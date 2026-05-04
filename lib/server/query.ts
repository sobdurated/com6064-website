import { ObjectId } from "mongodb";

export type CommonFilters = {
  from?: Date;
  to?: Date;
  source?: string;
  language?: string;
  province?: string;
  district?: string;
  sentiment?: "positive" | "negative";
  q?: string;
  page: number;
  limit: number;
  sort: "newest" | "oldest";
  model: "llm" | "transformer";
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function parseIntWithFallback(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function parseCommonFilters(searchParams: URLSearchParams): CommonFilters {
  const from = parseDate(searchParams.get("from")) ?? undefined;
  const to = parseDate(searchParams.get("to")) ?? undefined;

  const source = searchParams.get("source") ?? undefined;
  const language = searchParams.get("language") ?? undefined;
  const province = searchParams.get("province") ?? undefined;
  const district = searchParams.get("district") ?? undefined;
  const sentimentRaw = searchParams.get("sentiment");
  const sentiment =
    sentimentRaw === "positive" || sentimentRaw === "negative"
      ? sentimentRaw
      : undefined;
  const q = searchParams.get("q") ?? undefined;

  const page = Math.max(1, parseIntWithFallback(searchParams.get("page"), 1));
  const limit = Math.min(100, Math.max(1, parseIntWithFallback(searchParams.get("limit"), 20)));
  const sort = searchParams.get("sort") === "oldest" ? "oldest" : "newest";
  const modelRaw = searchParams.get("model");
  const model = modelRaw === "transformer" ? "transformer" : "llm";

  return {
    from,
    to,
    source,
    language,
    province,
    district,
    sentiment,
    q,
    page,
    limit,
    sort,
    model,
  };
}

export function normalizeProvinceName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export function parseObjectId(input: string) {
  if (!ObjectId.isValid(input)) return null;
  return new ObjectId(input);
}

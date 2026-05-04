import type { SentimentRatioRow } from "@/lib/api/types";
import { getDb, collections, buildProcessedMatch, getSamplingPipeline } from "@/lib/server/mongo";
import { parseCommonFilters } from "@/lib/server/query";
import { apiError, apiOk } from "@/lib/server/response";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseCommonFilters(url.searchParams);
    const db = await getDb();

    const rows = await db
      .collection(collections.postsProcessed)
      .aggregate([
        { $match: buildProcessedMatch(filters) },
        // ...getSamplingPipeline(),
        {
          $group: {
            _id: null,
            total_posts: { $sum: 1 },
            positive_count: { $sum: { $cond: [{ $eq: [`$sentiment.${filters.model}.label`, "positive"] }, 1, 0] } },
            negative_count: { $sum: { $cond: [{ $eq: [`$sentiment.${filters.model}.label`, "negative"] }, 1, 0] } },
          },
        },
      ], { allowDiskUse: true })
      .toArray();

    const row = rows[0];
    const total = row?.total_posts ?? 0;

    const payload: SentimentRatioRow[] = [
      {
        label: "positive",
        value: total > 0 ? row.positive_count / total : 0,
      },
      {
        label: "negative",
        value: total > 0 ? row.negative_count / total : 0,
      },
    ];

    return apiOk(payload);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to load sentiment ratio", 500);
  }
}

import type { DistrictMapRow } from "@/lib/api/types";
import { getDb, collections } from "@/lib/server/mongo";
import { parseCommonFilters } from "@/lib/server/query";
import { apiError, apiOk } from "@/lib/server/response";

export async function GET(
  request: Request,
  context: { params: Promise<{ province: string }> },
) {
  try {
    const { province } = await context.params;
    const url = new URL(request.url);
    const filters = parseCommonFilters(url.searchParams);
    const db = await getDb();

    const rows = await db
      .collection(collections.sentimentAggregates)
      .aggregate([
        {
          $match: {
            province,
            ...(filters.from ? { "time_window.start": { $gte: filters.from } } : {}),
            ...(filters.to ? { "time_window.end": { $lte: filters.to } } : {}),
          },
        },
        {
          $group: {
            _id: "$district",
            total_posts: { $sum: "$total_posts" },
            avg_sentiment_weight: {
              $sum: { $multiply: ["$average_sentiment", "$total_posts"] },
            },
            positive_weight: { $sum: { $multiply: ["$ratios.positive", "$total_posts"] } },
            negative_weight: { $sum: { $multiply: ["$ratios.negative", "$total_posts"] } },
          },
        },
        { $sort: { total_posts: -1 } },
      ])
      .toArray();

    const payload: DistrictMapRow[] = rows
      .filter((row) => row._id)
      .map((row) => ({
        district: row._id,
        total_posts: row.total_posts,
        average_sentiment: row.total_posts > 0 ? row.avg_sentiment_weight / row.total_posts : 0,
        ratios: {
          positive: row.total_posts > 0 ? row.positive_weight / row.total_posts : 0,
          negative: row.total_posts > 0 ? row.negative_weight / row.total_posts : 0,
        },
      }));

    return apiOk(payload);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to load district breakdown", 500);
  }
}

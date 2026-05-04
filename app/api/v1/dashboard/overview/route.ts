import type { DashboardOverviewResponse } from "@/lib/api/types";
import { getDb, collections, buildProcessedMatch, getSamplingPipeline } from "@/lib/server/mongo";
import { parseCommonFilters } from "@/lib/server/query";
import { apiError, apiOk } from "@/lib/server/response";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseCommonFilters(url.searchParams);
    const db = await getDb();

    const match = buildProcessedMatch(filters);

    const rows = await db
      .collection(collections.postsProcessed)
      .aggregate([
        { $match: match },
        ...getSamplingPipeline(),
        {
          $group: {
            _id: null,
            total_posts: { $sum: 1 },
            weighted_sentiment_sum: {
              $sum: {
                $add: [
                  0.5,
                  {
                    $switch: {
                      branches: [
                        {
                          case: { $eq: [`$sentiment.${filters.model}.label`, "positive"] },
                          then: { $divide: [`$sentiment.${filters.model}.score`, 2] },
                        },
                        {
                          case: { $eq: [`$sentiment.${filters.model}.label`, "negative"] },
                          then: { $divide: [{ $multiply: [`$sentiment.${filters.model}.score`, -1] }, 2] },
                        },
                      ],
                      default: 0,
                    },
                  },
                ],
              },
            },
            positive_count: { $sum: { $cond: [{ $eq: [`$sentiment.${filters.model}.label`, "positive"] }, 1, 0] } },
            negative_count: { $sum: { $cond: [{ $eq: [`$sentiment.${filters.model}.label`, "negative"] }, 1, 0] } },
          },
        },
      ], { allowDiskUse: true })
      .toArray();

    const row = rows[0];
    if (!row || row.total_posts === 0) {
      const empty: DashboardOverviewResponse = {
        total_posts: 0,
        average_sentiment: 0,
        positive_ratio: 0,
        negative_ratio: 0,
      };
      return apiOk(empty);
    }

    const payload: DashboardOverviewResponse = {
      total_posts: row.total_posts,
      average_sentiment: row.weighted_sentiment_sum / row.total_posts,
      positive_ratio: row.positive_count / row.total_posts,
      negative_ratio: row.negative_count / row.total_posts,
    };

    return apiOk(payload);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to load dashboard overview", 500);
  }
}

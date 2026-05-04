import type { ProvinceMapRow } from "@/lib/api/types";
import { getDb, collections, buildProcessedMatch, getSamplingPipeline } from "@/lib/server/mongo";
import { isValidProvince } from "@/lib/utils/provinces";
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
        // ...getSamplingPipeline(),
        {
          $group: {
            _id: "$location.province",
            total_posts: { $sum: 1 },
            avg_sentiment_weight: {
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
            positive_weight: { $sum: { $cond: [{ $eq: [`$sentiment.${filters.model}.label`, "positive"] }, 1, 0] } },
            negative_weight: { $sum: { $cond: [{ $eq: [`$sentiment.${filters.model}.label`, "negative"] }, 1, 0] } },
          },
        },
        { $sort: { total_posts: -1 } },
      ], { allowDiskUse: true })
      .toArray();

    let payload: ProvinceMapRow[] = rows
      .filter((row) => row._id && isValidProvince(row._id))
      .map((row) => ({
        province: row._id,
        total_posts: row.total_posts,
        average_sentiment: row.total_posts > 0 ? row.avg_sentiment_weight / row.total_posts : 0,
        ratios: {
          positive: row.total_posts > 0 ? row.positive_weight / row.total_posts : 0,
          negative: row.total_posts > 0 ? row.negative_weight / row.total_posts : 0,
        },
      }));

    return apiOk(payload);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to load map provinces", 500);
  }
}

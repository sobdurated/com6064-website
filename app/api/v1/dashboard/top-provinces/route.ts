import type { TopProvinceRow } from "@/lib/api/types";
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
            _id: "$location.province",
            total_posts: { $sum: 1 },
            positive_count: { $sum: { $cond: [{ $eq: [`$sentiment.${filters.model}.label`, "positive"] }, 1, 0] } },
          },
        },
        { $sort: { total_posts: -1 } },
        { $limit: 10 },
      ], { allowDiskUse: true })
      .toArray();

    const payload: TopProvinceRow[] = rows
      .filter((row) => row._id)
      .map((row) => ({
        province: row._id,
        total_posts: row.total_posts,
        positive_ratio: row.total_posts > 0 ? row.positive_count / row.total_posts : 0,
      }));

    return apiOk(payload);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to load top provinces", 500);
  }
}

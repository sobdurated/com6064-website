import type { DistrictMapRow } from "@/lib/api/types";
import { getDb, collections, buildProcessedMatch } from "@/lib/server/mongo";
import { isValidProvince } from "@/lib/utils/provinces";
import { parseCommonFilters } from "@/lib/server/query";
import { apiError, apiOk } from "@/lib/server/response";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ province: string }> }
) {
  try {
    const { province: rawProvince } = await ctx.params;
    const province = decodeURIComponent(rawProvince);

    if (!isValidProvince(province)) {
      return apiError("Province not found", 404);
    }

    const url = new URL(request.url);
    const filters = parseCommonFilters(url.searchParams);

    filters.province = province;

    const db = await getDb();
    const match = buildProcessedMatch(filters);

    const pipeline: any[] = [
      { $match: match },
    ];

    if (filters.q) {
      pipeline.push(
        {
          $addFields: {
            postObjectId: {
              $convert: { input: "$post_id", to: "objectId", onError: null, onNull: null },
            },
          },
        },
        {
          $lookup: {
            from: collections.postsRaw,
            localField: "postObjectId",
            foreignField: "_id",
            as: "raw",
          },
        },
        { $unwind: "$raw" },
        {
          $match: {
            "raw.post_tags": { $regex: filters.q.replace(/^#/, ""), $options: "i" },
          },
        }
      );
    }

    pipeline.push(
      {
        $group: {
          _id: "$location.district",
          total_posts: { $sum: 1 },
          avg_sentiment_weight: {
            $sum: {
              $switch: {
                branches: [
                  {
                    case: { $eq: [`$sentiment.${filters.model}.label`, "positive"] },
                    then: `$sentiment.${filters.model}.score`,
                  },
                  {
                    case: { $eq: [`$sentiment.${filters.model}.label`, "negative"] },
                    then: { $multiply: [`$sentiment.${filters.model}.score`, -1] },
                  },
                ],
                default: 0,
              },
            },
          },
          positive_weight: {
            $sum: { $cond: [{ $eq: [`$sentiment.${filters.model}.label`, "positive"] }, 1, 0] },
          },
          negative_weight: {
            $sum: { $cond: [{ $eq: [`$sentiment.${filters.model}.label`, "negative"] }, 1, 0] },
          },
        },
      },
      { $sort: { total_posts: -1 } }
    );

    const rows = await db
      .collection(collections.postsProcessed)
      .aggregate(pipeline, { allowDiskUse: true })
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
    return apiError(
      error instanceof Error ? error.message : "Failed to load district breakdown",
      500
    );
  }
}

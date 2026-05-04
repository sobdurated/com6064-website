import type { DashboardTrendPoint } from "@/lib/api/types";
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
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: { $toDate: "$raw.created_at" },
                },
              },
              sentiment: `$sentiment.${filters.model}.label`,
            },
            total: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.date",
            positive: {
              $sum: {
                $cond: [{ $eq: ["$_id.sentiment", "positive"] }, "$total", 0],
              },
            },
            negative: {
              $sum: {
                $cond: [{ $eq: ["$_id.sentiment", "negative"] }, "$total", 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ], { allowDiskUse: true })
      .toArray();

    const payload: DashboardTrendPoint[] = rows.map((row) => ({
      date: row._id,
      positive: row.positive ?? 0,
      negative: row.negative ?? 0,
    }));

    return apiOk(payload);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to load trend data", 500);
  }
}

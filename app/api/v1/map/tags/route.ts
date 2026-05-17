import { getDb, collections, buildProcessedMatch } from "@/lib/server/mongo";
import { parseCommonFilters } from "@/lib/server/query";
import { apiError, apiOk } from "@/lib/server/response";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseCommonFilters(url.searchParams);
    const db = await getDb();

    const match = buildProcessedMatch(filters);

    const pipeline: any[] = [
      { $match: match },
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
      ...(filters.q
        ? [
          {
            $match: {
              "raw.post_tags": { $regex: filters.q.replace(/^#/, ""), $options: "i" },
            },
          },
        ]
        : []),
      { $unwind: "$raw.post_tags" },
      ...(filters.q
        ? [
          {
            $match: {
              "raw.post_tags": { $regex: filters.q.replace(/^#/, ""), $options: "i" },
            },
          },
        ]
        : []),
    ];

    if (filters.province) {
      pipeline.push(
        {
          $group: {
            _id: "$raw.post_tags",
            count: { $sum: 1 },
            sentiment_sum: {
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
          }
        },
        { $sort: { count: -1 } },
        { $limit: 15 },
        {
          $project: {
            _id: 0,
            tag: "$_id",
            count: 1,
            avg_sentiment: { $divide: ["$sentiment_sum", "$count"] }
          }
        }
      );
    } else {
      pipeline.push(
        {
          $group: {
            _id: { tag: "$raw.post_tags", province: "$location.province" },
            count: { $sum: 1 },
            sentiment_sum: {
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
          }
        },
        { $sort: { count: -1 } },
        {
          $group: {
            _id: "$_id.tag",
            total_count: { $sum: "$count" },
            total_sentiment_sum: { $sum: "$sentiment_sum" },
            top_province: { $first: "$_id.province" },
            top_province_count: { $first: "$count" }
          }
        },
        { $sort: { total_count: -1 } },
        { $limit: 15 },
        {
          $project: {
            _id: 0,
            tag: "$_id",
            total_count: 1,
            avg_sentiment: { $divide: ["$total_sentiment_sum", "$total_count"] },
            top_province: 1,
            top_province_count: 1
          }
        }
      );
    }

    const rows = await db
      .collection(collections.postsProcessed)
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();

    return apiOk(rows);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to load map tags", 500);
  }
}

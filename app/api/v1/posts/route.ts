import type { PostsResponse } from "@/lib/api/types";
import { getDb, collections, buildProcessedMatch, getSamplingPipeline } from "@/lib/server/mongo";
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
      { $sort: { created_at: filters.sort === "oldest" ? 1 : -1 } },
      {
        $addFields: {
          postObjectId: {
            $convert: {
              input: "$post_id",
              to: "objectId",
              onError: null,
              onNull: null,
            },
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
          ...(filters.source ? { "raw.source": filters.source } : {}),
          ...(filters.language ? { "raw.language": filters.language } : {}),
          ...(filters.q
            ? {
              $or: [
                ...(filters.map ? [] : [{ "raw.text": { $regex: filters.q, $options: "i" } }]),
                { "raw.post_tags": { $regex: filters.q.replace(/^#/, ""), $options: "i" } },
              ],
            }
            : {}),
        },
      },
      {
        $project: {
          _id: 1,
          source: "$raw.source",
          province: "$location.province",
          district: "$location.district",
          sentiment: `$sentiment.${filters.model}.label`,
          score: `$sentiment.${filters.model}.score`,
          tags: "$raw.post_tags",
          preview: "$raw.text",
          created_at: "$raw.created_at",
        },
      },
    ];

    const countPipeline = pipeline.filter((stage) => !stage.$sort);
    const countRows = await db
      .collection(collections.postsProcessed)
      .aggregate([...countPipeline, { $count: "total" }], { allowDiskUse: true })
      .toArray();
    const total = Math.min(81000, countRows[0]?.total ?? 0);

    const items = await db
      .collection(collections.postsProcessed)
      .aggregate([
        ...pipeline,
        { $skip: (filters.page - 1) * filters.limit },
        { $limit: filters.limit },
      ], { allowDiskUse: true })
      .toArray();

    const payload: PostsResponse = {
      items: items.map((item) => ({
        id: String(item._id),
        source: item.source ?? "Unknown",
        province: item.province ?? "Unknown",
        district: item.district ?? "Unknown",
        sentiment: item.sentiment ?? "Unknown",
        score: Number(item.score ?? 0),
        preview: item.preview ?? "",
        tags: item.tags,
        created_at: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
      })),
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    };

    return apiOk(payload);
  } catch (error) {
    console.error("Error in GET /api/v1/posts:", error);
    return apiError(error instanceof Error ? error.message : "Failed to load posts", 500);
  }
}

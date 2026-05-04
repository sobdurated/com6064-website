import type { PostDetailResponse } from "@/lib/api/types";
import { getDb, collections } from "@/lib/server/mongo";
import { parseObjectId } from "@/lib/server/query";
import { apiError, apiOk } from "@/lib/server/response";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const objectId = parseObjectId(id);
    if (!objectId) {
      return apiError("Invalid post id", 400);
    }

    const db = await getDb();

    const rows = await db
      .collection(collections.postsProcessed)
      .aggregate([
        {
          $match: {
            $or: [{ _id: objectId }, { post_id: id }],
          },
        },
        {
          $addFields: {
            postObjectId: {
              $convert: {
                input: "$post_id",
                to: "objectId",
                onError: objectId,
                onNull: objectId,
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
        { $limit: 1 },
      ])
      .toArray();

    if (!rows[0]) {
      return apiError("Post not found", 404);
    }

    const row = rows[0];

    const payload: PostDetailResponse = {
      id: String(row._id),
      source: row.raw?.source ?? "Unknown",
      province: row.location?.province ?? "Unknown",
      district: row.location?.district ?? "Unknown",
      sentiment: row.sentiment?.label ?? "Unknown",
      score: Number(row.sentiment?.score ?? 0),
      preview: (row.raw?.text ?? "").slice(0, 180),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      text: row.raw?.text ?? "",
      language: row.raw?.language ?? "unknown",
      tags: Array.isArray(row.raw?.post_tags) ? row.raw.post_tags : [],
      model: row.sentiment?.model ?? "unknown",
    };

    return apiOk(payload);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to load post", 500);
  }
}

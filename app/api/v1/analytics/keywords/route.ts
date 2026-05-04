import type { KeywordTrendRow } from "@/lib/api/types";
import { getDb, collections, getSamplingPipeline } from "@/lib/server/mongo";
import { parseCommonFilters } from "@/lib/server/query";
import { apiError, apiOk } from "@/lib/server/response";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseCommonFilters(url.searchParams);
    const db = await getDb();

    const hasCustomRange = Boolean(filters.from && filters.to);
    const spanMs =
      hasCustomRange && filters.from && filters.to
        ? filters.to.getTime() - filters.from.getTime()
        : null;
    const previousFrom = spanMs !== null && filters.from ? new Date(filters.from.getTime() - spanMs) : null;
    const previousTo = filters.from ?? null;

    const matchCurrent: Record<string, unknown> = {};
    const matchPrevious: Record<string, unknown> = {};

    if (filters.from || filters.to) {
      matchCurrent.created_at = {
        ...(filters.from ? { $gte: filters.from } : {}),
        ...(filters.to ? { $lte: filters.to } : {}),
      };
    }

    if (previousFrom || previousTo) {
      matchPrevious.created_at = {
        ...(previousFrom ? { $gte: previousFrom } : {}),
        ...(previousTo ? { $lte: previousTo } : {}),
      };
    }

    const rawMatch: Record<string, unknown> = {};
    if (filters.source) {
      rawMatch["raw.source"] = filters.source;
    }
    if (filters.language) {
      rawMatch["raw.language"] = filters.language;
    }

    const buildPipeline = (initialMatch: Record<string, unknown>, limitTo30: boolean) => [
      { $match: initialMatch },
      // ...getSamplingPipeline(),
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
      ...(Object.keys(rawMatch).length > 0 ? [{ $match: rawMatch }] : []),
      { $unwind: "$raw.post_tags" },
      { $group: { _id: "$raw.post_tags", count: { $sum: 1 } } },
      ...(limitTo30 ? [{ $sort: { count: -1 } }, { $limit: 30 }] : []),
    ];

    const [currentRows, previousRows] = await Promise.all([
      db
        .collection(collections.postsProcessed)
        .aggregate(buildPipeline(matchCurrent, true), { allowDiskUse: true })
        .toArray(),
      db
        .collection(collections.postsProcessed)
        .aggregate(buildPipeline(matchPrevious, false), { allowDiskUse: true })
        .toArray(),
    ]);

    const previousMap = new Map((hasCustomRange ? previousRows : []).map((row) => [row._id, row.count]));

    const payload: KeywordTrendRow[] = currentRows
      .filter((row) => row._id)
      .map((row) => ({
        keyword: row._id,
        count: row.count,
        delta: row.count - (previousMap.get(row._id) ?? 0),
      }));

    return apiOk(payload);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to load keywords", 500);
  }
}

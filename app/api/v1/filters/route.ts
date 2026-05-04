import { getDb, collections, buildProcessedMatch } from "@/lib/server/mongo";
import { parseCommonFilters } from "@/lib/server/query";
import { apiError, apiOk } from "@/lib/server/response";
import type { FiltersResponse } from "@/lib/api/types";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseCommonFilters(url.searchParams);
    const db = await getDb();

    const rawMatch: Record<string, unknown> = {};
    if (filters.from || filters.to) {
      rawMatch.created_at = {
        ...(filters.from ? { $gte: filters.from } : {}),
        ...(filters.to ? { $lte: filters.to } : {}),
      };
    }
    if (filters.source) rawMatch.source = filters.source;
    if (filters.language) rawMatch.language = filters.language;

    const processedMatch = buildProcessedMatch(filters);

    const [provinces, districts, sources, languages, dateBounds] = await Promise.all([
      db.collection(collections.postsProcessed).distinct("location.province", processedMatch),
      db.collection(collections.postsProcessed).distinct("location.district", processedMatch),
      db.collection(collections.postsRaw).distinct("source", rawMatch),
      db.collection(collections.postsRaw).distinct("language", rawMatch),
      db
        .collection(collections.postsRaw)
        .aggregate([
          { $group: { _id: null, min: { $min: "$created_at" }, max: { $max: "$created_at" } } },
        ])
        .toArray(),
    ]);

    const payload: FiltersResponse = {
      provinces: provinces.filter(Boolean).sort(),
      districts: districts.filter(Boolean).sort(),
      sources: sources.filter(Boolean).sort(),
      languages: languages.filter(Boolean).sort(),
      dateBounds: {
        min: dateBounds[0]?.min ? new Date(dateBounds[0].min).toISOString() : null,
        max: dateBounds[0]?.max ? new Date(dateBounds[0].max).toISOString() : null,
      },
    };

    return apiOk(payload);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to load filters", 500);
  }
}

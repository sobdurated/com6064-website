import { MongoClient, Db, Document, Filter } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise__: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

export async function getDb(): Promise<Db> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (!dbName) {
    throw new Error("MONGODB_DB_NAME is not set");
  }

  if (!global.__mongoClientPromise__) {
    const client = new MongoClient(uri);
    global.__mongoClientPromise__ = client.connect();
  }

  clientPromise = global.__mongoClientPromise__;
  const resolvedClient = await clientPromise;
  return resolvedClient.db(dbName);
}

export const collections = {
  postsRaw: "posts_raw",
  postsProcessed: "posts_processed",
  sentimentAggregates: "sentiment_aggregates",
} as const;

function buildTurkishRegex(searchTerm: string): string {
  return searchTerm
    .replace(/[iİıI]/g, "[iİıI]")
    .replace(/[sŞşS]/g, "[sŞşS]")
    .replace(/[cÇçC]/g, "[cÇçC]")
    .replace(/[gĞğG]/g, "[gĞğG]")
    .replace(/[uÜüU]/g, "[uÜüU]")
    .replace(/[oÖöO]/g, "[oÖöO]");
}

export function buildProcessedMatch(filters: {
  from?: Date;
  to?: Date;
  province?: string;
  district?: string;
  sentiment?: string;
  model?: "llm" | "transformer";
}): Filter<Document> {
  const match: Filter<Document> = {};

  if (filters.from || filters.to) {
    match.created_at = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  }

  if (filters.province) {
    match["location.province"] =
    {
      $regex: buildTurkishRegex(filters.province.trim()),
      $options: "i",
    }
  }
  if (filters.district) {
    match["location.district"] = { $regex: buildTurkishRegex(filters.district.trim()), $options: "i" };
  }
  if (filters.sentiment) {
    const model = filters.model || "llm";
    match[`sentiment.${model}.label`] = { $regex: filters.sentiment.toLocaleLowerCase("tr-TR").trim(), $options: "i" };
  }

  return match;
}

export function getSamplingPipeline() {
  return [
    {
      $setWindowFields: {
        partitionBy: "$location.province",
        sortBy: { created_at: -1 },
        output: { rank: { $documentNumber: {} } }
      }
    },
    { $match: { rank: { $lte: 1000 } } }
  ];
}

export function buildAggregateMatch(filters: {
  from?: Date;
  to?: Date;
  province?: string;
  district?: string;
}) {
  const match: Filter<Document> = {};

  if (filters.from) {
    match["time_window.start"] = { $gte: filters.from };
  }
  if (filters.to) {
    match["time_window.end"] = { $lte: filters.to };
  }

  if (filters.province) {
    match.province = { $regex: filters.province.toLocaleLowerCase("tr-TR").trim(), $options: "i" };
  }
  if (filters.district) {
    match.district = { $regex: filters.district.toLocaleLowerCase("tr-TR").trim(), $options: "i" };
  }

  return match;
}

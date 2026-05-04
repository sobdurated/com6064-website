export type SentimentLabel = "positive" | "negative";

export type FiltersResponse = {
  provinces: string[];
  districts: string[];
  sources: string[];
  languages: string[];
  dateBounds: {
    min: string | null;
    max: string | null;
  };
};

export type DashboardOverviewResponse = {
  total_posts: number;
  positive_ratio: number;
  negative_ratio: number;
  average_sentiment: number;
};

export type DashboardTrendPoint = {
  date: string;
  positive: number;
  negative: number;
};

export type TopProvinceRow = {
  province: string;
  total_posts: number;
  positive_ratio: number;
};

export type AlertRow = {
  province: string;
  negative_ratio_delta: number;
  current_negative_ratio: number;
};

export type ProvinceMapRow = {
  province: string;
  total_posts: number;
  average_sentiment: number;
  ratios: {
    positive: number;
    negative: number;
  };
};

export type DistrictMapRow = {
  district: string;
  total_posts: number;
  average_sentiment: number;
  ratios: {
    positive: number;
    negative: number;
  };
};

export type SourceComparisonRow = {
  source: string;
  positive: number;
  negative: number;
};

export type SentimentRatioRow = {
  label: SentimentLabel;
  value: number;
};

export type KeywordTrendRow = {
  keyword: string;
  count: number;
  delta: number;
};

export type PostFeedItem = {
  id: string;
  source: string;
  province: string;
  district: string;
  sentiment: SentimentLabel;
  score: number;
  preview: string;
  tags?: string[];
  created_at: string;
};

export type PostsResponse = {
  items: PostFeedItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PostDetailResponse = PostFeedItem & {
  text: string;
  language: string;
  tags: string[];
  model: string;
};

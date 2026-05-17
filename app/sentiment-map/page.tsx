'use client';
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FilterToolbar } from "@/components/dashboard/filter-toolbar";
import { SectionHeader } from "@/components/dashboard/section-header";
import { SentimentMapCard } from "@/components/dashboard/sentiment-map-card";
import { Card } from "@/components/retroui/Card";
import { withSearchParams } from "@/lib/api/query-string";
import type { ProvinceMapRow, PostsResponse } from "@/lib/api/types";
import { useEffect, useState } from "react";
import { Badge } from "@/components/retroui/Badge";
import { Button } from "@/components/retroui/Button";
import { SentimentBadge } from "@/components/dashboard/sentiment-badge";
import { useModel } from "@/components/model-provider";
import { LoadingBar } from "@/components/dashboard/loading-bar";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString();
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export default function SentimentMapPage() {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    province: "",
    q: "",
  });
  const { model } = useModel();
  const [provincesData, setProvincesData] = useState<ProvinceMapRow[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<ProvinceMapRow | undefined>(undefined);
  const [topProvince, setTopProvince] = useState<ProvinceMapRow | undefined>(undefined);
  const [mapTags, setMapTags] = useState<any[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsData, setPostsData] = useState<PostsResponse | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [tagSort, setTagSort] = useState<{ key: 'mentions' | 'sentiment', direction: 'asc' | 'desc' }>({ key: 'mentions', direction: 'desc' });

  const isAnyLoading = provincesLoading || tagsLoading || postsLoading;

  useEffect(() => {
    const fetchProvinces = async () => {
      setProvincesLoading(true);
      try {
        const params: Record<string, string> = { model };
        if (filters.from) params.from = filters.from;
        if (filters.to) params.to = filters.to;
        if (filters.q) params.q = filters.q;

        const res = await fetch(withSearchParams("/api/v1/map/provinces", params));
        const provincesJson: ProvinceMapRow[] = await res.json();

        const selProvince = filters.province
          ? provincesJson.find((row) => normalizeName(row.province) === normalizeName(filters.province))
          : undefined;
        setProvincesData(provincesJson);
        setSelectedProvince(selProvince);
        setTopProvince(selProvince ?? provincesJson[0]);
      } finally {
        setProvincesLoading(false);
      }
    };

    fetchProvinces();
  }, [filters, model]);

  useEffect(() => {
    if (filters.province) {
      const sel = provincesData.find((row) => normalizeName(row.province) === normalizeName(filters.province));
      setSelectedProvince(sel);
      setTopProvince(sel ?? provincesData[0]);
    } else {
      setSelectedProvince(undefined);
      setTopProvince(provincesData[0]);
    }
  }, [filters.province, provincesData]);

  useEffect(() => {
    const fetchTags = async () => {
      setTagsLoading(true);
      try {
        const params: Record<string, string> = { model };
        if (filters.from) params.from = filters.from;
        if (filters.to) params.to = filters.to;
        if (filters.province) params.province = filters.province;
        if (filters.q) params.q = filters.q;

        const res = await fetch(withSearchParams("/api/v1/map/tags", params));
        const json = await res.json();
        setMapTags(json);
      } catch (err) {
        console.error("Failed to fetch tags", err);
      } finally {
        setTagsLoading(false);
      }
    };

    fetchTags();
  }, [filters, model]);

  useEffect(() => {
    let active = true;
    setPostsLoading(true);

    const query = new URLSearchParams();
    if (filters.q) query.set("q", filters.q);
    if (filters.province) query.set("province", filters.province);
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
    query.set("page", postsPage.toString());
    query.set("limit", "10");
    query.set("model", model);

    fetch(`/api/v1/posts?${query.toString()}&map=true`)
      .then(res => res.json())
      .then(result => {
        if (active) {
          setPostsData(result);
          setPostsLoading(false);
        }
      })
      .catch(() => {
        if (active) setPostsLoading(false);
      });

    return () => { active = false; };
  }, [filters, postsPage, model]);

  const handleFilter = (formData: FormData) => {
    setFilters((prev) => ({
      ...prev,
      from: (formData.get("from") as string) || "",
      to: (formData.get("to") as string) || "",
      q: (formData.get("q") as string) || "",
    }));
    setPostsPage(1);
  };

  const handleReset = () => {
    setFilters({ from: "", to: "", province: "", q: "" });
    setPostsPage(1);
  };

  const activeChips: string[] = [];
  if (filters.province) activeChips.push(`Province: ${filters.province}`);
  if (filters.q) activeChips.push(`Topic: ${filters.q}`);

  const sortedTags = [...mapTags].sort((a, b) => {
    if (tagSort.key === 'mentions') {
      const aCount = a.count || a.total_count;
      const bCount = b.count || b.total_count;
      return tagSort.direction === 'asc' ? aCount - bCount : bCount - aCount;
    } else {
      return tagSort.direction === 'asc' ? a.avg_sentiment - b.avg_sentiment : b.avg_sentiment - a.avg_sentiment;
    }
  });

  const handleSort = (key: 'mentions' | 'sentiment') => {
    if (tagSort.key === key) {
      setTagSort({ key, direction: tagSort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setTagSort({ key, direction: 'desc' });
    }
  };

  return (
    <DashboardShell title="Sentiment Map">
      <FilterToolbar
        onFilter={handleFilter}
        onReset={handleReset}
        searchValue={filters.q}
        searchPlaceholder="Search topics or tags (e.g. ekonomi)..."
        showDateRange
        fromValue={filters.from}
        toValue={filters.to}
        chips={activeChips}
      />

      <LoadingBar loading={isAnyLoading} />

      <div className={isAnyLoading ? "opacity-60 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"}>
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
          <SentimentMapCard provinces={provincesData} selectedProvince={selectedProvince?.province || undefined} setFilters={setFilters} />

          <Card>
            <Card.Content className="space-y-3">
              <SectionHeader
                title="Province Details"
                description={selectedProvince ? "Selected city snapshot from current filters." : "Top city snapshot from current filters."}
              />
              <div className="space-y-2 text-sm">
                <p className="border-2 p-2">Province: {topProvince?.province ?? "N/A"}</p>
                <p className="border-2 p-2">Positive ratio: {topProvince ? formatPercent(topProvince.ratios.positive) : "N/A"}</p>
                <p className="border-2 p-2">Total mentions: {topProvince ? topProvince.total_posts.toLocaleString() : "0"}</p>
                <p className="border-2 p-2 flex items-center gap-1">
                  Average sentiment: 
                  {topProvince ? (
                    <span className={topProvince.average_sentiment > 0.1 ? "text-green-600 font-medium" : topProvince.average_sentiment < -0.1 ? "text-red-600 font-medium" : "text-muted-foreground"}>
                      {topProvince.average_sentiment > 0 ? "+" : ""}{topProvince.average_sentiment.toFixed(2)}
                    </span>
                  ) : "0.00"}
                </p>
              </div>
              {selectedProvince && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFilters((prev) => ({ ...prev, province: "" }))}
                >
                  Clear province selection
                </Button>
              )}
            </Card.Content>
          </Card>

          <Card className="xl:col-span-2">
            <Card.Content className="space-y-3">
              <SectionHeader
                title={selectedProvince ? `Trending Tags in ${selectedProvince.province}` : "Trending Tags Nationwide"}
                description={selectedProvince ? "Most discussed topics in this province." : "Top tags across all provinces and their primary locations."}
              />
              {tagsLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground animate-pulse border-2 border-dashed">Loading tags...</div>
              ) : mapTags.length > 0 ? (
                <div className="overflow-x-auto border-2">
                  <table className="w-full text-sm text-left">
                    <thead className="border-b-2 bg-accent/50 select-none">
                      <tr>
                        <th className="p-2 font-semibold">Tag</th>
                        <th 
                          className="p-2 font-semibold cursor-pointer hover:bg-accent/80 transition-colors"
                          onClick={() => handleSort('mentions')}
                        >
                          <div className="flex items-center gap-1">
                            Mentions
                            {tagSort.key === 'mentions' ? (tagSort.direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 text-muted-foreground opacity-50" />}
                          </div>
                        </th>
                        <th 
                          className="p-2 font-semibold cursor-pointer hover:bg-accent/80 transition-colors"
                          onClick={() => handleSort('sentiment')}
                        >
                          <div className="flex items-center gap-1">
                            Avg. Sentiment
                            {tagSort.key === 'sentiment' ? (tagSort.direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 text-muted-foreground opacity-50" />}
                          </div>
                        </th>
                        {!selectedProvince && <th className="p-2 font-semibold">Top Province</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTags.map((t, idx) => (
                        <tr key={idx} className="border-b last:border-b-0 hover:bg-accent/20 transition-colors">
                          <td className="p-2 font-mono">#{t.tag}</td>
                          <td className="p-2">{t.count || t.total_count}</td>
                          <td className="p-2">
                            <span className={t.avg_sentiment > 0.1 ? "text-green-600 font-medium" : t.avg_sentiment < -0.1 ? "text-red-600 font-medium" : "text-gray-500"}>
                              {t.avg_sentiment > 0 ? "+" : ""}{t.avg_sentiment.toFixed(2)}
                            </span>
                          </td>
                          {!selectedProvince && (
                            <td className="p-2">{t.top_province} <span className="text-muted-foreground text-xs">({t.top_province_count})</span></td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed">No tags found for this selection.</div>
              )}
            </Card.Content>
          </Card>
        </section>

        <section className="mt-4">
          <Card className="w-full">
            <Card.Content className="space-y-3">
              <SectionHeader
                title="Related Posts"
                description={
                  postsData ? `Showing ${postsData.items.length} of ${postsData.total.toLocaleString()} posts.` : "Loading posts..."
                }
              />

              {postsLoading && !postsData ? (
                <div className="border-2 p-3 text-sm text-muted-foreground animate-pulse">Loading posts...</div>
              ) : postsData ? (
                <div className={postsLoading ? "opacity-50 pointer-events-none" : ""}>
                  <div className="space-y-3">
                    {postsData.items.map((post) => (
                      <article key={post.id} className="border-2 p-3">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{post.source}</span>
                          <span>•</span>
                          <span>{post.province}</span>
                          <span>•</span>
                          <span>{post.district}</span>
                          <span>•</span>
                          <span>{formatTimestamp(post.created_at)}</span>
                        </div>
                        <p className="mb-3 text-sm whitespace-pre-wrap">{post.preview}</p>
                        {post.tags && post.tags.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {post.tags.map((tag, idx) => (
                              <Badge key={idx} className="bg-gray-500 text-white" variant="solid" size="sm">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <SentimentBadge sentiment={post.sentiment} />
                      </article>
                    ))}
                    {postsData.items.length === 0 ? (
                      <p className="border-2 p-3 text-sm text-muted-foreground">No posts matched your filters.</p>
                    ) : null}
                  </div>
                  {postsData.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t-2 pt-3 mt-3 text-sm">
                      <p>
                        Page {postsData.page} of {postsData.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={postsData.page <= 1 || postsLoading}
                          onClick={() => setPostsPage(p => p - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={postsData.page >= postsData.totalPages || postsLoading}
                          onClick={() => setPostsPage(p => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </Card.Content>
          </Card>
        </section>
      </div>
    </DashboardShell>
  );
}

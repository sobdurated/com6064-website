"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useModel } from "@/components/model-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FilterToolbar } from "@/components/dashboard/filter-toolbar";
import { SectionHeader } from "@/components/dashboard/section-header";
import { SentimentBadge } from "@/components/dashboard/sentiment-badge";
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import type { PostsResponse } from "@/lib/api/types";
import { Badge } from "@/components/retroui/Badge";
import { LoadingBar } from "@/components/dashboard/loading-bar";

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString();
}

function PostsFeedContent() {
  const searchParams = useSearchParams();
  const { model } = useModel();

  const [filters, setFilters] = useState({
    q: searchParams.get("q") ?? "",
    sentiment: searchParams.get("sentiment") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    page: Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
    limit: searchParams.get("limit") ?? "20",
  });

  const [data, setData] = useState<PostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (filters.q) query.set("q", filters.q);
    if (filters.sentiment) query.set("sentiment", filters.sentiment);
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
    query.set("page", filters.page.toString());
    query.set("limit", filters.limit);
    query.set("model", model);

    fetch(`/api/v1/posts?${query.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch posts");
        return res.json();
      })
      .then(result => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { active = false; };
  }, [filters, model]);

  const handleFilter = (formData: FormData) => {
    setFilters(prev => ({
      ...prev,
      q: (formData.get("q") as string) ?? "",
      sentiment: (formData.get("sentiment") as string) ?? "",
      from: (formData.get("from") as string) ?? "",
      to: (formData.get("to") as string) ?? "",
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <>
      <FilterToolbar
        onFilter={handleFilter}
        searchValue={filters.q}
        showDateRange
        fromValue={filters.from}
        toValue={filters.to}
        extraControls={
          <select
            name="sentiment"
            defaultValue={filters.sentiment}
            className="w-full rounded border-2 px-3 py-2 text-sm md:w-[180px]"
          >
            <option value="">All sentiments</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
          </select>
        }
      />

      <LoadingBar loading={loading} />

      <div className={loading ? "opacity-60 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"}>
        <Card className="w-full">
        <Card.Content className="space-y-3">
          <SectionHeader
            title="Post Feed"
            description={
              data ? `Showing ${data.items.length} of ${data.total.toLocaleString()} posts.` : "Loading posts..."
            }
          />

          {error ? (
            <div className="border-2 p-3 text-red-500 text-sm">Error: {error}</div>
          ) : loading && !data ? (
            <div className="border-2 p-3 text-sm text-muted-foreground animate-pulse">Loading...</div>
          ) : data ? (
            <div className={loading ? "opacity-50 pointer-events-none" : ""}>
              <div className="space-y-3">
                {data.items.map((post) => (
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
                {data.items.length === 0 ? (
                  <p className="border-2 p-3 text-sm text-muted-foreground">No posts matched your filters.</p>
                ) : null}
              </div>
              <div className="flex items-center justify-between border-t-2 pt-3 mt-3 text-sm">
                <p>
                  Page {data.page} of {data.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={data.page <= 1 || loading}
                    onClick={() => handlePageChange(data.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={data.page >= data.totalPages || loading}
                    onClick={() => handlePageChange(data.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </Card.Content>
        </Card>
      </div>
    </>
  );
}

export default function PostsFeedPage() {
  return (
    <DashboardShell title="Posts Feed">
      <Suspense fallback={<div className="p-4">Loading application...</div>}>
        <PostsFeedContent />
      </Suspense>
    </DashboardShell>
  );
}

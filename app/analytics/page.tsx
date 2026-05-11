"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useModel } from "@/components/model-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/dashboard/data-table";
import { FilterToolbar } from "@/components/dashboard/filter-toolbar";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Card } from "@/components/retroui/Card";
import { Badge } from "@/components/retroui/Badge";
import { Button } from "@/components/retroui/Button";
import { BarChart } from "@/components/retroui/charts/BarChart";
import { PieChart } from "@/components/retroui/charts/PieChart";

import type { KeywordTrendRow, SentimentRatioRow, DashboardOverviewResponse, DashboardTrendPoint } from "@/lib/api/types";

function formatSignedCount(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const { model } = useModel();

  const [filters, setFilters] = useState({
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
  });

  const [keywordPage, setKeywordPage] = useState(1);
  const keywordsPerPage = 10;

  const [trendPage, setTrendPage] = useState(1);
  const trendPerPage = 50;

  const [keywordData, setKeywordData] = useState<KeywordTrendRow[] | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentRatioRow[] | null>(null);
  const [overviewData, setOverviewData] = useState<DashboardOverviewResponse | null>(null);
  const [trendData, setTrendData] = useState<DashboardTrendPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const query = new URLSearchParams();
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
    query.set("model", model);

    const qString = query.toString();
    const qPrefix = qString ? `?${qString}` : "";

    Promise.all([
      fetch(`/api/v1/analytics/keywords${qPrefix}`).then(r => r.json()),
      fetch(`/api/v1/analytics/sentiment-ratio${qPrefix}`).then(r => r.json()),
      fetch(`/api/v1/dashboard/overview${qPrefix}`).then(r => r.json()),
      fetch(`/api/v1/dashboard/trend${qPrefix}`).then(r => r.json())
    ])
      .then(([keywords, sentiment, overview, trend]) => {
        if (active) {
          setKeywordData(keywords);
          setSentimentData(sentiment);
          setOverviewData(overview);
          setTrendData(trend);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error(err);
          setLoading(false);
        }
      });

    return () => { active = false; };
  }, [filters, model]);

  const handleFilter = (formData: FormData) => {
    setFilters({
      from: (formData.get("from") as string) ?? "",
      to: (formData.get("to") as string) ?? "",
    });
    setKeywordPage(1);
    setTrendPage(1);
  };

  const totalMentions = overviewData?.total_posts ?? 0;
  const topKeyword = keywordData?.[0]?.keyword ?? "N/A";
  const positiveShare = sentimentData?.find((item) => item.label === "positive")?.value ?? 0;
  const negativeShare = sentimentData?.find((item) => item.label === "negative")?.value ?? 0;

  const keywordTrendRows = (keywordData || []).map((row) => [
    row.keyword,
    row.count.toLocaleString()
  ]);

  const totalKeywordPages = Math.max(1, Math.ceil(keywordTrendRows.length / keywordsPerPage));
  const paginatedKeywordRows = keywordTrendRows.slice(
    (keywordPage - 1) * keywordsPerPage,
    keywordPage * keywordsPerPage
  );

  const trendingTags = (keywordData || []).slice(0, 3).map((row) => ({
    tag: `#${row.keyword.replace(/\s+/g, "")}`,
    volume: row.count,
    delta: row.delta
  }));

  const volumeTrend = (trendData || []).map((point) => ({
    date: point.date,
    total: point.positive + point.negative
  }));

  const totalTrendPages = Math.max(1, Math.ceil(volumeTrend.length / trendPerPage));
  const trendStartIndex = Math.max(0, volumeTrend.length - trendPage * trendPerPage);
  const trendEndIndex = Math.max(0, volumeTrend.length - (trendPage - 1) * trendPerPage);
  const paginatedVolumeTrend = volumeTrend.slice(trendStartIndex, trendEndIndex);

  return (
    <>
      <FilterToolbar
        onFilter={handleFilter}
        showSearch={false}
        showDateRange
        fromValue={filters.from}
        toValue={filters.to}
      />

      <div className={loading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
        <section className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-4 mt-4">
          <Card>
            <Card.Content className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Mentions</p>
              <p className="text-2xl font-semibold">{totalMentions.toLocaleString()}</p>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="space-y-1">
              <p className="text-sm text-muted-foreground">Top Keyword</p>
              <p className="text-2xl font-semibold truncate" title={topKeyword}>{topKeyword}</p>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="space-y-1">
              <p className="text-sm text-muted-foreground">Sentiment Gap</p>
              <p className="text-2xl font-semibold">{((positiveShare - negativeShare) * 100).toFixed(1)} pts</p>
            </Card.Content>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 mb-4">
          <Card>
            <Card.Content className="space-y-3">
              <SectionHeader title="Top Keywords Volume" description="Distribution of mentions by top keywords." />
              {keywordData && keywordData.length > 0 ? (
                <BarChart
                  data={keywordData.slice(0, 5)}
                  index="keyword"
                  categories={["count"]}
                  fillColors={["#e30a17"]}
                  strokeColors={["#111111"]}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">No keyword data</div>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="space-y-3">
              <SectionHeader title="Sentiment Ratio" description="Current global ratio over all captured posts." />
              {sentimentData && sentimentData.length > 0 ? (
                <PieChart
                  data={sentimentData.map((item: SentimentRatioRow) => ({
                    ...item,
                    value: Math.round(item.value * 100),
                  }))}
                  dataKey="value"
                  nameKey="label"
                  colors={["#2f9e44", "#dc2626"]}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">No sentiment data</div>
              )}
            </Card.Content>
          </Card>
        </section>
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 mb-4">

          <section className="w-full">
            <Card className="w-full">
              <Card.Content className="space-y-3">
                <SectionHeader title="Activity Volume Trend" description="Mentions per day over the selected period." />
                {paginatedVolumeTrend && paginatedVolumeTrend.length > 0 ? (
                  <BarChart
                    data={paginatedVolumeTrend}
                    index="date"
                    categories={["total"]}
                    fillColors={["#111111"]}
                    strokeColors={["#111111"]}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">No trend data available</div>
                )}
                {volumeTrend.length > 0 && (
                  <div className="flex items-center justify-between border-t-2 pt-3 mt-auto text-sm">
                    <p>
                      Page {trendPage} of {totalTrendPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={trendPage <= 1}
                        onClick={() => setTrendPage((p) => Math.max(1, p - 1))}
                      >
                        Previous (Newer)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={trendPage >= totalTrendPages}
                        onClick={() => setTrendPage((p) => Math.min(totalTrendPages, p + 1))}
                      >
                        Next (Older)
                      </Button>
                    </div>
                  </div>
                )}
              </Card.Content>
            </Card>
          </section>

          <section className="w-full">
            <Card className="w-full h-full flex flex-col">
              <Card.Content className="space-y-3 flex-1 flex flex-col">
                <SectionHeader title="Keyword Trends" description="Keyword volume and movement week-over-week." />
                <div className="flex-1">
                  <DataTable headers={["Keyword", "Volume"]} rows={paginatedKeywordRows} />
                </div>
                {keywordTrendRows.length > 0 && (
                  <div className="flex items-center justify-between border-t-2 pt-3 mt-auto text-sm">
                    <p>
                      Page {keywordPage} of {totalKeywordPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={keywordPage <= 1}
                        onClick={() => setKeywordPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={keywordPage >= totalKeywordPages}
                        onClick={() => setKeywordPage((p) => Math.min(totalKeywordPages, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </Card.Content>
            </Card>
          </section>
        </section>
      </div>
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <DashboardShell title="Analytics">
      <Suspense fallback={<div className="p-4">Loading analytics...</div>}>
        <AnalyticsContent />
      </Suspense>
    </DashboardShell>
  );
}

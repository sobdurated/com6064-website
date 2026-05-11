"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useModel } from "@/components/model-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/dashboard/data-table";
import { FilterToolbar } from "@/components/dashboard/filter-toolbar";
import { SectionHeader } from "@/components/dashboard/section-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card } from "@/components/retroui/Card";
import { LineChart } from "@/components/retroui/charts/LineChart";
import { Button } from "@/components/retroui/Button";

import type {
  AlertRow,
  DashboardOverviewResponse,
  DashboardTrendPoint,
  TopProvinceRow,
} from "@/lib/api/types";

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(1)}%`;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const { model } = useModel();

  const [filters, setFilters] = useState({
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    province: searchParams.get("province") ?? "",
  });

  const [trendPage, setTrendPage] = useState(1);
  const trendPerPage = 50;

  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [trend, setTrend] = useState<DashboardTrendPoint[] | null>(null);
  const [topProvinces, setTopProvinces] = useState<TopProvinceRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const query = new URLSearchParams();
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
    if (filters.province) query.set("province", filters.province);
    query.set("model", model);

    const qString = query.toString();
    const qPrefix = qString ? `?${qString}` : "";

    Promise.all([
      fetch(`/api/v1/dashboard/overview${qPrefix}`).then((r) => r.json()),
      fetch(`/api/v1/dashboard/trend${qPrefix}`).then((r) => r.json()),
      fetch(`/api/v1/dashboard/top-provinces${qPrefix}`).then((r) => r.json()),
    ])
      .then(([overviewData, trendData, topProvincesData]) => {
        if (active) {
          setOverview(overviewData);
          setTrend(trendData);
          setTopProvinces(topProvincesData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error(err);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filters, model]);

  const handleFilter = (formData: FormData) => {
    setFilters({
      from: (formData.get("from") as string) ?? "",
      to: (formData.get("to") as string) ?? "",
      province: (formData.get("province") as string) ?? "",
    });
    setTrendPage(1);
  };

  const windowLabel = filters.from || filters.to ? "Filtered range" : "All available data";

  const kpiCards = [
    {
      title: "Total Posts",
      value: overview?.total_posts ? overview.total_posts.toLocaleString() : "0",
      change: windowLabel,
      tone: "flat" as const,
    },
    {
      title: "Average Sentiment",
      value: overview ? overview.average_sentiment.toFixed(2) : "...",
      change: "Weighted score",
      tone: "flat" as const,
    },
    {
      title: "Positive Ratio",
      value: overview ? formatPercent(overview.positive_ratio) : "...",
      change: overview ? formatSignedPercent(overview.positive_ratio - overview.negative_ratio) : "...",
      tone: (overview ? (overview.positive_ratio - overview.negative_ratio > 0 ? "up" : "down") : "flat") as "flat" | "up" | "down",
    },
    {
      title: "Negative Ratio",
      value: overview ? formatPercent(overview.negative_ratio) : "...",
      change: overview ? formatSignedPercent(overview.negative_ratio - overview.positive_ratio) : "...",
      tone: (overview ? (overview.negative_ratio - overview.positive_ratio < 0 ? "down" : "up") : "flat") as "flat" | "up" | "down",
    },
  ];

  const trendData = (trend || []).map((point) => ({
    day: point.date,
    positive: point.positive,
    negative: point.negative,
  }));

  const totalTrendPages = Math.max(1, Math.ceil(trendData.length / trendPerPage));
  const trendStartIndex = Math.max(0, trendData.length - trendPage * trendPerPage);
  const trendEndIndex = Math.max(0, trendData.length - (trendPage - 1) * trendPerPage);
  const paginatedTrendData = trendData.slice(trendStartIndex, trendEndIndex);

  const topProvinceRows = (topProvinces || []).map((row) => [
    row.province,
    row.total_posts.toLocaleString(),
    formatPercent(row.positive_ratio),
  ]);

  return (
    <>
      <FilterToolbar
        onFilter={handleFilter}
        searchName="province"
        searchValue={filters.province}
        searchPlaceholder="Filter by province"
        showDateRange
        fromValue={filters.from}
        toValue={filters.to}
        chips={filters.from || filters.to ? ["Date range active"] : []}
      />

      <div className={loading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4 mt-4">
          {kpiCards.map((item) => (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              change={item.change}
              tone={item.tone}
            />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-4">
          <Card className="xl:col-span-2">
            <Card.Content className="space-y-3">
              <SectionHeader
                title="Sentiment Trend"
                description="Positive, and negative totals over the selected period."
              />
              {paginatedTrendData.length > 0 ? (
                <LineChart
                  data={paginatedTrendData}
                  index="day"
                  categories={["positive", "negative"]}
                  strokeColors={["#2f9e44", "#dc2626"]}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded">
                  No trend data available
                </div>
              )}
              {trendData.length > 0 && (
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

          <Card>
            <Card.Content className="space-y-3">
              <SectionHeader title="Top Provinces" description="Ranked by mention volume and positive share." />
              <DataTable
                headers={["Province", "Mentions", "Pos %"]}
                rows={topProvinceRows}
                className="table-fixed text-xs sm:text-sm"
              />
            </Card.Content>
          </Card>
        </section>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <DashboardShell title="National Sentiment Dashboard">
      <Suspense fallback={<div className="p-4 animate-pulse text-muted-foreground">Loading dashboard...</div>}>
        <DashboardContent />
      </Suspense>
    </DashboardShell>
  );
}

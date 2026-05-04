'use client';
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FilterToolbar } from "@/components/dashboard/filter-toolbar";
import { SectionHeader } from "@/components/dashboard/section-header";
import { SentimentMapCard } from "@/components/dashboard/sentiment-map-card";
import { Card } from "@/components/retroui/Card";
import { getSearchValue, withSearchParams } from "@/lib/api/query-string";
import type { ProvinceMapRow } from "@/lib/api/types";
import { useEffect, useState } from "react";
import { useModel } from "@/components/model-provider";

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export default function SentimentMapPage() {
  const searchParams = new URLSearchParams();
  const [filters, setFilters] = useState({
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    province: searchParams.get("province") ?? "",
  });
  const { model } = useModel();
  const [provincesData, setProvincesData] = useState<ProvinceMapRow[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<ProvinceMapRow | undefined>(undefined);
  const [topProvince, setTopProvince] = useState<ProvinceMapRow | undefined>(undefined);
  const [mapTags, setMapTags] = useState<any[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const provinces = await fetch(withSearchParams("/api/v1/map/provinces", { ...filters, model }));
      const provincesJson: ProvinceMapRow[] = await provinces.json();
      const selProvince = filters.province
        ? provincesJson.find((row) => {
          return normalizeName(row.province) === normalizeName(filters.province)
        })
        : undefined;

      setProvincesData(provincesJson);
      setSelectedProvince(selProvince);
      setTopProvince(selProvince ?? provincesJson[0]);
    };

    const fetchTags = async () => {
      setTagsLoading(true);
      try {
        const res = await fetch(withSearchParams("/api/v1/map/tags", { ...filters, model }));
        const json = await res.json();
        setMapTags(json);
      } catch (err) {
        console.error("Failed to fetch tags", err);
      } finally {
        setTagsLoading(false);
      }
    };

    fetchData();
    fetchTags();
  }, [filters, model]);

  const handleFilter = (formData: FormData) => {
    setFilters({
      from: formData.get("from") as string,
      to: formData.get("to") as string,
      province: formData.get("q") as string,
    });
  }

  return (
    <DashboardShell title="Sentiment Map">
      <FilterToolbar
        onFilter={handleFilter}
        searchValue={filters.province}
        searchPlaceholder="Filter by province"
        showDateRange
        fromValue={filters.from}
        toValue={filters.to}
      />

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
              <p className="border-2 p-2">Average sentiment: {topProvince ? topProvince.average_sentiment.toFixed(2) : "0.00"}</p>
            </div>
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
                  <thead className="border-b-2 bg-accent/50">
                    <tr>
                      <th className="p-2 font-semibold">Tag</th>
                      <th className="p-2 font-semibold">Mentions</th>
                      <th className="p-2 font-semibold">Avg. Sentiment</th>
                      {!selectedProvince && <th className="p-2 font-semibold">Top Province</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {mapTags.map((t, idx) => (
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
    </DashboardShell>
  );
}

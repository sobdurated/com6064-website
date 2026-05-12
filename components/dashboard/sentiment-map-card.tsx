"use client";

import type { ProvinceMapRow } from "@/lib/api/types";
import { Card } from "@/components/retroui/Card";
import { Badge } from "@/components/retroui/Badge";
import { Map, MapControls, MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";
import { provinceCoordinates } from "@/lib/utils/provinces";

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function sentimentColor(score: number | undefined) {
  if (typeof score !== "number") return "#9ca3af";
  if (score >= 0.6) return "#2f9e44";
  if (score >= 0.45) return "#9ca3af";
  return "#dc2626";
}

export function SentimentMapCard({
  provinces,
  selectedProvince,
  setFilters,
}: {
  provinces: ProvinceMapRow[];
  selectedProvince?: string;
  setFilters: React.Dispatch<React.SetStateAction<{
    from: string;
    to: string;
    province: string;
    q: string;
  }>>;
}) {

  const validProvinces = provinces.filter((item) => {
    return !!provinceCoordinates[normalizeName(item.province)];
  });

  const topRows = validProvinces.slice(0, 3);
  const maxPosts = Math.max(1, ...validProvinces.map((item) => item.total_posts));

  const setProvinceFilter = (province: string) => {
    setFilters((prev) => ({
      ...prev,
      province: province === selectedProvince ? "" : province,
    }));
  };

  return (
    <Card className="w-full overflow-hidden">
      <Card.Content className="space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-emerald-300 text-black" variant="solid" size="sm">
            Positive
          </Badge>
          <Badge className="bg-rose-300 text-black" variant="solid" size="sm">
            Negative
          </Badge>
        </div>

        <Map
          className="h-[500px] md:h-[600px] w-full overflow-hidden border-2"
          center={[35.2433, 38.9637]}
          zoom={5}
          minZoom={4}
          maxZoom={8}
        >
          {validProvinces.map((item) => {
            const normalized = normalizeName(item.province);
            const [longitude, latitude] = provinceCoordinates[normalized];
            const isSelected = selectedProvince && normalizeName(selectedProvince) === normalized;
            const size = 10 + Math.round((item.total_posts / maxPosts) * 16);

            return (
              <MapMarker key={item.province} longitude={longitude} latitude={latitude}>
                <MarkerContent>
                  <button
                    type="button"
                    onClick={() => setProvinceFilter(item.province)}
                    className="rounded-full border-2 border-black transition-all hover:scale-110"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: sentimentColor(item.average_sentiment),
                      boxShadow: isSelected ? "0 0 0 4px #ffffff, 0 0 0 6px #111111" : "none",
                    }}
                    aria-label={`Filter ${item.province}`}
                    title={item.province}
                  />
                </MarkerContent>
                <MarkerTooltip>
                  <p className="font-medium">{item.province}</p>
                  <p>Posts: {item.total_posts.toLocaleString()}</p>
                  <p>Sentiment: {item.average_sentiment.toFixed(2)}</p>
                </MarkerTooltip>
              </MapMarker>
            );
          })}
          <MapControls showZoom position="bottom-right" />
        </Map>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {topRows.map((item) => (
            <div
              key={item.province}
              className="border-2 p-2 text-sm"
              style={{ background: sentimentColor(item.average_sentiment) + "22" }}
            >
              <p className="font-medium">{item.province}</p>
              <p>Total posts: {item.total_posts.toLocaleString()}</p>
              <p>Sentiment score: {item.average_sentiment.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}

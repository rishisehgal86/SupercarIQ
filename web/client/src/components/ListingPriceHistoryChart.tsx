/**
 * ListingPriceHistoryChart — per-listing price history from car_price_snapshots_v2
 * Shows how the asking price has changed over time, with IIV reference line.
 */
import { trpc } from "@/lib/trpc";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
const fmtK = (n: number) => `£${(n / 1000).toFixed(0)}k`;

interface Props {
  listingId: string;
  iiv?: number | null;
  currentPrice?: number;
}

export function ListingPriceHistoryChart({ listingId, iiv, currentPrice }: Props) {
  const { data: history, isLoading } = trpc.listings.priceHistory.useQuery({ listingId });

  if (isLoading) {
    return (
      <div className="h-32 bg-muted/30 animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading price history...</span>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center border border-dashed border-border">
        <p className="text-xs text-muted-foreground">
          Price history will appear here once the daily pipeline runs.
        </p>
      </div>
    );
  }

  const chartData = history.map(h => ({
    date: new Date(h.recordedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    price: h.price,
    change: h.changeAmount ?? 0,
  }));

  // Determine trend
  const first = history[0].price;
  const last = history[history.length - 1].price;
  const totalChange = last - first;
  const priceDrops = history.filter(h => (h.changeAmount ?? 0) < 0).length;

  const minPrice = Math.min(...history.map(h => h.price));
  const maxPrice = Math.max(...history.map(h => h.price));
  const yMin = Math.floor(Math.min(minPrice, iiv ?? minPrice) * 0.97 / 1000) * 1000;
  const yMax = Math.ceil(Math.max(maxPrice, iiv ?? maxPrice) * 1.03 / 1000) * 1000;

  return (
    <div>
      {/* Summary row */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          {totalChange < 0 ? (
            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
          ) : totalChange > 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className={`font-mono font-semibold ${totalChange < 0 ? "text-emerald-600" : totalChange > 0 ? "text-red-500" : "text-muted-foreground"}`}>
            {totalChange === 0 ? "No change" : `${totalChange > 0 ? "+" : ""}${fmt(totalChange)}`}
          </span>
          <span className="text-muted-foreground">since first listed</span>
        </div>
        {priceDrops > 0 && (
          <span className="text-emerald-600 font-medium">
            {priceDrops} price {priceDrops === 1 ? "drop" : "drops"}
          </span>
        )}
        <span className="text-muted-foreground ml-auto">{history.length} data {history.length === 1 ? "point" : "points"}</span>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`priceGrad-${listingId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--muted-foreground)" }}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--muted-foreground)" }}
            tickFormatter={v => fmtK(v)}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              fontSize: 11,
              fontFamily: "monospace",
            }}
            formatter={(v: number, name: string) => [fmt(v), "Asking Price"]}
            labelStyle={{ color: "var(--muted-foreground)", fontSize: 10 }}
          />
          {iiv != null && (
            <ReferenceLine
              y={iiv}
              stroke="var(--primary)"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: `IIV ${fmtK(iiv)}`,
                position: "insideTopRight",
                fontSize: 9,
                fill: "var(--primary)",
                fontFamily: "monospace",
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--primary)"
            strokeWidth={1.5}
            fill={`url(#priceGrad-${listingId})`}
            dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * MarketTrendChart — 90-day market stats from market_daily_stats table.
 * Shows supply (active count) and average price trends over time.
 */
import { trpc } from "@/lib/trpc";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const fmtK = (n: number) => `£${(n / 1000).toFixed(0)}k`;

interface Props {
  modelKey: string;
  days?: number;
}

export function MarketTrendChart({ modelKey, days = 90 }: Props) {
  const { data: stats, isLoading } = trpc.market.dailyStats.useQuery({ modelKey, days });

  if (isLoading) {
    return (
      <div className="h-40 bg-muted/30 animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading market trends...</span>
      </div>
    );
  }

  if (!stats || stats.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center border border-dashed border-border">
        <p className="text-xs text-muted-foreground text-center px-4">
          Market trend charts will appear here once at least 2 days of data have been collected.
        </p>
      </div>
    );
  }

  const chartData = stats.map(s => ({
    date: new Date(s.statDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    supply: s.activeCount,
    avgPrice: s.avgPrice,
    newListings: s.newListings,
    sold: s.soldCount,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--muted-foreground)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="supply"
            orientation="left"
            tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={24}
          />
          <YAxis
            yAxisId="price"
            orientation="right"
            tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => fmtK(v)}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              fontSize: 11,
              fontFamily: "monospace",
            }}
            formatter={(v: number, name: string) => {
              if (name === "Avg Price") return [fmtK(v), name];
              return [v, name];
            }}
            labelStyle={{ color: "var(--muted-foreground)", fontSize: 10 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, fontFamily: "monospace", paddingTop: 8 }}
          />
          <Bar
            yAxisId="supply"
            dataKey="supply"
            name="Active Supply"
            fill="var(--primary)"
            fillOpacity={0.25}
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="avgPrice"
            name="Avg Price"
            stroke="var(--primary)"
            strokeWidth={1.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

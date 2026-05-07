/**
 * MarketOverview — Live Market Dashboard
 * DB-driven page showing real-time stats across all tracked Ferrari models.
 * Supply counts, average prices, new listings, sold counts, top picks.
 */
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { GlobalNav } from "@/components/GlobalNav";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity, Archive, ArrowRight } from "lucide-react";

const fmt = (n: number | null | undefined) =>
  n != null ? `£${n.toLocaleString("en-GB")}` : "—";
const fmtK = (n: number | null | undefined) =>
  n != null ? `£${(n / 1000).toFixed(0)}k` : "—";

const MODEL_META: Record<string, { label: string; path: string; era: string }> = {
  "812-superfast": { label: "812 Superfast", path: "/812-superfast", era: "2017–2022" },
  "f8-tributo":    { label: "F8 Tributo",    path: "/f8-tributo",    era: "2019–2022" },
  "458-italia":    { label: "458 Italia",    path: "/458-italia",    era: "2009–2015" },
  "488-gtb":       { label: "488 GTB",       path: "/488-gtb",       era: "2015–2020" },
  "california-t":  { label: "California T",  path: "/california-t",  era: "2014–2018" },
  "portofino":     { label: "Portofino",     path: "/portofino",     era: "2017–2021" },
  "roma":          { label: "Roma",          path: "/roma",          era: "2020–present" },
};

function TrendIcon({ newListings, soldCount }: { newListings: number; soldCount: number }) {
  if (newListings > soldCount + 1) return <TrendingUp className="w-3.5 h-3.5 text-amber-500" />;
  if (soldCount > newListings + 1) return <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

export default function MarketOverview() {
  const { data: allLatest, isLoading: statsLoading } = trpc.market.allLatest.useQuery();
  const { data: allActive, isLoading: activeLoading } = trpc.listings.allActive.useQuery();
  const { data: allSold } = trpc.listings.allSold.useQuery({ limit: 200 });

  const isLoading = statsLoading || activeLoading;

  // Build per-model summary from live listings
  const modelSummaries = Object.keys(MODEL_META).map(modelKey => {
    const activeForModel = (allActive ?? []).filter(c => c.modelKey === modelKey);
    const soldForModel = (allSold ?? []).filter(c => c.modelKey === modelKey);
    const latestStat = (allLatest ?? []).find((s: any) => s.market_daily_stats?.modelKey === modelKey)?.market_daily_stats;
    const topPick = activeForModel.sort((a, b) => (b.details?.totalScore ?? 0) - (a.details?.totalScore ?? 0))[0];
    const prices = activeForModel.map(c => c.askingPrice);
    const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;
    const bestGap = activeForModel.reduce((best, c) => Math.max(best, c.details?.priceVariance ?? -Infinity), -Infinity);

    return {
      modelKey,
      meta: MODEL_META[modelKey],
      activeCount: activeForModel.length,
      soldCount: soldForModel.length,
      avgPrice,
      minPrice,
      maxPrice,
      bestGap: isFinite(bestGap) ? bestGap : null,
      topPick,
      latestStat,
    };
  });

  // Chart data: active count per model
  const supplyChartData = modelSummaries
    .filter(m => m.activeCount > 0)
    .map(m => ({ name: m.meta.label.replace(" ", "\n"), count: m.activeCount }));

  // Chart data: avg price per model
  const priceChartData = modelSummaries
    .filter(m => m.avgPrice != null)
    .map(m => ({ name: m.meta.label, avg: m.avgPrice, min: m.minPrice, max: m.maxPrice }));

  const totalActive = modelSummaries.reduce((s, m) => s + m.activeCount, 0);
  const totalSold = modelSummaries.reduce((s, m) => s + m.soldCount, 0);

  return (
    <div className="min-h-screen bg-background">
      <GlobalNav />

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-8 md:py-12">
          <div className="data-label text-primary mb-2">Live Market Intelligence</div>
          <h1 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-2">
            Ferrari Market Overview
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mb-6">
            Real-time supply, pricing, and velocity data across all tracked models.
            Updated daily from AutoTrader and Ferrari Approved.
          </p>

          {/* Top-level stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
            {[
              { label: "Active Listings", value: isLoading ? "—" : String(totalActive) },
              { label: "Models Tracked", value: "7" },
              { label: "Sold in Archive", value: isLoading ? "—" : String(totalSold) },
              { label: "Data Source", value: "AutoTrader + FA" },
            ].map(s => (
              <div key={s.label} className="bg-background px-4 py-3">
                <div className="data-label text-[10px] mb-1">{s.label}</div>
                <div className="font-serif text-xl font-bold text-primary">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-10">

        {/* Model cards grid */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="font-serif text-xl font-bold text-foreground">Supply by Model</h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modelSummaries.map(m => (
                <Link key={m.modelKey} href={m.meta.path}>
                  <div className="group bg-card border border-border hover:border-primary/40 transition-all p-5 cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="data-label text-[10px] text-muted-foreground mb-0.5">{m.meta.era}</div>
                        <div className="font-serif font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                          {m.meta.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {m.latestStat && (
                          <TrendIcon
                            newListings={m.latestStat.newListings ?? 0}
                            soldCount={m.latestStat.soldCount ?? 0}
                          />
                        )}
                        <span className={`font-serif text-2xl font-bold ${m.activeCount === 0 ? "text-muted-foreground/40" : "text-primary"}`}>
                          {m.activeCount}
                        </span>
                        <span className="text-xs text-muted-foreground">active</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="data-label text-[9px] mb-0.5">Avg Price</div>
                        <div className="font-mono font-semibold">{fmtK(m.avgPrice)}</div>
                      </div>
                      <div>
                        <div className="data-label text-[9px] mb-0.5">Price Range</div>
                        <div className="font-mono text-muted-foreground">
                          {m.minPrice && m.maxPrice ? `${fmtK(m.minPrice)}–${fmtK(m.maxPrice)}` : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="data-label text-[9px] mb-0.5">Best IIV Gap</div>
                        <div className={`font-mono font-semibold ${m.bestGap != null && m.bestGap > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {m.bestGap != null ? (m.bestGap >= 0 ? `+${fmtK(m.bestGap)}` : fmtK(m.bestGap)) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="data-label text-[9px] mb-0.5">Sold Archive</div>
                        <div className="font-mono text-muted-foreground">{m.soldCount} cars</div>
                      </div>
                    </div>

                    {m.topPick && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          Top pick: <span className="text-foreground font-medium">
                            {m.topPick.year} {m.topPick.colour ?? "—"}
                          </span>
                          {m.topPick.details?.totalScore != null && (
                            <span className="text-primary ml-1 font-mono">
                              {m.topPick.details.totalScore.toFixed(1)}/100
                            </span>
                          )}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Charts */}
        {!isLoading && totalActive > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Supply chart */}
            <div className="bg-card border border-border p-5">
              <div className="data-label text-[10px] text-muted-foreground mb-1">Active Supply</div>
              <h3 className="font-serif font-bold text-base text-foreground mb-4">Listings by Model</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={supplyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 11 }}
                    formatter={(v: number) => [`${v} listings`, "Active"]}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Price range chart */}
            <div className="bg-card border border-border p-5">
              <div className="data-label text-[10px] text-muted-foreground mb-1">Current Pricing</div>
              <h3 className="font-serif font-bold text-base text-foreground mb-4">Average Asking Price by Model</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priceChartData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: "monospace" }} angle={-20} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 11 }}
                    formatter={(v: number) => [fmt(v), ""]}
                  />
                  <Bar dataKey="avg" fill="var(--primary)" radius={[2, 2, 0, 0]} name="Avg Price" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Sold archive CTA */}
        <section className="bg-card border border-border p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Archive className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <div className="font-serif font-bold text-base text-foreground mb-1">Sold Cars Archive</div>
              <p className="text-sm text-muted-foreground">
                {totalSold > 0
                  ? `${totalSold} sold cars tracked with final asking prices and days on market. Use these as comparable sales when negotiating.`
                  : "The sold archive will populate as cars are marked sold by the daily pipeline."}
              </p>
            </div>
          </div>
          <Link href="/sold-archive">
            <button className="shrink-0 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
              View Archive
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </section>

      </div>
    </div>
  );
}

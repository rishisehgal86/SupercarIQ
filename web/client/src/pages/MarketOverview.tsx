import { useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import GlobalNav from "@/components/GlobalNav";
import { Loader2, TrendingUp, TrendingDown, Minus, BarChart2, Car, DollarSign, Activity } from "lucide-react";

const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
const fmtK = (n: number) => `£${(n / 1000).toFixed(0)}k`;

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "strong-buy": { label: "STRONG BUY", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  "buy":        { label: "BUY",         color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  "consider":   { label: "CONSIDER",    color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  "avoid":      { label: "AVOID",       color: "text-red-700",     bg: "bg-red-50 border-red-200" },
};

export default function MarketOverview() {
  const { data: models, isLoading: modelsLoading } = trpc.models.all.useQuery();
  const { data: marketStats, isLoading: statsLoading } = trpc.market.allLatest.useQuery();
  const { data: allListings, isLoading: listingsLoading } = trpc.listings.allActive.useQuery();

  const isLoading = modelsLoading || statsLoading || listingsLoading;

  // Build a map of modelKey → latest market stats
  const statsMap = useMemo(() => {
    const map: Record<string, { activeCount: number; minPrice: number; maxPrice: number; avgPrice: number }> = {};
    if (!marketStats) return map;
    for (const row of marketStats) {
      const r = (row as Record<string, unknown>);
      const mds = (r.market_daily_stats ?? r) as Record<string, unknown>;
      const key = String(mds.modelKey ?? r.modelKey ?? "");
      if (!key) continue;
      map[key] = {
        activeCount: Number(mds.activeCount ?? 0),
        minPrice: Number(mds.minPrice ?? 0),
        maxPrice: Number(mds.maxPrice ?? 0),
        avgPrice: Number(mds.avgPrice ?? 0),
      };
    }
    return map;
  }, [marketStats]);

  // Aggregate totals
  const totals = useMemo(() => {
    if (!allListings) return { count: 0, totalValue: 0, avgIiv: 0, avgScore: 0 };
    const count = allListings.length;
    const totalValue = allListings.reduce((s, l) => s + (l.askingPrice ?? 0), 0);
    const iivs = allListings.filter(l => l.details?.iiv).map(l => l.details!.iiv!);
    const scores = allListings.filter(l => l.details?.totalScore).map(l => l.details!.totalScore!);
    return {
      count,
      totalValue,
      avgIiv: iivs.length ? iivs.reduce((a, b) => a + b, 0) / iivs.length : 0,
      avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    };
  }, [allListings]);

  return (
    <div className="min-h-screen bg-background">
      <GlobalNav />

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-8 md:py-12">
          <div className="flex items-start gap-4">
            <div className="w-1 h-10 bg-primary shrink-0 mt-1" />
            <div>
              <div className="data-label text-primary mb-1">Live Market Intelligence</div>
              <h1 className="font-serif text-3xl md:text-4xl font-black text-foreground">Market Overview</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                Aggregate data across all tracked models. Updated twice daily from AutoTrader and Ferrari Approved listings.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 md:py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Aggregate stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-10">
              {[
                { icon: Car, label: "Live Listings", value: String(totals.count), sub: "across all models" },
                { icon: DollarSign, label: "Total Market Value", value: fmtK(totals.totalValue), sub: "combined asking prices" },
                { icon: Activity, label: "Avg IIV Score", value: totals.avgIiv ? fmt(Math.round(totals.avgIiv)) : "—", sub: "intrinsic investment value" },
                { icon: BarChart2, label: "Avg IIQ Score", value: totals.avgScore ? `${totals.avgScore.toFixed(1)}/100` : "—", sub: "composite quality score" },
              ].map(({ icon: Icon, label, value, sub }) => (
                <div key={label} className="bg-card px-4 py-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="data-label text-[10px]">{label}</span>
                  </div>
                  <div className="font-serif text-2xl font-bold text-foreground">{value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
                </div>
              ))}
            </div>

            {/* Per-model breakdown */}
            <div className="mb-6">
              <h2 className="font-serif text-xl font-bold text-foreground mb-1">Model Breakdown</h2>
              <p className="text-xs text-muted-foreground">Click any model to view the full report.</p>
            </div>

            <div className="space-y-px bg-border">
              {(models ?? []).map(model => {
                const stats = statsMap[model.modelKey] ?? { activeCount: 0, minPrice: 0, maxPrice: 0, avgPrice: 0 };
                const vc = VERDICT_CONFIG[model.investmentVerdict ?? ""] ?? VERDICT_CONFIG["consider"];
                const modelListings = (allListings ?? []).filter(l => l.modelKey === model.modelKey);
                const iivs = modelListings.filter(l => l.details?.iiv).map(l => l.details!.iiv!);
                const avgIiv = iivs.length ? iivs.reduce((a, b) => a + b, 0) / iivs.length : null;
                const priceVars = modelListings.filter(l => l.details?.priceVariance != null).map(l => l.details!.priceVariance!);
                const bestGap = priceVars.length ? Math.max(...priceVars) : null;

                return (
                  <Link key={model.modelKey} href={`/${model.modelKey}`}>
                    <div className="bg-card hover:bg-accent/30 transition-colors cursor-pointer px-4 py-4 md:px-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <Car className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-foreground truncate">
                              {model.make} {model.model}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {stats.activeCount} active listing{stats.activeCount !== 1 ? "s" : ""}
                              {stats.minPrice && stats.maxPrice ? ` · ${fmtK(stats.minPrice)}–${fmtK(stats.maxPrice)}` : ""}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {avgIiv && (
                            <div className="hidden md:block text-right">
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg IIV</div>
                              <div className="text-sm font-semibold text-foreground">{fmt(Math.round(avgIiv))}</div>
                            </div>
                          )}
                          {bestGap !== null && (
                            <div className="hidden md:block text-right">
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Best Gap</div>
                              <div className={`text-sm font-semibold flex items-center gap-1 ${bestGap > 0 ? "text-emerald-600" : bestGap < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                                {bestGap > 0 ? <TrendingUp className="w-3 h-3" /> : bestGap < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                {bestGap > 0 ? "+" : ""}{fmtK(bestGap)}
                              </div>
                            </div>
                          )}
                          <div className={`text-[10px] font-bold px-2 py-1 rounded border ${vc.bg} ${vc.color}`}>
                            {vc.label}
                          </div>
                          <svg className="w-4 h-4 text-muted-foreground hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Navigation links */}
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/research">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                  Full Research Hub →
                </span>
              </Link>
              <Link href="/compare">
                <span className="inline-flex items-center gap-2 px-4 py-2 border border-border text-foreground text-xs font-medium hover:border-primary/50 transition-colors">
                  Compare Models
                </span>
              </Link>
              <Link href="/sold-archive">
                <span className="inline-flex items-center gap-2 px-4 py-2 border border-border text-foreground text-xs font-medium hover:border-primary/50 transition-colors">
                  Sold Archive
                </span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * SoldArchive — Sold Cars Database
 * Shows all cars that have been marked as sold, with final asking price,
 * days on market, and model. Useful for comparable sales research.
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { GlobalNav } from "@/components/GlobalNav";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Clock, TrendingDown, Archive, ChevronRight } from "lucide-react";

const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
const fmtDate = (d: string | Date | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const MODEL_LABELS: Record<string, string> = {
  "812-superfast": "812 Superfast",
  "f8-tributo": "F8 Tributo",
  "458-italia": "458 Italia",
  "488-gtb": "488 GTB",
  "california-t": "California T",
  "portofino": "Portofino",
  "roma": "Roma",
};

const MODEL_PATHS: Record<string, string> = {
  "812-superfast": "/car",
  "f8-tributo": "/f8",
  "458-italia": "/458",
  "488-gtb": "/488",
  "california-t": "/california-t",
  "portofino": "/portofino",
  "roma": "/roma",
};

const VERDICT_CLASS: Record<string, string> = {
  "strong-buy": "verdict-strong-buy",
  "buy": "verdict-buy",
  "consider": "verdict-consider",
  "avoid": "verdict-avoid",
};

const VERDICT_LABELS: Record<string, string> = {
  "strong-buy": "STRONG BUY",
  "buy": "BUY",
  "consider": "CONSIDER",
  "avoid": "AVOID",
};

export default function SoldArchive() {
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"sold-date" | "price" | "dom">("sold-date");

  const { data: soldCars, isLoading } = trpc.listings.allSold.useQuery({ limit: 200 });

  const filtered = useMemo(() => {
    if (!soldCars) return [];
    let list = [...soldCars];

    if (modelFilter !== "all") {
      list = list.filter(c => c.modelKey === modelFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.colour?.toLowerCase().includes(q)) ||
        (c.year?.toString().includes(q)) ||
        (MODEL_LABELS[c.modelKey]?.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === "sold-date") {
        return new Date(b.soldDate ?? 0).getTime() - new Date(a.soldDate ?? 0).getTime();
      }
      if (sortBy === "price") return b.askingPrice - a.askingPrice;
      if (sortBy === "dom") return (b.daysOnMarket ?? 0) - (a.daysOnMarket ?? 0);
      return 0;
    });

    return list;
  }, [soldCars, modelFilter, search, sortBy]);

  // Summary stats
  const stats = useMemo(() => {
    if (!soldCars || !soldCars.length) return null;
    const prices = soldCars.map(c => c.askingPrice);
    const doms = soldCars.filter(c => c.daysOnMarket).map(c => c.daysOnMarket!);
    return {
      total: soldCars.length,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      avgDom: doms.length ? Math.round(doms.reduce((a, b) => a + b, 0) / doms.length) : null,
      fastestSale: doms.length ? Math.min(...doms) : null,
    };
  }, [soldCars]);

  return (
    <div className="min-h-screen bg-background">
      <GlobalNav />

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-8 md:py-12">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-primary/10 border border-primary/20 mt-1">
              <Archive className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="data-label text-primary mb-1">Sold Cars Archive</div>
              <h1 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-2">
                Comparable Sales Database
              </h1>
              <p className="text-muted-foreground text-sm max-w-xl">
                Every Ferrari tracked by SupercarIQ that has sold. Use these as comparable sales when
                negotiating — see what similar cars actually sold for and how long they took.
              </p>
            </div>
          </div>

          {/* Summary stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mt-6">
              {[
                { label: "Total Sold", value: String(stats.total) },
                { label: "Avg Final Price", value: fmt(stats.avgPrice) },
                { label: "Avg Days on Market", value: stats.avgDom ? `${stats.avgDom} days` : "—" },
                { label: "Fastest Sale", value: stats.fastestSale ? `${stats.fastestSale} days` : "—" },
              ].map(s => (
                <div key={s.label} className="bg-background px-4 py-3">
                  <div className="data-label text-[10px] mb-1">{s.label}</div>
                  <div className="font-serif text-lg font-bold text-primary">{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border bg-card/50 sticky top-14 z-30">
        <div className="container py-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search colour, year..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder="All models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {Object.entries(MODEL_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sold-date">Most Recently Sold</SelectItem>
              <SelectItem value="price">Highest Price</SelectItem>
              <SelectItem value="dom">Longest on Market</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} {filtered.length === 1 ? "car" : "cars"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="container py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading sold archive...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Archive className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No sold cars found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {soldCars?.length === 0
                ? "The sold archive will populate as cars are marked sold by the daily pipeline."
                : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase border-b border-border mb-1">
              <span>Car</span>
              <span>Model</span>
              <span>Final Price</span>
              <span>IIV at Listing</span>
              <span>Days on Market</span>
              <span>Sold Date</span>
              <span />
            </div>

            <div className="divide-y divide-border">
              {filtered.map(car => {
                const modelPath = MODEL_PATHS[car.modelKey] ?? "/research";
                const iiv = car.details?.iiv;
                const verdict = car.details?.investmentVerdict;
                const dom = car.daysOnMarket;

                return (
                  <div
                    key={car.id}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-4 py-4 hover:bg-card/60 transition-colors group"
                  >
                    {/* Car identity */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <div className="font-medium text-sm text-foreground">
                          {car.year} {car.colour ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {car.mileage ? `${car.mileage.toLocaleString("en-GB")} mi` : "—"}
                        </div>
                        {verdict && (
                          <span className={`data-label text-[9px] px-1 py-0.5 mt-1 inline-block ${VERDICT_CLASS[verdict] ?? ""}`}>
                            {VERDICT_LABELS[verdict] ?? verdict.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Model */}
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground">
                        {MODEL_LABELS[car.modelKey] ?? car.modelKey}
                      </span>
                    </div>

                    {/* Final price */}
                    <div className="flex items-center">
                      <span className="font-mono font-semibold text-sm text-foreground">
                        {fmt(car.askingPrice)}
                      </span>
                    </div>

                    {/* IIV */}
                    <div className="flex items-center">
                      {iiv ? (
                        <div>
                          <div className="font-mono text-sm text-muted-foreground">{fmt(iiv)}</div>
                          {car.details?.priceVariance != null && (
                            <div className={`text-[10px] font-mono ${car.details.priceVariance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {car.details.priceVariance >= 0 ? "+" : ""}{fmt(car.details.priceVariance)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Days on market */}
                    <div className="flex items-center gap-1.5">
                      {dom != null ? (
                        <>
                          <Clock className="w-3 h-3 text-muted-foreground/50" />
                          <span className={`text-sm font-mono ${dom <= 30 ? "text-emerald-600 font-semibold" : dom <= 60 ? "text-amber-600" : "text-red-500"}`}>
                            {dom}d
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Sold date */}
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(car.soldDate)}
                      </span>
                    </div>

                    {/* Action */}
                    <div className="flex items-center">
                      <Link
                        href={`${modelPath}/${car.id}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-primary/10 rounded"
                      >
                        <ChevronRight className="w-4 h-4 text-primary" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

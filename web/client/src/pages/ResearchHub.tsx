/**
 * ResearchHub.tsx — All Models Library
 * Fully DB-driven via trpc.models.all + trpc.market.allLatest
 * Design: Direction B editorial — warm cream, Playfair Display, Ferrari red accent
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { GlobalNav } from "@/components/GlobalNav";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, ChevronRight, BarChart2, Loader2 } from "lucide-react";

const fmtK = (n: number) => `£${(n / 1000).toFixed(0)}k`;

const VERDICT_LABEL: Record<string, string> = {
  "strong-buy": "STRONG BUY",
  buy: "BUY",
  consider: "CONSIDER",
  avoid: "AVOID",
};
const VERDICT_CLASS: Record<string, string> = {
  "strong-buy": "text-emerald-700 bg-emerald-50 border border-emerald-200",
  buy: "text-blue-700 bg-blue-50 border border-blue-200",
  consider: "text-amber-700 bg-amber-50 border border-amber-200",
  avoid: "text-red-700 bg-red-50 border border-red-200",
};

function ModelCard({
  modelKey, make, model, yearMin, yearMax, engineSpec,
  heroImageUrl, investmentVerdict, isPublic, isActive, stats,
}: {
  modelKey: string; make: string; model: string;
  yearMin: number | null; yearMax: number | null; engineSpec: string | null;
  heroImageUrl: string | null; investmentVerdict: string | null;
  isPublic: boolean; isActive: boolean;
  stats?: { activeCount: number; minPrice: number; maxPrice: number } | null;
}) {
  const yearRange = yearMin && yearMax ? `${yearMin}\u2013${yearMax}` : yearMin ? `${yearMin}+` : "";
  const verdict = investmentVerdict ?? "consider";

  return (
    <Link href={isActive ? `/${modelKey}` : "#"}>
      <div className={`group relative bg-white border border-[#E8E4DC] hover:border-primary/40 transition-all duration-200 overflow-hidden cursor-pointer ${!isActive ? "opacity-60" : ""}`}>
        <div className="relative h-44 overflow-hidden bg-[#F5F2EC]">
          {heroImageUrl ? (
            <img src={heroImageUrl} alt={`${make} ${model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-serif text-2xl text-foreground/20">{make}</span>
            </div>
          )}
          {isActive && verdict && (
            <div className="absolute top-3 left-3">
              <span className={`data-label px-2 py-0.5 text-[10px] font-bold ${VERDICT_CLASS[verdict] ?? VERDICT_CLASS.consider}`}>
                {VERDICT_LABEL[verdict] ?? verdict.toUpperCase()}
              </span>
            </div>
          )}
          {!isActive && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="data-label text-xs text-muted-foreground border border-border px-3 py-1 bg-background/80">
                COMING SOON
              </span>
            </div>
          )}
          {isActive && !isPublic && (
            <div className="absolute top-3 right-3">
              <span className="data-label px-1.5 py-0.5 text-[9px] bg-primary/10 text-primary border border-primary/20">GATED</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="data-label text-[10px] text-muted-foreground mb-0.5">{make} · {yearRange}</div>
              <h3 className="font-serif text-lg font-bold text-foreground leading-tight">{model}</h3>
            </div>
            {isActive && <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />}
          </div>
          {engineSpec && <div className="data-label text-[10px] text-muted-foreground mb-3">{engineSpec}</div>}
          {isActive && stats && stats.activeCount > 0 ? (
            <div className="grid grid-cols-3 gap-px bg-[#E8E4DC] border border-[#E8E4DC]">
              <div className="bg-[#FAFAF7] px-2 py-1.5 text-center">
                <div className="data-label text-[9px] text-muted-foreground">LISTINGS</div>
                <div className="font-mono text-sm font-bold text-foreground">{stats.activeCount}</div>
              </div>
              <div className="bg-[#FAFAF7] px-2 py-1.5 text-center">
                <div className="data-label text-[9px] text-muted-foreground">FROM</div>
                <div className="font-mono text-sm font-bold text-foreground">{fmtK(stats.minPrice)}</div>
              </div>
              <div className="bg-[#FAFAF7] px-2 py-1.5 text-center">
                <div className="data-label text-[9px] text-muted-foreground">TO</div>
                <div className="font-mono text-sm font-bold text-foreground">{fmtK(stats.maxPrice)}</div>
              </div>
            </div>
          ) : isActive ? (
            <div className="text-xs text-muted-foreground italic">No active listings</div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function ResearchHub() {
  const [search, setSearch] = useState("");
  const [filterVerdict, setFilterVerdict] = useState<string>("all");

  const { data: models, isLoading: modelsLoading } = trpc.models.all.useQuery();
  const { data: marketStats, isLoading: statsLoading } = trpc.market.allLatest.useQuery();

  const statsMap = useMemo(() => {
    if (!marketStats) return {} as Record<string, { activeCount: number; minPrice: number; maxPrice: number }>;
    const map: Record<string, { activeCount: number; minPrice: number; maxPrice: number }> = {};
    for (const row of marketStats as any[]) {
      const s = row.market_daily_stats ?? row;
      if (s?.modelKey) {
        map[s.modelKey] = { activeCount: s.activeCount ?? 0, minPrice: s.minPrice ?? 0, maxPrice: s.maxPrice ?? 0 };
      }
    }
    return map;
  }, [marketStats]);

  const filtered = useMemo(() => {
    if (!models) return [];
    return (models as any[]).filter((m) => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.make?.toLowerCase().includes(q) || m.model?.toLowerCase().includes(q) || m.engineSpec?.toLowerCase().includes(q);
      const matchVerdict = filterVerdict === "all" || m.investmentVerdict === filterVerdict;
      return matchSearch && matchVerdict;
    });
  }, [models, search, filterVerdict]);

  const liveCount = useMemo(() => (models as any[] | undefined)?.filter((m) => m.isActive).length ?? 0, [models]);
  const totalListings = useMemo(() => Object.values(statsMap).reduce((sum, s) => sum + (s.activeCount ?? 0), 0), [statsMap]);
  const isLoading = modelsLoading || statsLoading;

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <GlobalNav />
      <div className="border-b border-[#E8E4DC] bg-white">
        <div className="container py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
            <div>
              <div className="data-label text-primary text-xs mb-2">SupercarIQ · Research Library</div>
              <h1 className="font-serif text-3xl md:text-4xl font-black text-foreground mb-2">All Models</h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Every supercar we track — ranked, scored, and analysed using the same rigorous IIV methodology.
              </p>
            </div>
            <div className="flex gap-6 shrink-0">
              <div className="text-right">
                <div className="font-serif text-2xl font-bold text-primary">{isLoading ? "—" : liveCount}</div>
                <div className="data-label text-[10px] text-muted-foreground">MODELS LIVE</div>
              </div>
              <div className="text-right">
                <div className="font-serif text-2xl font-bold text-foreground">{isLoading ? "—" : totalListings}</div>
                <div className="data-label text-[10px] text-muted-foreground">ACTIVE LISTINGS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-[#E8E4DC] bg-white/80 backdrop-blur-sm sticky top-[56px] z-30">
        <div className="container py-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search models..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-[#FAFAF7] border-[#E8E4DC]" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", "strong-buy", "buy", "consider", "avoid"].map((v) => (
              <button key={v} onClick={() => setFilterVerdict(v)}
                className={`data-label px-2.5 py-1 text-[10px] border transition-colors ${
                  filterVerdict === v ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-muted-foreground border-[#E8E4DC] hover:border-primary/40"}`}>
                {v === "all" ? "ALL" : VERDICT_LABEL[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8 md:py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No models match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((m: any) => (
              <ModelCard key={m.modelKey} modelKey={m.modelKey} make={m.make} model={m.model}
                yearMin={m.yearMin} yearMax={m.yearMax} engineSpec={m.engineSpec}
                heroImageUrl={m.heroImageUrl} investmentVerdict={m.investmentVerdict}
                isPublic={m.isPublic ?? true} isActive={m.isActive ?? false}
                stats={statsMap[m.modelKey] ?? null} />
            ))}
          </div>
        )}
        <div className="mt-12 pt-8 border-t border-[#E8E4DC]">
          <div className="flex gap-3 items-start max-w-2xl">
            <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="data-label text-xs text-primary mb-1">IIV METHODOLOGY</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every car is scored using our Intrinsic Investment Value (IIV) framework — a weighted model
                covering provenance, specification, condition, GPF status, and market pricing. Scores are
                recalculated with each pipeline run. Investment verdicts reflect the overall market opportunity,
                not individual car quality.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

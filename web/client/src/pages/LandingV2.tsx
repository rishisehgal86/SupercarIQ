/**
 * SupercarIQ — Homepage (Direction B: Editorial Magazine)
 * All data served live from DB via tRPC — no static TS data files.
 */
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp, ChevronRight, ArrowRight,
  BarChart2, BookOpen, Award
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtK = (n: number) => `£${(n / 1000).toFixed(0)}k`;

const VERDICT_LABEL: Record<string, string> = {
  "strong-buy": "STRONG BUY",
  "buy": "BUY",
  "consider": "CONSIDER",
  "avoid": "AVOID",
};
const VERDICT_COLOR: Record<string, string> = {
  "strong-buy": "text-emerald-700 bg-emerald-50 border-emerald-200",
  "buy": "text-blue-700 bg-blue-50 border-blue-200",
  "consider": "text-amber-700 bg-amber-50 border-amber-200",
  "avoid": "text-red-700 bg-red-50 border-red-200",
};

function useCountUp(target: number, duration = 1200, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
      else setValue(target);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ModelConfig = {
  modelKey: string;
  make: string;
  model: string;
  heroImageUrl: string | null;
  investmentVerdict: string | null;
  isPublic: boolean;
  engineSpec: string | null;
  yearMin: number;
  yearMax: number;
};

type MarketStat = {
  modelKey: string;
  activeCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
};

// ─── Live Ticker ──────────────────────────────────────────────────────────────

function LiveTicker({ totalListings, totalModels }: { totalListings: number; totalModels: number }) {
  return (
    <div className="bg-foreground text-background py-2 overflow-hidden">
      <div className="container">
        <div className="flex items-center gap-6 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-primary shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            LIVE DATA
          </span>
          <span className="text-background/70">{totalListings} active listings across {totalModels} models</span>
          <span className="hidden md:block text-background/50">Updated twice daily \u00b7 UK market only</span>
          <span className="hidden lg:block text-background/50">IIV-scored \u00b7 Investment-grade analysis</span>
        </div>
      </div>
    </div>
  );
}

// ─── Global Nav ───────────────────────────────────────────────────────────────

function HomeNav({ models }: { models: ModelConfig[] }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-1 h-6 bg-primary" />
            <span className="font-serif font-bold text-base tracking-wide text-foreground">SupercarIQ</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {models.slice(0, 6).map(m => (
              <Link
                key={m.modelKey}
                href={`/${m.modelKey}`}
                className="px-2.5 py-1.5 text-xs font-medium text-foreground/60 hover:text-foreground transition-colors"
              >
                {m.model}
              </Link>
            ))}
            {models.length > 6 && (
              <span className="px-2.5 py-1.5 text-xs text-muted-foreground">+{models.length - 6} more</span>
            )}
            <Link href="/research" className="ml-2 px-3 py-1.5 text-xs font-semibold border border-primary text-primary hover:bg-primary/10 transition-colors">
              All Models
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="space-y-1.5">
              <span className={`block w-5 h-0.5 bg-current transition-transform ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-5 h-0.5 bg-current transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-current transition-transform ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </div>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-border pb-3">
            {models.map(m => (
              <Link
                key={m.modelKey}
                href={`/${m.modelKey}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between px-2 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{m.make} {m.model}</span>
                {!m.isPublic && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">MEMBERS</span>}
              </Link>
            ))}
            <div className="border-t border-border mt-1 pt-2">
              <Link href="/research" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-2 py-2.5 text-sm font-semibold text-primary">
                <ArrowRight className="w-4 h-4" />
                All Models
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({
  topModel,
  topStats,
}: {
  topModel: ModelConfig | null;
  topStats: MarketStat | null;
}) {
  const heroImg = topModel?.heroImageUrl ?? "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1600";
  const verdict = topModel?.investmentVerdict ?? "strong-buy";
  const verdictCls = VERDICT_COLOR[verdict] ?? VERDICT_COLOR["consider"];

  return (
    <section className="relative min-h-[88vh] flex items-end overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImg})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 to-transparent" />

      <div className="absolute top-6 right-6 md:top-8 md:right-8">
        <div className={`text-[10px] font-black px-3 py-1.5 border rounded tracking-widest ${verdictCls}`}>
          {VERDICT_LABEL[verdict] ?? verdict.toUpperCase()} \u00b7 TOP PICK
        </div>
      </div>

      <div className="relative container pb-12 pt-28 md:pb-20">
        <div className="max-w-2xl">
          <div className="text-xs text-primary tracking-widest uppercase mb-3 font-medium">
            Current Top Pick \u00b7 {topStats?.activeCount ?? "\u2014"} Active Listings
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-8xl font-black text-foreground leading-none mb-4 md:mb-6">
            {topModel?.make ?? "Ferrari"}<br />
            <span className="text-primary italic">{topModel?.model ?? "812 Superfast"}</span>
          </h1>
          <p className="text-base md:text-lg text-foreground/65 max-w-lg mb-6 font-light leading-relaxed">
            The UK's most rigorous supercar investment analysis. Every listing scored, ranked, and explained.
          </p>

          {topStats?.minPrice != null && topStats?.maxPrice != null && (
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-card border border-border px-4 py-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Price Range</div>
                <div className="font-serif font-bold text-foreground">{fmtK(topStats.minPrice)} \u2013 {fmtK(topStats.maxPrice)}</div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {topModel && (
              <Link href={`/${topModel.modelKey}`} className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                View Full Report
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link href="/research" className="inline-flex items-center gap-2 px-5 py-3 bg-card border border-border text-foreground text-sm font-medium hover:border-primary/50 transition-colors">
              All Models
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Model Cards Grid ─────────────────────────────────────────────────────────

function ModelCard({ config, stats }: { config: ModelConfig; stats: MarketStat | null }) {
  const verdict = config.investmentVerdict ?? "consider";
  const verdictCls = VERDICT_COLOR[verdict] ?? VERDICT_COLOR["consider"];
  const heroImg = config.heroImageUrl ?? "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600";

  return (
    <Link href={`/${config.modelKey}`} className="group block bg-card border border-border hover:border-primary/40 transition-all hover:shadow-md overflow-hidden">
      <div className="relative h-44 overflow-hidden bg-muted">
        <img
          src={heroImg}
          alt={`${config.make} ${config.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3">
          <span className={`text-[10px] font-black px-2 py-1 border rounded tracking-widest ${verdictCls}`}>
            {VERDICT_LABEL[verdict] ?? verdict.toUpperCase()}
          </span>
        </div>
        {!config.isPublic && (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] bg-foreground/80 text-background px-2 py-0.5 rounded font-medium">MEMBERS</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{config.make}</div>
        <h3 className="font-serif font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
          {config.model}
        </h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          {stats?.activeCount != null && (
            <span>{stats.activeCount} listing{stats.activeCount !== 1 ? "s" : ""}</span>
          )}
          {stats?.minPrice != null && stats?.maxPrice != null && (
            <span>{fmtK(stats.minPrice)}\u2013{fmtK(stats.maxPrice)}</span>
          )}
          {config.engineSpec && (
            <span className="hidden sm:block truncate">{config.engineSpec}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{config.yearMin}\u2013{config.yearMax}</span>
          <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
            View Report <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function ModelGrid({ models, marketStats }: { models: ModelConfig[]; marketStats: MarketStat[] }) {
  const statsMap = Object.fromEntries(marketStats.map(s => [s.modelKey, s]));

  return (
    <section className="py-14 md:py-20 border-t border-border">
      <div className="container">
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div>
            <div className="text-xs text-primary tracking-widest uppercase mb-2 font-medium">Live Market Intelligence</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground">
              {models.length} Models Tracked
            </h2>
          </div>
          <Link href="/research" className="hidden md:flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {models.map(m => (
            <ModelCard key={m.modelKey} config={m} stats={statsMap[m.modelKey] ?? null} />
          ))}
        </div>

        <div className="mt-6 md:hidden text-center">
          <Link href="/research" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
            View all models <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      icon: <BarChart2 className="w-6 h-6" />,
      title: "Live Market Scraping",
      desc: "Every listing on AutoTrader and Ferrari Approved is tracked twice daily. New cars are discovered automatically.",
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "IIV Scoring",
      desc: "Each car is scored across 20+ dimensions \u2014 GPF status, provenance, specification, mileage, and market value \u2014 to produce an Intrinsic Investment Value.",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Investment Verdict",
      desc: "The IIV is compared to the asking price. The gap is your margin of safety. Strong Buy means the car is priced below its intrinsic value.",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Expert Narrative",
      desc: "LLM-powered analysis synthesises market data, buyer's guides, price predictions, and influencer sentiment into a complete investment case.",
    },
  ];

  return (
    <section className="py-14 md:py-20 border-t border-border bg-muted/30">
      <div className="container">
        <div className="text-center mb-10 md:mb-14">
          <div className="text-xs text-primary tracking-widest uppercase mb-2 font-medium">The Methodology</div>
          <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground">How SupercarIQ Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="bg-card border border-border p-5 md:p-6">
              <div className="text-primary mb-4">{step.icon}</div>
              <div className="font-serif font-bold text-foreground mb-2">{step.title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ totalListings, totalModels, modelsWithStrongBuy }: {
  totalListings: number;
  totalModels: number;
  modelsWithStrongBuy: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const animListings = useCountUp(totalListings, 1200, inView);
  const animModels = useCountUp(totalModels, 800, inView);
  const animBuy = useCountUp(modelsWithStrongBuy, 600, inView);

  return (
    <div ref={ref} className="bg-foreground text-background py-10 md:py-14">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-background/10">
          {[
            { label: "Active Listings", value: animListings.toLocaleString("en-GB") },
            { label: "Models Tracked", value: animModels.toString() },
            { label: "Strong Buy Signals", value: animBuy.toString() },
            { label: "Data Freshness", value: "< 12h" },
          ].map(stat => (
            <div key={stat.label} className="bg-foreground px-6 py-6 text-center">
              <div className="font-serif text-3xl md:text-4xl font-black text-primary mb-1">{stat.value}</div>
              <div className="text-[10px] text-background/50 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ models }: { models: ModelConfig[] }) {
  return (
    <footer className="border-t border-border py-10 md:py-14 bg-background">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-primary" />
              <span className="font-serif font-bold text-foreground">SupercarIQ</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Investment-grade analysis for the UK supercar market. Every listing scored, ranked, and explained.
            </p>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Models</div>
            <div className="grid grid-cols-2 gap-1">
              {models.slice(0, 8).map(m => (
                <Link key={m.modelKey} href={`/${m.modelKey}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5">
                  {m.model}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Platform</div>
            <div className="space-y-1">
              {[
                { label: "Research Hub", href: "/research" },
                { label: "Compare Models", href: "/compare" },
                { label: "Sold Archive", href: "/sold-archive" },
                { label: "Finance Calculator", href: "/finance" },
                { label: "Watchlist", href: "/watchlist" },
              ].map(l => (
                <Link key={l.href} href={l.href} className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            \u00a9 {new Date().getFullYear()} SupercarIQ. For informational purposes only. Not financial advice.
          </p>
          <p className="text-xs text-muted-foreground">UK market data \u00b7 Updated twice daily</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-8 bg-foreground" />
      <div className="h-14 bg-background border-b border-border" />
      <div className="min-h-[88vh] bg-muted animate-pulse" />
      <div className="container py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-64 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function LandingV2() {
  const modelsQuery = trpc.models.all.useQuery();
  const marketQuery = trpc.market.allLatest.useQuery();

  const isLoading = modelsQuery.isLoading || marketQuery.isLoading;

  const models = (modelsQuery.data ?? []) as ModelConfig[];
  const rawStats = (marketQuery.data ?? []) as any[];
  const marketStats: MarketStat[] = rawStats.map(row => {
    // Drizzle inner join returns { market_daily_stats: {...}, latest: {...} }
    // Handle both nested and flat shapes
    const r = (row.market_daily_stats ?? row) as any;
    return {
      modelKey: r.modelKey ?? r.model_key ?? "",
      activeCount: Number(r.activeCount ?? r.active_count ?? 0),
      minPrice: r.minPrice ?? r.min_price ?? null,
      maxPrice: r.maxPrice ?? r.max_price ?? null,
      avgPrice: r.avgPrice ?? r.avg_price ?? null,
    };
  });

  if (isLoading) return <LandingSkeleton />;

  const totalListings = marketStats.reduce((acc, s) => acc + (s.activeCount ?? 0), 0);
  const modelsWithStrongBuy = models.filter(m => m.investmentVerdict === "strong-buy").length;
  const topModel = models.find(m => m.investmentVerdict === "strong-buy") ?? models[0] ?? null;
  const topStats = topModel ? (marketStats.find(s => s.modelKey === topModel.modelKey) ?? null) : null;

  return (
    <div className="min-h-screen bg-background">
      <LiveTicker totalListings={totalListings} totalModels={models.length} />
      <HomeNav models={models} />
      <Hero topModel={topModel} topStats={topStats} />
      <ModelGrid models={models} marketStats={marketStats} />
      <HowItWorks />
      <StatsBar
        totalListings={totalListings}
        totalModels={models.length}
        modelsWithStrongBuy={modelsWithStrongBuy}
      />
      <Footer models={models} />
    </div>
  );
}

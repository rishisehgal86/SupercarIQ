/**
 * ReportPage.tsx — Unified report page for all supercar models.
 * Replaces all individual model report pages (Home.tsx, F8TributoReport.tsx, etc.)
 * All data comes from tRPC queries — no static TS data files.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { Loader2, ChevronDown, Share2, BookmarkPlus, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Listing = {
  id: string;
  sourceUrl: string;
  modelKey: string;
  source: string;
  status: string;
  askingPrice: number;
  year: number | null;
  colour: string | null;
  mileage: number | null;
  firstSeenDate: Date | string | null;
  details: {
    iiv: number | null;
    iivLow: number | null;
    iivHigh: number | null;
    priceVariance: number | null;
    totalScore: number | null;
    rank: number | null;
    investmentVerdict: string | null;
    gpfStatus: string | null;
    interior: string | null;
    dealer: string | null;
    dealerType: string | null;
    ownerCount: number | null;
    serviceHistory: string | null;
    accidentHistory: boolean | null;
    carbonPack: boolean | null;
    ccb: boolean | null;
    suspensionLift: boolean | null;
    atelierCar: boolean | null;
    magnetorheologicalSuspension: boolean | null;
    rearWheelSteering: boolean | null;
    trackPack: boolean | null;
    limitedEdition: boolean | null;
    seats: string | null;
    warrantyExpiry: string | null;
    dealerLocation: string | null;
    thumbnailUrl: string | null;
    dataConfidence: string | null;
    imagesJson: string[] | null;
    scoresJson: Record<string, number> | null;
    keyStrengths: string[] | null;
    keyWeaknesses: string[] | null;
  } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
const fmtK = (n: number) => `£${(n / 1000).toFixed(0)}k`;

const VERDICT_LABEL: Record<string, string> = {
  "strong-buy": "STRONG BUY",
  "buy": "BUY",
  "consider": "CONSIDER",
  "avoid": "AVOID",
};
const VERDICT_CLASS: Record<string, string> = {
  "strong-buy": "text-emerald-600 bg-emerald-50 border-emerald-200",
  "buy": "text-blue-600 bg-blue-50 border-blue-200",
  "consider": "text-amber-600 bg-amber-50 border-amber-200",
  "avoid": "text-red-600 bg-red-50 border-red-200",
};
const GPF_BADGE: Record<string, { label: string; cls: string }> = {
  none: { label: "PRE-GPF", cls: "text-emerald-700 bg-emerald-50" },
  fitted: { label: "GPF FITTED", cls: "text-red-700 bg-red-50" },
  borderline: { label: "BORDERLINE", cls: "text-amber-700 bg-amber-50" },
};

function CheckItem({ pass, label }: { pass: boolean | "borderline" | null; label: string }) {
  const cls = pass === true ? "text-emerald-600" : pass === "borderline" ? "text-amber-600" : "text-red-500";
  const icon = pass === true ? "✓" : pass === "borderline" ? "~" : "✗";
  return (
    <div className={`flex items-center gap-2 text-sm ${cls}`}>
      <span className="font-mono font-bold w-4 text-center shrink-0">{icon}</span>
      <span className="text-foreground/80">{label}</span>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "rankings", label: "Rankings" },
  { id: "methodology", label: "Methodology" },
  { id: "guide", label: "Buyer's Guide" },
  { id: "predictions", label: "Predictions" },
  { id: "sentiment", label: "Sentiment" },
  { id: "verdict", label: "Verdict" },
];

function ReportNav({ modelLabel }: { modelLabel: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(docH > 0 ? Math.min(100, (window.scrollY / docH) * 100) : 0);
      const sections = NAV_ITEMS.map(i => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
      let current = "overview";
      for (const el of sections) {
        if (window.scrollY >= el.offsetTop - 120) current = el.id;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeLabel = NAV_ITEMS.find(i => i.id === activeSection)?.label ?? "Overview";

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="absolute bottom-0 left-0 h-[2px] bg-primary transition-all duration-100" style={{ width: `${scrollPct}%` }} />
      <div className="container">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-1 h-6 bg-primary shrink-0" />
              <span className="font-serif font-bold text-sm tracking-wide text-foreground truncate">
                SupercarIQ
              </span>
            </Link>
            <span className="text-muted-foreground/50 mx-1 hidden sm:block">/</span>
            <span className="text-sm text-muted-foreground hidden sm:block truncate">{modelLabel}</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`px-2.5 py-1.5 text-xs font-medium tracking-wide transition-colors ${
                  activeSection === item.id
                    ? "text-primary border-b border-primary"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-xs text-primary font-medium">{activeLabel}</span>
            <button
              className="p-2 text-muted-foreground hover:text-foreground"
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
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-border pb-3 bg-background">
            {NAV_ITEMS.map((item, idx) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-2 py-2.5 text-sm transition-colors ${
                  activeSection === item.id ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-mono text-[10px] text-muted-foreground/50 w-5">{String(idx).padStart(2, "0")}</span>
                {item.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function ReportHero({
  modelConfig,
  topListing,
  stats,
}: {
  modelConfig: { make: string; model: string; heroImageUrl: string | null; investmentVerdict: string | null; engineSpec: string | null; yearMin: number; yearMax: number };
  topListing: Listing | null;
  stats: { activeCount: number; minPrice: number | null; maxPrice: number | null; bestIivGap: number | null } | null;
}) {
  const modelLabel = `${modelConfig.make} ${modelConfig.model}`;
  const verdict = topListing?.details?.investmentVerdict ?? modelConfig.investmentVerdict ?? "consider";
  const iiv = topListing?.details?.iiv;
  const priceVariance = topListing?.details?.priceVariance;
  const heroImg = modelConfig.heroImageUrl ?? "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1600";

  return (
    <section id="overview" className="relative min-h-[85vh] flex items-end overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImg})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />

      <div className="relative container pb-10 pt-28 md:pb-16">
        <div className="max-w-3xl">
          <div className="text-xs text-primary tracking-widest uppercase mb-3 font-medium">
            Full UK Market · {stats?.activeCount ?? "—"} Active Listings · Live Data
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-black text-foreground leading-tight mb-4 md:mb-6">
            {modelConfig.make}<br />
            <span className="text-primary italic">{modelConfig.model}</span>
          </h1>
          <p className="text-base md:text-lg text-foreground/70 max-w-xl mb-6 md:mb-8 font-light">
            A rigorous analysis of every {modelLabel} for sale in the UK.
            We build the case from first principles — then reveal the answer.
          </p>

          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-6">
            {[
              { label: "Active Listings", value: String(stats?.activeCount ?? "—") },
              {
                label: "Price Range",
                value: stats?.minPrice && stats?.maxPrice
                  ? `${fmtK(stats.minPrice)}–${fmtK(stats.maxPrice)}`
                  : "—",
              },
              {
                label: "Best Value Gap",
                value: stats?.bestIivGap
                  ? (stats.bestIivGap > 0 ? `+${fmtK(stats.bestIivGap)}` : fmtK(stats.bestIivGap))
                  : "—",
              },
              {
                label: "Market Verdict",
                value: VERDICT_LABEL[verdict] ?? verdict.toUpperCase(),
              },
            ].map(stat => (
              <div key={stat.label} className="bg-card px-3 py-3 md:px-4">
                <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</div>
                <div className="font-serif text-lg md:text-xl font-bold text-primary">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-2">
            <a href="#verdict" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Skip to The Verdict
              <ChevronDown className="w-4 h-4" />
            </a>
            <a href="#rankings" className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground text-sm font-medium hover:border-primary/50 transition-colors">
              View Rankings
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).then(() => {
                  toast.success("Link copied", { description: "Share this analysis with co-buyers or advisors." });
                }).catch(() => toast.error("Could not copy link"));
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground text-sm font-medium hover:border-primary/50 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Rankings Table ───────────────────────────────────────────────────────────

function RankingsSection({ listings, modelKey }: { listings: Listing[]; modelKey: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { user } = useAuth();

  const sorted = [...listings].sort((a, b) => (b.details?.totalScore ?? 0) - (a.details?.totalScore ?? 0));

  // Price chart data
  const chartData = sorted.map((car, i) => ({
    rank: i + 1,
    asking: car.askingPrice,
    iiv: car.details?.iiv ?? car.askingPrice,
    label: `#${i + 1} ${car.colour ?? ""}`,
  }));

  return (
    <section id="rankings" className="py-14 md:py-20 border-t border-border">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="font-serif text-3xl md:text-6xl font-black text-foreground/10 select-none shrink-0">02</div>
          <div>
            <div className="text-xs text-primary tracking-widest uppercase mb-2 font-medium">Step 02 — Market Rankings</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3">
              Every Car, Ranked by Investment Value
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              {sorted.length} active listings ranked by total investment score. Each car's IIV (Intrinsic Investment Value) is shown against its asking price — the gap is your margin of safety.
            </p>
          </div>
        </div>

        {/* IIV vs Price chart */}
        {chartData.length > 0 && (
          <div className="bg-card border border-border p-4 md:p-6 mb-8">
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4">IIV vs Asking Price — All Active Listings</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="rank" tick={{ fontSize: 11 }} tickFormatter={v => `#${v}`} />
                <YAxis tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [fmt(value), name === "asking" ? "Asking Price" : "IIV"]}
                  labelFormatter={label => `Rank #${label}`}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="iiv" fill="hsl(var(--primary))" opacity={0.25} name="IIV" radius={[2, 2, 0, 0]} />
                <Bar dataKey="asking" fill="hsl(var(--primary))" name="Asking" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Rankings list */}
        <div className="space-y-2">
          {sorted.map((car, i) => {
            const d = car.details;
            const verdict = d?.investmentVerdict ?? "consider";
            const verdictCls = VERDICT_CLASS[verdict] ?? VERDICT_CLASS["consider"];
            const iivGap = d?.priceVariance;
            const isExpanded = expanded === car.id;
            const gpf = d?.gpfStatus ? GPF_BADGE[d.gpfStatus] : null;

            return (
              <div
                key={car.id}
                className={`border border-border bg-card transition-all ${isExpanded ? "border-primary/30" : "hover:border-border/80"}`}
              >
                {/* Summary row */}
                <button
                  className="w-full text-left px-4 py-4 md:px-6"
                  onClick={() => setExpanded(isExpanded ? null : car.id)}
                >
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* Rank */}
                    <div className="shrink-0 w-8 text-center">
                      <div className="font-serif text-xl font-black text-foreground/20">#{i + 1}</div>
                    </div>
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">
                          {car.year} · {car.colour ?? "Unknown colour"}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 border rounded ${verdictCls}`}>
                          {VERDICT_LABEL[verdict] ?? verdict.toUpperCase()}
                        </span>
                        {gpf && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${gpf.cls}`}>{gpf.label}</span>
                        )}
                        {d?.atelierCar && <span className="text-[10px] font-medium px-2 py-0.5 bg-purple-50 text-purple-700 rounded">ATELIER</span>}
                        {d?.carbonPack && <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded">CARBON</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{car.mileage ? `${car.mileage.toLocaleString("en-GB")} mi` : "—"}</span>
                        {d?.ownerCount != null && <span>{d.ownerCount} owner{d.ownerCount !== 1 ? "s" : ""}</span>}
                        {d?.serviceHistory && <span>{d.serviceHistory} SH</span>}
                        {d?.dealer && <span className="truncate max-w-[200px]">{d.dealer}</span>}
                      </div>
                    </div>
                    {/* Price + score */}
                    <div className="shrink-0 text-right">
                      <div className="font-serif text-lg font-bold text-foreground">{fmt(car.askingPrice)}</div>
                      {iivGap != null && (
                        <div className={`text-xs font-medium ${iivGap > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {iivGap > 0 ? "+" : ""}{fmt(iivGap)} vs IIV
                        </div>
                      )}
                      {d?.totalScore != null && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">{d.totalScore.toFixed(1)}/100</div>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 md:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Checks */}
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Key Checks</div>
                        <div className="space-y-1.5">
                          <CheckItem pass={d?.gpfStatus === "none"} label="Pre-GPF engine" />
                          <CheckItem pass={!d?.accidentHistory} label="No accident history" />
                          <CheckItem pass={d?.serviceHistory === "full"} label="Full service history" />
                          <CheckItem pass={(d?.ownerCount ?? 99) <= 2} label="≤2 previous owners" />
                          <CheckItem pass={d?.carbonPack ?? false} label="Carbon pack fitted" />
                          <CheckItem pass={d?.ccb ?? false} label="Carbon ceramic brakes" />
                          {d?.atelierCar && <CheckItem pass={true} label="Atelier bespoke spec" />}
                        </div>
                      </div>

                      {/* Score breakdown */}
                      {d?.scoresJson && (
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Score Breakdown</div>
                          <div className="space-y-2">
                            {Object.entries(d.scoresJson).slice(0, 6).map(([key, val]) => (
                              <div key={key} className="flex items-center gap-2">
                                <div className="text-xs text-muted-foreground w-28 shrink-0 capitalize">
                                  {key.replace(/_/g, " ")}
                                </div>
                                <div className="flex-1 bg-muted rounded-full h-1.5">
                                  <div
                                    className="bg-primary h-1.5 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.max(0, (val / 10) * 100))}%` }}
                                  />
                                </div>
                                <div className="text-xs font-medium w-8 text-right">{val.toFixed(1)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Strengths / weaknesses */}
                      <div>
                        {d?.keyStrengths && d.keyStrengths.length > 0 && (
                          <div className="mb-4">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Strengths</div>
                            <ul className="space-y-1">
                              {d.keyStrengths.slice(0, 3).map((s, i) => (
                                <li key={i} className="text-xs text-emerald-700 flex gap-1.5"><span>✓</span>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {d?.keyWeaknesses && d.keyWeaknesses.length > 0 && (
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Watch Points</div>
                            <ul className="space-y-1">
                              {d.keyWeaknesses.slice(0, 3).map((w, i) => (
                                <li key={i} className="text-xs text-amber-700 flex gap-1.5"><span>!</span>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* View full detail link */}
                        <div className="mt-4">
                          <a
                            href={car.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                          >
                            View listing <ArrowRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Methodology ──────────────────────────────────────────────────────────────

function MethodologySection({
  modelConfig,
  content,
}: {
  modelConfig: { iivWeightsJson: Record<string, number> | null };
  content: { scoringMethodologyNarrative: string | null; valueDriversJson: string[] | null; valueDetractorsJson: string[] | null } | null;
}) {
  const weights = modelConfig.iivWeightsJson ?? {};
  const weightData = Object.entries(weights)
    .map(([key, value]) => ({ name: key.replace(/_/g, " "), weight: Math.round(value * 100) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);

  return (
    <section id="methodology" className="py-14 md:py-20 border-t border-border bg-muted/30">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="font-serif text-3xl md:text-6xl font-black text-foreground/10 select-none shrink-0">01</div>
          <div>
            <div className="text-xs text-primary tracking-widest uppercase mb-2 font-medium">Step 01 — How We Score Every Car</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3">
              The Scoring Framework
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              {content?.scoringMethodologyNarrative ?? "Each car is scored across multiple dimensions — powertrain, provenance, specification, mechanical upgrades, exclusivity, condition, and market value — to produce a single investment score."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weight chart */}
          {weightData.length > 0 && (
            <div className="bg-card border border-border p-4 md:p-6">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4">IIV Weight Distribution</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weightData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                  <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Weight"]} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="weight" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Value drivers / detractors */}
          <div className="space-y-6">
            {content?.valueDriversJson && content.valueDriversJson.length > 0 && (
              <div className="bg-card border border-border p-4 md:p-6">
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Value Drivers</div>
                <ul className="space-y-2">
                  {content.valueDriversJson.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-emerald-600 font-bold shrink-0">+</span>
                      <span className="text-foreground/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {content?.valueDetractorsJson && content.valueDetractorsJson.length > 0 && (
              <div className="bg-card border border-border p-4 md:p-6">
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Value Detractors</div>
                <ul className="space-y-2">
                  {content.valueDetractorsJson.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-red-500 font-bold shrink-0">−</span>
                      <span className="text-foreground/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Buyer's Guide ────────────────────────────────────────────────────────────

function BuyersGuideSection({ content }: {
  content: {
    buyersGuideTop5Json: string[] | null;
    buyersGuideRedFlagsJson: string[] | null;
    bestSpec: string | null;
    worstSpec: string | null;
  } | null;
}) {
  if (!content) return null;

  return (
    <section id="guide" className="py-14 md:py-20 border-t border-border">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="font-serif text-3xl md:text-6xl font-black text-foreground/10 select-none shrink-0">03</div>
          <div>
            <div className="text-xs text-primary tracking-widest uppercase mb-2 font-medium">Step 03 — Buyer's Guide</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3">
              What to Check Before You Buy
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.buyersGuideTop5Json && content.buyersGuideTop5Json.length > 0 && (
            <div className="bg-card border border-border p-4 md:p-6">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Top 5 Checks</div>
              <ol className="space-y-3">
                {content.buyersGuideTop5Json.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="font-serif font-bold text-primary shrink-0 w-5">{i + 1}.</span>
                    <span className="text-foreground/80">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {content.buyersGuideRedFlagsJson && content.buyersGuideRedFlagsJson.length > 0 && (
            <div className="bg-card border border-red-200 p-4 md:p-6">
              <div className="text-xs text-red-600 uppercase tracking-widest mb-4 font-medium">Red Flags — Walk Away</div>
              <ul className="space-y-3">
                {content.buyersGuideRedFlagsJson.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="text-red-500 font-bold shrink-0">✗</span>
                    <span className="text-foreground/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {content.bestSpec && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 md:p-6">
              <div className="text-xs text-emerald-700 uppercase tracking-widest mb-2 font-medium">Ideal Specification</div>
              <p className="text-sm text-foreground/80">{content.bestSpec}</p>
            </div>
          )}

          {content.worstSpec && (
            <div className="bg-red-50 border border-red-200 p-4 md:p-6">
              <div className="text-xs text-red-700 uppercase tracking-widest mb-2 font-medium">Avoid This Specification</div>
              <p className="text-sm text-foreground/80">{content.worstSpec}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Predictions ──────────────────────────────────────────────────────────────

function PredictionsSection({ content }: {
  content: {
    pricePrediction1yr: string | null;
    pricePrediction3yr: string | null;
    pricePrediction5yr: string | null;
    pricePredictionNarrative: string | null;
    pricePredictionConfidence: string | null;
    keyRisksJson: string[] | null;
  } | null;
}) {
  if (!content) return null;

  const confidence = content.pricePredictionConfidence ?? "medium";
  const confColor = confidence === "high" ? "text-emerald-600" : confidence === "low" ? "text-red-500" : "text-amber-600";

  return (
    <section id="predictions" className="py-14 md:py-20 border-t border-border bg-muted/30">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="font-serif text-3xl md:text-6xl font-black text-foreground/10 select-none shrink-0">04</div>
          <div>
            <div className="text-xs text-primary tracking-widest uppercase mb-2 font-medium">Step 04 — Price Predictions</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3">
              Where Prices Are Heading
            </h2>
            <p className={`text-xs font-medium uppercase tracking-widest ${confColor}`}>
              Confidence: {confidence}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "1-Year Outlook", value: content.pricePrediction1yr },
            { label: "3-Year Outlook", value: content.pricePrediction3yr },
            { label: "5-Year Outlook", value: content.pricePrediction5yr },
          ].filter(p => p.value).map(p => (
            <div key={p.label} className="bg-card border border-border p-4 md:p-6">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{p.label}</div>
              <p className="text-sm text-foreground font-medium">{p.value}</p>
            </div>
          ))}
        </div>

        {content.pricePredictionNarrative && (
          <div className="bg-card border border-border p-4 md:p-6 mb-6">
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Full Analysis</div>
            <p className="text-sm text-foreground/80 leading-relaxed">{content.pricePredictionNarrative}</p>
          </div>
        )}

        {content.keyRisksJson && content.keyRisksJson.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 md:p-6">
            <div className="text-xs text-amber-700 uppercase tracking-widest mb-3 font-medium">Key Risks</div>
            <ul className="space-y-2">
              {content.keyRisksJson.map((risk, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-amber-600 font-bold shrink-0">!</span>
                  <span className="text-foreground/80">{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Sentiment ────────────────────────────────────────────────────────────────

function SentimentSection({ sentiment }: {
  sentiment: Array<{
    id: number;
    influencerName: string;
    platform: string;
    followers: string | null;
    sentiment: string;
    sentimentScore: number | null;
    summary: string | null;
    keyThemesJson: unknown;
    sourceUrl: string | null;
  }>;
}) {
  if (!sentiment || sentiment.length === 0) return null;

  const sentimentColor = (s: string) =>
    s === "positive" ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : s === "negative" ? "text-red-600 bg-red-50 border-red-200"
    : "text-amber-600 bg-amber-50 border-amber-200";

  const avgScore = sentiment.reduce((acc, s) => acc + (s.sentimentScore ?? 0), 0) / sentiment.length;

  return (
    <section id="sentiment" className="py-14 md:py-20 border-t border-border">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="font-serif text-3xl md:text-6xl font-black text-foreground/10 select-none shrink-0">05</div>
          <div>
            <div className="text-xs text-primary tracking-widest uppercase mb-2 font-medium">Step 05 — Influencer Pulse</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3">
              What the Community Is Saying
            </h2>
            <p className="text-muted-foreground">
              Aggregated sentiment from {sentiment.length} content creators and community voices.
              Overall sentiment score: <span className={avgScore > 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                {avgScore > 0 ? "+" : ""}{(avgScore * 100).toFixed(0)}%
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sentiment.map(s => {
            const themes = Array.isArray(s.keyThemesJson) ? s.keyThemesJson as string[] : [];
            return (
              <div key={s.id} className="bg-card border border-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-sm text-foreground">{s.influencerName}</div>
                    <div className="text-xs text-muted-foreground">{s.platform}{s.followers ? ` · ${s.followers}` : ""}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 border rounded uppercase ${sentimentColor(s.sentiment)}`}>
                    {s.sentiment}
                  </span>
                </div>
                {s.summary && <p className="text-xs text-foreground/70 mb-3 leading-relaxed">{s.summary}</p>}
                {themes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {themes.slice(0, 3).map((t, i) => (
                      <span key={i} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                )}
                {s.sourceUrl && (
                  <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline mt-2 block">
                    View source →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

function VerdictSection({
  modelConfig,
  content,
  topListing,
  stats,
}: {
  modelConfig: { make: string; model: string; investmentVerdict: string | null };
  content: {
    investmentVerdict: string;
    investmentHeadline: string | null;
    investmentReasoning: string | null;
  } | null;
  topListing: Listing | null;
  stats: { activeCount: number; bestIivGap: number | null } | null;
}) {
  const verdict = content?.investmentVerdict ?? modelConfig.investmentVerdict ?? "consider";
  const verdictCls = VERDICT_CLASS[verdict] ?? VERDICT_CLASS["consider"];
  const modelLabel = `${modelConfig.make} ${modelConfig.model}`;

  return (
    <section id="verdict" className="py-14 md:py-20 border-t border-border bg-foreground text-background">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs tracking-widest uppercase mb-4 text-background/50 font-medium">The Verdict</div>
          <div className={`inline-block text-2xl md:text-3xl font-black px-6 py-3 border-2 rounded mb-6 ${verdictCls}`}>
            {VERDICT_LABEL[verdict] ?? verdict.toUpperCase()}
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-background mb-4">
            {content?.investmentHeadline ?? `The ${modelLabel} is a ${VERDICT_LABEL[verdict] ?? verdict} right now.`}
          </h2>
          {content?.investmentReasoning && (
            <p className="text-background/70 text-base md:text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
              {content.investmentReasoning}
            </p>
          )}

          {/* Key numbers */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-background/10 mb-8">
            {[
              { label: "Active Listings", value: String(stats?.activeCount ?? "—") },
              {
                label: "Best Value Gap",
                value: stats?.bestIivGap
                  ? (stats.bestIivGap > 0 ? `+${fmtK(stats.bestIivGap)}` : fmtK(stats.bestIivGap))
                  : "—",
              },
              {
                label: "Top Car Score",
                value: topListing?.details?.totalScore != null
                  ? `${topListing.details.totalScore.toFixed(1)}/100`
                  : "—",
              },
            ].map(stat => (
              <div key={stat.label} className="bg-background/5 px-4 py-4">
                <div className="text-[10px] text-background/50 uppercase tracking-widest mb-1">{stat.label}</div>
                <div className="font-serif text-xl font-bold text-background">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <a href="#rankings" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors rounded">
              View Full Rankings
            </a>
            <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-background/10 text-background text-sm font-medium hover:bg-background/20 transition-colors rounded border border-background/20">
              All Models
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 bg-card border-b border-border" />
      <div className="relative min-h-[60vh] bg-muted animate-pulse" />
      <div className="container py-14 space-y-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface ReportPageProps {
  modelKey: string;
}

export default function ReportPage({ modelKey }: ReportPageProps) {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Fetch all data in parallel
  const modelConfigQuery = trpc.models.get.useQuery({ modelKey });
  const listingsQuery = trpc.listings.byModel.useQuery({ modelKey });
  const statsQuery = trpc.market.summary.useQuery({ modelKey });
  const contentQuery = trpc.modelContent.get.useQuery({ modelKey });
  const sentimentQuery = trpc.sentiment.getByModel.useQuery({ modelKey });
  const topPickQuery = trpc.listings.topPick.useQuery({ modelKey });

  const isLoading =
    modelConfigQuery.isLoading ||
    listingsQuery.isLoading ||
    statsQuery.isLoading;

  const modelConfig = modelConfigQuery.data;
  const listings = (listingsQuery.data ?? []) as Listing[];
  const stats = statsQuery.data;
  const content = contentQuery.data ?? null;
  const sentiment = sentimentQuery.data ?? [];
  const topListing = (topPickQuery.data ?? null) as Listing | null;

  // Gating: if model is not public, require auth
  const isGated = modelConfig && !modelConfig.isPublic;
  const needsAuth = isGated && !isAuthenticated;

  if (isLoading) return <ReportSkeleton />;

  if (!modelConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="font-serif text-2xl font-bold text-foreground mb-2">Report Not Found</div>
          <p className="text-muted-foreground mb-4">This model report doesn't exist or hasn't been published yet.</p>
          <Link href="/" className="text-primary hover:underline text-sm">← Back to all models</Link>
        </div>
      </div>
    );
  }

  const modelLabel = `${modelConfig.make} ${modelConfig.model}`;

  // Auth gate for non-public models
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-background">
        <ReportNav modelLabel={modelLabel} />
        <div className="container py-20 max-w-lg mx-auto text-center">
          <div className="text-xs text-primary tracking-widest uppercase mb-4 font-medium">Members Only</div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            {modelLabel} Report
          </h1>
          <p className="text-muted-foreground mb-8">
            Create a free account to access this in-depth investment analysis, including full rankings, IIV scores, buyer's guide, and price predictions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate(getLoginUrl(`/${modelKey}`))} className="px-6">
              Create Free Account
            </Button>
            <Button variant="outline" onClick={() => navigate(getLoginUrl(`/${modelKey}`))} className="px-6">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ReportNav modelLabel={modelLabel} />
      <ReportHero
        modelConfig={modelConfig as any}
        topListing={topListing}
        stats={stats as any}
      />
      <MethodologySection
        modelConfig={modelConfig as any}
        content={content as any}
      />
      <RankingsSection listings={listings} modelKey={modelKey} />
      <BuyersGuideSection content={content as any} />
      <PredictionsSection content={content as any} />
      <SentimentSection sentiment={sentiment as any} />
      <VerdictSection
        modelConfig={modelConfig as any}
        content={content as any}
        topListing={topListing}
        stats={stats as any}
      />
    </div>
  );
}

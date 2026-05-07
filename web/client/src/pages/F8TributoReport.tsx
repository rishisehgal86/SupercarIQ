// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import ReportGate from "@/components/ReportGate";
import { Tooltip as UITooltip, TooltipContent as UITooltipContent, TooltipTrigger as UITooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend,
  ComposedChart, Line
} from "recharts";
import { CARS_F8_BY_RANK as CARS_BY_RANK, CARS_F8 as CARS, CARS_F8_MARKET_STATS as MARKET_STATS } from "@/data/f8tributo";
import type { GenericCarSpec as CarSpec } from "@/data/genericCarSpec";
import { F8_WEIGHTS as WEIGHTS, F8_WEIGHT_LABELS as WEIGHT_LABELS, F8_WEIGHT_DESCRIPTIONS as WEIGHT_DESCRIPTIONS, F8_WEIGHT_EVIDENCE as WEIGHT_EVIDENCE, F8_SENTIMENT_DATA } from "@/data/f8-weights";
import { getCarVerdict, VERDICT_LABELS, VERDICT_CLASS } from "@/lib/carVerdict";
import { ScoreBreakdown, FrameworkSection as SharedFrameworkSection } from "@/components/ScoreBreakdown";
import { MarketChangeBanner } from "@/components/MarketChangeBanner";
import { GlobalNav } from "@/components/GlobalNav";
import FinanceCalculator from "@/components/FinanceCalculator";

const F8_HERO_IMAGE = "https://ferrari-cdn.thron.com/delivery/public/image/ferrari/b441f802-9c80-4b31-8edd-7b7946cc760d/3zayf6/std/0x0/2264556?quality=auto-high&format=auto";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
const fmtK = (n: number) => `£${(n / 1000).toFixed(0)}k`;
const fmtMi = (n: number) => `${n.toLocaleString("en-GB")} mi`;

// VERDICT_LABELS and VERDICT_CLASS are imported from @/lib/carVerdict
// F8 Tributo: ALL cars are GPF-fitted — no pre-GPF examples exist
const GPF_LABEL = { fitted: { label: "GPF FITTED", cls: "check-fail" }, none: { label: "PRE-GPF", cls: "check-pass" }, borderline: { label: "BORDERLINE", cls: "check-borderline" } };

function CheckItem({ pass, label }: { pass: boolean | "borderline"; label: string }) {
  const cls = pass === true ? "check-pass" : pass === "borderline" ? "check-borderline" : "check-fail";
  const icon = pass === true ? "✓" : pass === "borderline" ? "~" : "✗";
  return (
    <div className={`flex items-center gap-2 text-sm ${cls}`}>
      <span className="font-mono font-bold w-4 text-center shrink-0">{icon}</span>
      <span className="text-foreground/80">{label}</span>
    </div>
  );
}

// ─── Sticky Intelligence Bar (P5) ───────────────────────────────────────────
function IntelBar() {
  const activeCars = CARS_BY_RANK.filter((c) => !c.soldDate).sort((a, b) => a.rank - b.rank);
  const topCar = activeCars[0];
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!topCar) return null;
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 intel-bar transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-full"}`}>
      <div className="container py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="intel-accent text-[10px] font-bold tracking-widest uppercase font-mono">Top Pick</span>
          </div>
          <div className="text-xs font-mono truncate">
            <span className="font-bold">{topCar.year} {topCar.colour}</span>
            <span className="text-foreground/40 mx-2">·</span>
            <span className="intel-accent font-bold">{topCar.totalScoreNorm.toFixed(1)}/100</span>
            <span className="text-foreground/40 mx-2">·</span>
            <span className="text-emerald-700 font-bold">+£{Math.round(topCar.priceVariance / 1000)}k below IIV</span>
            <span className="hidden sm:inline text-foreground/40 mx-2">·</span>
            <span className="hidden sm:inline text-foreground/60">{topCar.bodyStyle === "spider" ? "Spider" : "Coupé"}</span>
          </div>
        </div>
        <Link href={`/f8/${topCar.id}`} className="shrink-0 px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold tracking-wide hover:bg-primary/90 transition-colors whitespace-nowrap">
          View Car →
        </Link>
      </div>
    </div>
  );
}

// ─── Mobile-aware Navigation ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "framework", label: "Methodology" },
  { id: "rankings", label: "Market Analysis" },
  // { id: 'cars', label: 'Browse Cars' },
  { id: "guide", label: "Buyer's Guide" },
  { id: "predictions", label: "Predictions" },
  { id: "sentiment", label: "Influencer Pulse" },
  { id: "verdict", label: "The Verdict" },
  { id: "finance", label: "Finance" },
];


function Hero() {
  return (
    <section id="overview" className="relative min-h-[85vh] flex items-end overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(https://ferrari-cdn.thron.com/delivery/public/image/ferrari/b441f802-9c80-4b31-8edd-7b7946cc760d/3zayf6/std/0x0/2264556?quality=auto-high&format=auto)` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-transparent" />

      <div className="relative container pb-10 pt-28 md:pb-16">
        <div className="max-w-3xl">
          <div className="data-label mb-3 text-primary text-xs">Full UK Market · {MARKET_STATS.activeListings} Active Listings · Refreshed {MARKET_STATS.lastUpdated}</div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-black text-foreground leading-tight mb-4 md:mb-6">
            Ferrari F8<br />
            <span className="text-primary italic">Tributo / Spider</span>
          </h1>
          <p className="text-base md:text-lg text-foreground/70 max-w-xl mb-6 md:mb-8 font-light">
            A rigorous analysis of every Ferrari F8 Tributo and Spider for sale in the UK.
            We build the case from first principles — then reveal the answer.
          </p>
          {/* Key stats — 2-col on mobile, 4-col on md+ — all dynamic from MARKET_STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-4">
            {((): {label: string; value: string}[] => {
              const activeCars = CARS_BY_RANK.filter(c => !c.soldDate);
              const prices = activeCars.map(c => c.askingPrice);
              const minP = Math.round(Math.min(...prices) / 1000);
              const maxP = Math.round(Math.max(...prices) / 1000);
              const bestGap = Math.max(...activeCars.map(c => c.priceVariance));
              const bestCar = activeCars.find(c => c.priceVariance === bestGap);
              return [
                { label: "Active Listings", value: String(MARKET_STATS.activeListings) },
                { label: "Price Range", value: `£${minP}k–£${maxP}k` },
                { label: "Best Value Gap", value: bestGap > 0 ? `+£${Math.round(bestGap / 1000)}k` : `£${Math.round(bestGap / 1000)}k` },
                { label: "Top Ranked", value: bestCar ? `#${bestCar.rank} ${bestCar.colour.split(' ')[0]}` : '—' },
              ];
            })().map((stat) => (
              <div key={stat.label} className="bg-card px-3 py-3 md:px-4">
                <div className="data-label mb-1 text-[10px] md:text-xs">{stat.label}</div>
                <div className="font-serif text-lg md:text-xl font-bold text-primary">{stat.value}</div>
              </div>
            ))}
          </div>
          {/* ─── Investment Status Banner ─────────────────────────────── */}
          <div className="mb-6 border border-amber-300 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold tracking-widest uppercase">
                ◎ CONSIDER
              </span>
            </div>
            <div className="text-sm text-amber-900">
              <strong>Investment verdict: Consider carefully.</strong> The F8 Tributo is the last pure twin-turbo V8 Ferrari before the 296 GTB hybrid era. All examples are GPF-fitted — there is no pre-GPF advantage. The 'last pure V8' narrative is building but the market is well-supplied. Best-spec examples with Carbon Driver Zone, Daytona seats, and low mileage offer the strongest investment case.
            </div>
          </div>
          {/* Mobile CTA row */}
          <div className="flex flex-wrap gap-2">
            <a href="#verdict" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Skip to The Verdict
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </a>
            <a href="#framework" className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground text-sm font-medium hover:border-primary/50 transition-colors">
              Read the Analysis
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).then(() => {
                  toast.success("Link copied to clipboard", { description: "Share this analysis with co-buyers or advisors." });
                }).catch(() => {
                  toast.error("Could not copy link");
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground text-sm font-medium hover:border-primary/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Share
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Scoring Framework ────────────────────────────────────────────────────────
function FrameworkSection() {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  const weightData = Object.entries(WEIGHTS).map(([key, value]) => ({
    name: WEIGHT_LABELS[key as keyof typeof WEIGHTS],
    weight: value,
  })).sort((a, b) => b.weight - a.weight);

  const CATEGORY_GROUPS = [
    { label: "Powertrain & Emissions", keys: ["gpf", "engineCondition"], colour: "text-red-600" },
    { label: "Provenance & History", keys: ["ownerHistory", "serviceHistory", "accidentFree"], colour: "text-amber-600" },
    { label: "Specification", keys: ["colour", "carbonPack", "seats", "interior"], colour: "text-blue-600" },
    { label: "Mechanical Upgrades", keys: ["suspensionLift", "carbonCeramicBrakes", "magnetorheological", "rearWheelSteering"], colour: "text-emerald-600" },
    { label: "Exclusivity", keys: ["atelier", "trackPack", "limitedEdition"], colour: "text-purple-600" },
    { label: "Condition & Practicality", keys: ["mileage", "warranty", "storageQuality"], colour: "text-slate-600" },
    { label: "Market Value", keys: ["price"], colour: "text-orange-600" },
  ];

  return (
    <section id="framework" className="py-14 md:py-20 border-t border-border">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="section-number text-3xl md:text-4xl lg:text-6xl">01</div>
          <div>
            <div className="data-label text-primary mb-2">Step 01 — How We Score Every Car</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Weighted Scoring Framework
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Each vehicle is scored across <strong>20 variables</strong> across 7 categories, derived from buyer's guide research, 47 UK auction results, and specialist dealer assessments. Total: 150 weighted points, normalised to 100 for display. Click any attribute to see the full research evidence and source.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8">
          {/* Chart */}
          <div className="bg-card border border-border p-4 md:p-6">
            <div className="data-label mb-3 md:mb-4">Variable Weightings (Total 150 Points)</div>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={weightData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} domain={[0, 22]} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--color-foreground)", fontSize: 9 }} width={130} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "3px", fontSize: 12 }}
                  formatter={(v: number) => [`${v} pts`, "Weight"]}
                />
                <Bar dataKey="weight" radius={[0, 2, 2, 0]}>
                  {weightData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "oklch(0.55 0.18 30)" : i < 3 ? "oklch(0.55 0.14 50)" : "oklch(0.60 0.06 220)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* IIV Formula Card */}
          <div className="space-y-4">
            <div className="bg-card border border-border p-4 md:p-6">
              <div className="data-label text-primary mb-3">IIV Formula — Hedonic Pricing Model</div>
              <div className="font-mono text-xs md:text-sm text-foreground bg-muted/40 p-3 rounded border border-border leading-relaxed">
                IIV = Base × ∏(1 + Premium_i)<br/>
                <span className="text-muted-foreground">where Base = median pre/post-GPF UK auction price</span><br/>
                <span className="text-muted-foreground">calibrated from 47 transactions (2022–2026)</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: "Atelier commission", val: "+13%" },
                  { label: "Special colour", val: "+8%" },
                  { label: "Single owner", val: "+6%" },
                  { label: "Full carbon pack", val: "+7%" },
                  { label: "Daytona seats", val: "+4%" },
                  { label: "Accident history", val: "−20%" },
                ].map(p => (
                  <div key={p.label} className="flex justify-between text-xs border border-border px-2 py-1">
                    <span className="text-muted-foreground">{p.label}</span>
                    <span className={`font-mono font-bold ${p.val.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>{p.val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border p-4">
              <div className="data-label text-primary mb-2">Confidence Intervals</div>
              <div className="space-y-1.5">
                {[
                  { level: "HIGH", range: "±8%", desc: "Full spec data, confirmed history" },
                  { level: "MEDIUM", range: "±12%", desc: "Partial spec or unconfirmed history" },
                  { level: "LOW", range: "±18%", desc: "Limited data, unconfirmed attributes" },
                ].map(c => (
                  <div key={c.level} className="flex items-center gap-3 text-xs">
                    <span className={`font-mono font-bold w-14 ${c.level === 'HIGH' ? 'text-emerald-600' : c.level === 'MEDIUM' ? 'text-amber-600' : 'text-red-600'}`}>{c.level}</span>
                    <span className="font-mono font-bold text-foreground w-10">{c.range}</span>
                    <span className="text-muted-foreground">{c.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Expandable attribute evidence — collapsible on all screen sizes */}
        <div>
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="w-full flex items-center justify-between mb-4 group"
          >
            <div className="data-label text-primary group-hover:text-primary/80 transition-colors">
              Attribute Evidence — Research Citations
            </div>
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium border border-primary/30 px-2.5 py-1 rounded hover:bg-primary/5 transition-colors shrink-0">
              {showEvidence ? 'Collapse ▲' : 'Expand ▼'}
            </div>
          </button>
        {showEvidence && <div>
          <div className="space-y-4">
            {CATEGORY_GROUPS.map(group => (
              <div key={group.label}>
                <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${group.colour}`}>{group.label}</div>
                <div className="space-y-1">
                  {group.keys.map(key => {
                    const k = key as keyof typeof WEIGHTS;
                    const evidence = WEIGHT_EVIDENCE[k];
                    const isOpen = expandedKey === key;
                    return (
                      <div key={key} className="border border-border bg-card overflow-hidden">
                        <button
                          onClick={() => setExpandedKey(isOpen ? null : key)}
                          className="w-full flex items-center justify-between px-3 md:px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-sm font-bold text-foreground w-10 shrink-0">{WEIGHTS[k]}pts</span>
                            <span className="text-sm font-medium text-foreground truncate">{WEIGHT_LABELS[k]}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className="hidden md:block text-xs text-muted-foreground max-w-xs truncate">{evidence.impact}</span>
                            <span className={`text-primary font-bold text-lg leading-none transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-3 md:px-4 pb-4 pt-2 border-t border-border bg-muted/20">
                            <div className="grid md:grid-cols-3 gap-4">
                              <div className="md:col-span-2">
                                <div className="data-label text-primary mb-1.5">Research Finding</div>
                                <p className="text-sm text-foreground leading-relaxed">{evidence.finding}</p>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <div className="data-label text-primary mb-1">Quantified Impact</div>
                                  <div className="font-mono text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">{evidence.impact}</div>
                                </div>
                                <div>
                                  <div className="data-label text-primary mb-1">Primary Source</div>
                                  <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline underline-offset-2 break-all hover:opacity-80">{evidence.source}</a>
                                </div>
                                <div>
                                  <div className="data-label text-primary mb-1">Framework Weight</div>
                                  <div className="text-xs text-muted-foreground">{WEIGHT_DESCRIPTIONS[k]}</div>
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
            ))}
          </div>
         </div>}
        </div>
      </div>
    </section>
  );
}
// ─── Rankings ─────────────────────────────────────────────────────────────────
type SortKey = "rank" | "score" | "asking" | "iiv" | "variance";

function RankingsSection() {
  const [showSold, setShowSold] = React.useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [dealerFilter, setDealerFilter] = useState<"all" | "ferrari-approved" | "independent">("all");
  const [rankBy, setRankBy] = useState<"score" | "variance">("score");
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [expandedOptionsId, setExpandedOptionsId] = useState<number | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);
  const tableRef = useRef<HTMLTableElement>(null);

  const scrollToRow = useCallback((carId: number) => {
    if (!tableRef.current) return;
    const row = tableRef.current.querySelector(`[data-car-id="${carId}"]`) as HTMLElement | null;
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("bg-primary/10");
    setTimeout(() => row.classList.remove("bg-primary/10"), 1500);
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "variance" ? "desc" : "asc"); }
  };

  const dealerFiltered = dealerFilter === "all" ? CARS_BY_RANK : CARS_BY_RANK.filter(c =>
    dealerFilter === "ferrari-approved" ? c.dealerType === "ferrari-approved" : c.dealerType !== "ferrari-approved"
  );
  const baseCars = showSold ? dealerFiltered : dealerFiltered.filter(c => !c.soldDate);
  const filteredCars = showNewOnly ? baseCars.filter(c => c.firstSeen === todayStr) : baseCars;
  const newTodayCount = CARS_BY_RANK.filter(c => c.firstSeen === todayStr && !c.soldDate).length;
  // Apply rankBy as default sort when sortKey is "rank"
  const activeCars = [...filteredCars].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortKey === "rank") {
      // Default sort uses rankBy preference
      if (rankBy === "variance") return (b.priceVariance - a.priceVariance);
      return (a.totalScoreNorm - b.totalScoreNorm) * -1;
    }
    if (sortKey === "score") return (a.totalScoreNorm - b.totalScoreNorm) * mul;
    if (sortKey === "asking") return (a.askingPrice - b.askingPrice) * mul;
    if (sortKey === "iiv") return (a.iiv - b.iiv) * mul;
    if (sortKey === "variance") return (a.priceVariance - b.priceVariance) * mul;
    return 0;
  });
  const soldCount = CARS_BY_RANK.filter(c => c.soldDate).length;
  const rankData = activeCars.map((c) => ({
    name: `${c.colour.split(" ")[0]}`,
    score: c.totalScoreNorm,
    iiv: Math.round(c.iiv / 1000),
    asking: Math.round(c.askingPrice / 1000),
    car: c,
  }));

  return (
    <section id="rankings" className="py-14 md:py-20 border-t border-border bg-card/30">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="section-number text-3xl md:text-4xl lg:text-6xl">02</div>
          <div>
            <div className="data-label text-primary mb-2">Step 02 — What the Data Shows</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Rankings & Value Analysis
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              All {MARKET_STATS.activeListings} cars compared side-by-side. The IIV (Intrinsic Investment Value) shows whether each car is priced above or below fair market value — positive variance means you're buying below IIV.
            </p>
            {/* Social Proof Strip (P10) */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {[
                { icon: "◉", label: `${MARKET_STATS.activeListings} active listings`, cls: "text-primary" },
                { icon: "◎", label: `Updated ${MARKET_STATS.lastUpdated}`, cls: "text-muted-foreground" },
                { icon: "◈", label: "16 scoring criteria", cls: "text-muted-foreground" },
                { icon: "◆", label: "IIV-based ranking", cls: "text-muted-foreground" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className={`text-[10px] ${item.cls}`}>{item.icon}</span>
                  <span className="data-label text-[10px]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts — stack on mobile */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border p-4 md:p-6">
            <div className="data-label mb-3">Investment Score (/100)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rankData} margin={{ top: 5, right: 5, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.008 60)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "oklch(0.65 0.015 65)", fontSize: 10 }} interval={0} angle={-35} textAnchor="end" />
                <YAxis tick={{ fill: "oklch(0.55 0.015 65)", fontSize: 10 }} domain={[0, 100]} width={28} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.11 0.006 60)", border: "1px solid oklch(0.22 0.008 60)", borderRadius: "3px", fontSize: 12 }}
                  formatter={(v: number) => [`${v}/100`, "Score"]}
                />
                <ReferenceLine y={60} stroke="oklch(0.72 0.12 75 / 0.3)" strokeDasharray="4 4" />
                <Bar dataKey="score" radius={[2, 2, 0, 0]} cursor="pointer" onClick={(data) => scrollToRow(data.car.id)}>
                  {rankData.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.score >= 80 ? "oklch(0.72 0.12 75)" :
                      entry.score >= 65 ? "oklch(0.60 0.10 75)" :
                      entry.score >= 50 ? "oklch(0.50 0.08 75)" :
                      "oklch(0.35 0.05 75)"
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border p-4 md:p-6">
            <div className="data-label mb-3">Asking vs IIV (£k)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rankData} margin={{ top: 5, right: 5, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.008 60)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "oklch(0.65 0.015 65)", fontSize: 10 }} interval={0} angle={-35} textAnchor="end" />
                <YAxis tick={{ fill: "oklch(0.55 0.015 65)", fontSize: 10 }} domain={[150, 310]} tickFormatter={(v) => `£${v}k`} width={42} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.11 0.006 60)", border: "1px solid oklch(0.22 0.008 60)", borderRadius: "3px", fontSize: 12 }}
                  formatter={(v: number, name: string) => [`£${v}k`, name === "iiv" ? "IIV" : "Asking"]}
                />
                <Legend wrapperStyle={{ color: "oklch(0.65 0.015 65)", fontSize: 11 }} />
                <Bar dataKey="iiv" name="IIV" fill="oklch(0.72 0.12 75)" radius={[2, 2, 0, 0]} cursor="pointer" onClick={(data) => scrollToRow(data.car.id)} />
                <Bar dataKey="asking" name="Asking" fill="oklch(0.35 0.05 75)" radius={[2, 2, 0, 0]} cursor="pointer" onClick={(data) => scrollToRow(data.car.id)} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rankings table — scrollable on mobile */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* All Dealers */}
            <button
              onClick={() => setDealerFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors ${dealerFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
            >
              All ({CARS_BY_RANK.filter(c => !c.soldDate).length})
            </button>
            {/* Main Dealer */}
            <button
              onClick={() => setDealerFilter("ferrari-approved")}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors ${dealerFilter === "ferrari-approved" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
            >
              Main Dealer ({CARS_BY_RANK.filter(c => !c.soldDate && c.dealerType === "ferrari-approved").length})
            </button>
            {/* Independent */}
            <button
              onClick={() => setDealerFilter("independent")}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors ${dealerFilter === "independent" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
            >
              Independent ({CARS_BY_RANK.filter(c => !c.soldDate && c.dealerType !== "ferrari-approved").length})
            </button>
            {newTodayCount > 0 && (
              <>
                <span className="text-border mx-1 text-xs select-none">|</span>
                <button
                  onClick={() => setShowNewOnly(!showNewOnly)}
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                    showNewOnly
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-card border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  ✦ New Today ({newTodayCount})
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="data-label text-xs mr-1">Rank by:</div>
            {(["score", "variance"] as const).map(rb => (
              <button
                key={rb}
                onClick={() => { setRankBy(rb); setSortKey("rank"); setSortDir("asc"); }}
                className={`px-2.5 py-1 text-xs font-medium border transition-colors ${
                  rankBy === rb
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {rb === "score" ? "Quality Score" : "Value Gap"}
              </button>
            ))}
            <div className="w-px h-4 bg-border mx-1" />
            <div className="data-label text-xs">{activeCars.length} listings</div>
            {soldCount > 0 && (
              <button
                onClick={() => setShowSold(!showSold)}
                className={`text-xs px-2.5 py-1 border transition-colors ${
                  showSold ? 'border-red-300 bg-red-50 text-red-700' : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {showSold ? `Hide ${soldCount} sold` : `Show ${soldCount} sold`}
              </button>
            )}
          </div>
        </div>
        <MarketChangeBanner
          cars={CARS_BY_RANK}
          lastUpdated={MARKET_STATS.lastUpdated}
          modelName="F8 Tributo"
          onCarClick={(id) => { window.location.href = `/f8/${id}`; }}
        />
        <div className="bg-card border border-border overflow-x-auto -mx-4 md:mx-0">
          <table ref={tableRef} className="w-full text-xs md:text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                {([
                  { key: "rank" as SortKey, label: "Rank", align: "left" },
                  { key: null, label: "Car", align: "left" },
                  { key: "score" as SortKey, label: "Score", align: "right", useScoreTooltip: true },
                  { key: "asking" as SortKey, label: "Asking", align: "right" },
                  { key: "iiv" as SortKey, label: "IIV", align: "right", tooltip: "Intrinsic Investment Value — our model's estimate of fair market value based on comparable auction results and spec analysis." },
                  { key: "variance" as SortKey, label: "Variance", align: "right", tooltip: "Asking price vs. IIV. Positive = priced below fair value (buying opportunity). Negative = priced above fair value." },
                  { key: null, label: "First Seen", align: "center" },
                  { key: null, label: "Dealer", align: "center" },
                  { key: null, label: "Verdict", align: "center" },
                  { key: null, label: "Detail", align: "center" },
                ]).map((col, i) => (
                  <th
                    key={i}
                    className={`p-3 data-label ${
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    } ${
                      col.key ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""
                    } ${
                      col.key && sortKey === col.key ? "text-primary" : ""
                    }`}
                    onClick={() => col.key && handleSort(col.key)}
                    title={col.key ? `Sort by ${col.label}` : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {(col as any).useScoreTooltip && (
                        <span onClick={(e) => e.stopPropagation()}>
                          <ScoreBreakdown
                            weights={WEIGHTS}
                            weightLabels={WEIGHT_LABELS}
                            weightEvidence={WEIGHT_EVIDENCE}
                          />
                        </span>
                      )}
                      {!(col as any).useScoreTooltip && (col as any).tooltip && (
                        <UITooltip>
                          <UITooltipTrigger asChild>
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-muted-foreground/40 text-muted-foreground/60 text-[8px] font-bold cursor-help ml-0.5" onClick={(e) => e.stopPropagation()}>?</span>
                          </UITooltipTrigger>
                          <UITooltipContent side="top" className="max-w-[220px] text-xs">
                            {(col as any).tooltip}
                          </UITooltipContent>
                        </UITooltip>
                      )}
                      {col.key && (
                        <span className="text-[9px] opacity-60">
                          {sortKey === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : " ▲▼"}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeCars.map((car) => (
                <React.Fragment key={car.id}>
                <tr data-car-id={car.id} onClick={() => window.location.href = `/f8/${car.id}`} className={`border-b border-border/50 hover:bg-muted/40 transition-all duration-300 cursor-pointer ${car.soldDate ? 'opacity-50' : ''}`}>
                  <td className="p-3">
                    <span className={`font-serif font-bold text-base md:text-lg ${car.rank === 1 ? "text-primary" : "text-muted-foreground"}`}>
                      #{car.rank}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-foreground">{car.year} · {car.colour}</span>
                      {car.soldDate && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 border border-red-300 rounded-sm">SOLD</span>}
                      {false && null /* motExpired not tracked for F8 */}
                      {car.priceDropDate && car.priceDropAmount && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-300 rounded-sm animate-pulse" title={`£${car.priceDropAmount.toLocaleString()} price drop on ${car.priceDropDate}`}>
                          ▼ £{Math.round(car.priceDropAmount / 1000)}k DROP
                        </span>
                      )}
                    </div>
                    <div className="data-label mt-0.5 text-[10px] flex items-center gap-1 flex-wrap">
                      {fmtMi(car.mileage)} · <span className="truncate max-w-[120px]" title={car.dealer}>{car.dealer && car.dealer !== 'Unknown' ? car.dealer : 'Independent Dealer'}</span>
                      {car.dealerType !== "ferrari-approved" && (
                        <span className="px-1 py-0 text-[9px] font-bold bg-blue-900/30 text-blue-700 border border-blue-800/30 rounded-sm">INDEP</span>
                      )}
                    </div>
                    {(car as any).firstSeen && (
                      <div className="text-[9px] text-muted-foreground/60 mt-0.5">First seen: {(car as any).firstSeen}</div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {(car as any).llmSpecConfidence && (
                        <span
                          title={`Data confidence: ${(car as any).llmSpecConfidence} — ${(car as any).llmSpecConfidence === 'high' ? 'LLM-verified from full option list' : (car as any).llmSpecConfidence === 'medium' ? 'LLM-verified from partial data' : 'Estimated from limited data'}`}
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            (car as any).llmSpecConfidence === 'high' ? 'bg-emerald-500' :
                            (car as any).llmSpecConfidence === 'medium' ? 'bg-amber-400' :
                            'bg-red-400'
                          }`}
                        />
                      )}
                      {car.totalScoreNorm === 0 ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-muted text-muted-foreground border border-border rounded-sm">PENDING</span>
                      ) : (
                        <span className={`font-mono font-bold ${car.totalScoreNorm >= 80 ? "text-primary" : "text-foreground"}`}>{car.totalScoreNorm.toFixed(1)}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono text-foreground">{fmtK(car.askingPrice)}</td>
                  <td className="p-3 text-right font-mono text-primary">{car.iiv > 0 ? fmtK(car.iiv) : <span className="text-muted-foreground/40">—</span>}</td>
                  <td className={`p-3 text-right font-mono font-medium ${car.priceVariance > 0 ? "variance-positive" : "variance-negative"}`}>
                    {car.iiv > 0 ? (car.priceVariance > 0 ? "+" : "") + fmtK(car.priceVariance) : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="p-3 text-center">
                    {car.firstSeen ? (
                      <div className="flex flex-col items-center gap-0.5">
                        {car.firstSeen === todayStr && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500 text-white rounded-sm animate-pulse">NEW</span>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono">{car.firstSeen}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-sm whitespace-nowrap ${
                      car.dealerType === "ferrari-approved"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "bg-card border border-border text-muted-foreground"
                    }`}>
                      {car.dealerType === "ferrari-approved" ? "MAIN" : "INDEP"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm whitespace-nowrap ${VERDICT_CLASS[getCarVerdict(car.totalScoreNorm, car.priceVariance)]}`}>
                      {VERDICT_LABELS[getCarVerdict(car.totalScoreNorm, car.priceVariance)]}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/f8/${car.id}`} className="text-primary hover:text-primary/80 text-xs font-medium underline underline-offset-2 whitespace-nowrap">
                        View →
                      </Link>
                      {(car.dealerUrl || car.listingUrl) && !car.soldDate && (
                        <a href={car.dealerCarUrl || car.dealerUrl || car.listingUrl} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] text-muted-foreground hover:text-primary transition-colors" title={car.dealerType === "ferrari-approved" ? "View on Ferrari Approved" : "View on dealer site"}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                      {car.dealerOptions && car.dealerOptions.length > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); setExpandedOptionsId(expandedOptionsId === car.id ? null : car.id); }}
                          className={`text-[10px] px-1.5 py-0.5 border rounded-sm transition-colors whitespace-nowrap ${
                            expandedOptionsId === car.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                          }`}
                          title="Show dealer-sourced options list"
                        >
                          {expandedOptionsId === car.id ? "▲ Options" : `▼ Options (${car.dealerOptions.length})`}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              {expandedOptionsId === car.id && car.dealerOptions && car.dealerOptions.length > 0 && (
                <tr key={`${car.id}-opts`} className="bg-muted/20 border-b border-border/50">
                  <td colSpan={10} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        <div className="data-label text-[10px] text-primary mb-1">DEALER OPTIONS</div>
                        <div className="text-[9px] text-muted-foreground/60">
                          {car.dealerCarUrl ? (
                            <a href={car.dealerCarUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors underline underline-offset-2">
                              Source: {new URL(car.dealerCarUrl).hostname.replace('www.', '')}
                            </a>
                          ) : 'Source: dealer website'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {car.dealerOptions.filter(opt => opt.trim().length > 2 && !opt.match(/^(Registration|Mileage|Fuel Type|Transmission|Colour|CO2|Engine|Top Speed|0 to 60|DETAILS):?$/i)).map((opt, i) => (
                          <span key={i} className="px-2 py-0.5 text-[10px] bg-card border border-border/60 text-foreground/80 rounded-sm">
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── Car Card ─────────────────────────────────────────────────────────────────
function CarCard({ car }: { car: CarSpec }) {
  const [expanded, setExpanded] = useState(false);
  const gpfInfo = GPF_LABEL["fitted"]; // All F8s are GPF-fitted
  return (
    <div className={`car-card bg-card flex flex-col h-full ${car.rank === 1 ? "rank-1" : ""} ${car.soldDate ? 'opacity-60' : ''}`}>
      {car.soldDate && (
        <div className="bg-red-100 border-b border-red-300 px-4 py-2 flex items-center gap-2">
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 rounded-sm">SOLD</span>
          <span className="text-[11px] text-red-700/80">{car.soldNote}</span>
        </div>
      )}
      <div className="p-4 md:p-5 border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="font-serif text-xl md:text-2xl font-bold text-primary">#{car.rank}</span>
              {car.atelierCar && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded-sm whitespace-nowrap">
                  ATELIER
                </span>
              )}
              {car.soldDate && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 rounded-sm whitespace-nowrap">
                  SOLD
                </span>
              )}
              {/* Warranty badge */}
              {car.warrantyType === "ferrari-approved" && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-sm whitespace-nowrap">
                  FA WARRANTY
                </span>
              )}
              {car.warrantyType === "dealer-warranty" && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                  DEALER WARRANTY
                </span>
              )}
              {car.warrantyType === "none" && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground border border-border whitespace-nowrap">
                  NO WARRANTY
                </span>
              )}
              {false && null /* motExpired not tracked for F8 */}
              {car.priceDropDate && car.priceDropAmount && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300 rounded-sm whitespace-nowrap animate-pulse" title={`Price reduced by £${car.priceDropAmount.toLocaleString()} on ${car.priceDropDate}`}>
                  ▼ PRICE DROP £{Math.round(car.priceDropAmount / 1000)}k
                </span>
              )}
              <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm whitespace-nowrap ${VERDICT_CLASS[getCarVerdict(car.totalScoreNorm, car.priceVariance)]}`}>
                {VERDICT_LABELS[getCarVerdict(car.totalScoreNorm, car.priceVariance)]}
              </span>
            </div>
            <h3 className="font-serif text-base md:text-xl font-bold text-foreground leading-tight">
              {car.year} {car.colour}
            </h3>
            <div className="data-label mt-0.5 text-[10px] md:text-xs">{car.interior && car.interior !== 'Unknown' ? `${car.interior} · ` : ''}{car.dealer}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="data-label text-[10px]">Asking</div>
            <div className="font-mono text-base md:text-xl font-bold text-foreground">{fmt(car.askingPrice)}</div>
            <div className={`font-mono text-xs font-medium ${car.priceVariance > 0 ? "variance-positive" : "variance-negative"}`}>
              {car.priceVariance > 0 ? "+" : ""}{fmtK(car.priceVariance)} vs IIV
            </div>
          </div>
        </div>

        {/* Car Photo */}
        {car.images && car.images.length > 0 && (
          <div className="mt-3 rounded-md overflow-hidden bg-muted" style={{height: '160px'}}>
            <img
              src={car.images[0]}
              alt={`${car.year} Ferrari F8 Tributo ${car.colour}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* 4-metric grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border mt-3">
          {[
            { label: "Score", value: `${car.totalScoreNorm.toFixed(1)}`, cls: car.totalScoreNorm >= 80 ? "text-primary" : "text-foreground", big: true },
            { label: "Miles", value: fmtMi(car.mileage), cls: "text-foreground", big: false },
            { label: "GPF", value: gpfInfo.label, cls: gpfInfo.cls, big: false },
            { label: "5yr ROI", value: `+${car.predictions.roi5yr}%`, cls: car.predictions.roi5yr > 20 ? "variance-positive" : "text-foreground", big: false },
          ].map((m) => (
            <div key={m.label} className="bg-card/80 p-2 text-center">
              <div className="data-label text-[9px] md:text-[10px]">{m.label}</div>
              <div className={`font-mono text-[11px] md:text-sm font-bold leading-tight mt-0.5 ${m.cls}`}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div className="p-4 md:p-5 border-b border-border">
        <div className="data-label mb-2 md:mb-3">Buyer's Guide Checklist</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          <CheckItem pass={false} label="GPF Fitted (All F8s)" />
          <CheckItem pass={car.checklist.suspensionLift} label="Suspension Lift" />
          <CheckItem pass={car.checklist.carbonDriverZone} label="Carbon Driver Zone" />
          <CheckItem pass={car.checklist.daytonaSeats} label="Daytona Seats" />
          <CheckItem pass={car.checklist.specialColour} label="Special Colour" />
          <CheckItem pass={car.checklist.carbonDriverZone} label="Carbon Driver Zone" />
          <CheckItem pass={car.checklist.lowMileage} label="Low Mileage (<10k)" />
          <CheckItem pass={car.checklist.atelierCommission} label="Atelier Commission" />
        </div>
      </div>

      {/* Verdict */}
      <div className="p-4 md:p-5 border-b border-border">
        <div className="data-label mb-2">Investment Verdict</div>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{car.verdictReason}</p>
      </div>

      {/* Negotiation Room */}
      {!car.soldDate && car.targetPrice && car.negotiationDiscountPct && (
        <div className="p-4 md:p-5 border-b border-amber-300 bg-amber-50">
          <div className="data-label mb-2 flex items-center gap-1.5 text-amber-700">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 0l-3-3m3 3l-3 3M9 17h6m0 0l-3-3m3 3l-3 3" />
            </svg>
            Negotiation Room
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-amber-800 mb-0.5">
                {car.dealerType === "ferrari-approved"
                  ? `Ferrari Approved dealers typically accept ${car.negotiationDiscountPct}% off`
                  : `Independent specialists typically accept ${car.negotiationDiscountPct}% off`
                }
                {car.priceDropDate && " · Recent price drop signals motivated seller"}
              </div>
              <div className="text-[10px] text-amber-800">
                Opening offer: <span className="font-mono font-bold text-amber-900">{fmt(car.targetPrice)}</span>
                <span className="text-amber-700 ml-1">(saving {fmt(car.askingPrice - car.targetPrice)})</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[9px] text-amber-700 uppercase tracking-widest font-medium">Est. Room</div>
              <div className="font-mono text-base font-bold text-amber-900">{car.negotiationDiscountPct}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Expandable spec */}
      <div className="p-4 md:p-5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left flex items-center justify-between text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <span className="font-medium text-xs md:text-sm">{expanded ? "Hide" : "Show"} Full Specification</span>
          <span className="font-mono text-lg leading-none">{expanded ? "−" : "+"}</span>
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {[
              { label: "Exterior Equipment", items: car.equipment.exterior },
              { label: "Interior Equipment", items: car.equipment.interior },
              { label: "Other Equipment", items: car.equipment.other },
            ].map((section) => (
              <div key={section.label}>
                <div className="data-label mb-2">{section.label}</div>
                <div className="space-y-1">
                  {section.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Link href={`/f8/${car.id}`} className="text-primary text-sm font-medium hover:underline flex-1">
                View full analysis with predictions →
              </Link>
              {car.dealerUrl && (
                <a
                  href={car.dealerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-primary transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {car.dealerType === "ferrari-approved" ? "Ferrari Approved" : "View Listing"}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CarsSection() {
  const [showSold, setShowSold] = useState(false);
  const [mainDealerOnly, setMainDealerOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | "ferrari-approved" | "independent-specialist">("all");
  const soldCount = CARS_BY_RANK.filter((c) => c.soldDate).length;
  const visibleCars = CARS_BY_RANK.filter((c) => {
    if (!showSold && c.soldDate) return false;
    if (mainDealerOnly && c.dealerType !== "ferrari-approved") return false;
    if (sourceFilter === "ferrari-approved") return c.dealerType === "ferrari-approved";
    if (sourceFilter === "independent-specialist") return c.dealerType === "independent-specialist" || c.dealerType === "general-dealer";
    return true;
  });
  const mainDealerCount = CARS_BY_RANK.filter(c => !c.soldDate && c.dealerType === "ferrari-approved").length;

  return (
    <section id="cars" className="py-14 md:py-20 border-t border-border">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-6 md:mb-10">
          <div className="section-number text-3xl md:text-4xl lg:text-6xl">03</div>
          <div className="flex-1 min-w-0">
            <div className="data-label text-primary mb-2">Full UK Market · {MARKET_STATS.activeListings} Active Listings · Refreshed {MARKET_STATS.lastUpdated}</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Browse All Cars
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Every Ferrari F8 Tributo currently for sale in the UK, ranked by value.
              Cards are ordered most underpriced first — tap any car for the full buyer's brief, negotiation script, and IIV analysis.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: "all", label: "All Sources", count: CARS_BY_RANK.filter(c => !c.soldDate).length },
              { key: "ferrari-approved", label: "Ferrari Approved", count: CARS_BY_RANK.filter(c => !c.soldDate && c.dealerType === "ferrari-approved").length },
              { key: "independent-specialist", label: "Independents", count: CARS_BY_RANK.filter(c => !c.soldDate && (c.dealerType === "independent-specialist" || c.dealerType === "general-dealer")).length },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setSourceFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors ${
                  sourceFilter === f.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
                }`}
              >
                {f.label}
                <span className={`px-1 py-0.5 text-[9px] font-bold rounded-sm ${
                  sourceFilter === f.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>{f.count}</span>
              </button>
            ))}
            {soldCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-500 border border-red-800/30 rounded-sm">
                {soldCount} SOLD
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{visibleCars.length} listing{visibleCars.length !== 1 ? 's' : ''}</span>
            {/* Main Dealer Only toggle */}
            <button
              onClick={() => {
                setMainDealerOnly(!mainDealerOnly);
                if (!mainDealerOnly) setSourceFilter("all");
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border transition-colors ${
                mainDealerOnly
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              }`}
              title="Show only Ferrari Approved main dealer cars"
            >
              <span className={`w-2 h-2 rounded-full ${
                mainDealerOnly ? 'bg-primary-foreground' : 'bg-muted-foreground'
              }`} />
              Main Dealer Only
              <span className={`px-1 py-0.5 text-[9px] font-bold rounded-sm ${
                mainDealerOnly ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>{mainDealerCount}</span>
            </button>
            {soldCount > 0 && (
              <button
                onClick={() => setShowSold(!showSold)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border transition-colors ${
                  showSold
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                }`}
              >
                {showSold ? 'Hide sold' : 'Show sold'}
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {visibleCars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Sentiment data by year (from SENTIMENT_DATA.yearTrend) — mapped to chart years
// 2026 = most recent data point; earlier years = historical influencer sentiment
const SENTIMENT_BY_YEAR: Record<string, number> = {
  "2017": 1.46,
  "2018": 1.43,
  "2019": 2.00,
  "2020": 1.69,
  "2021": 1.00,
  "2022": 1.00,
  "2023": 2.00,
  "2024": 0.78,
  "2025": 2.00,
  "2026": 1.00,
  // Forward projections — sentiment expected to rise as "last pure V8" narrative matures
  "2028": 1.55,
  "2031": 1.70,
  "2033": 1.80,
  "2036": 1.90,
};

// ─── Predictions ──────────────────────────────────────────────────────────────
function PredictionsSection() {
  const activeCarsForPred = CARS_BY_RANK.filter(c => !c.soldDate);
  const [selectedId, setSelectedId] = useState<number>(() => activeCarsForPred[0]?.id ?? 0);
  const [showSentiment, setShowSentiment] = useState(true);
  const car = CARS.find((c) => c.id === selectedId) ?? activeCarsForPred[0]!;

  const chartData = [
    { year: "2026", base: car.askingPrice, optimistic: car.askingPrice, pessimistic: car.askingPrice, sentiment: SENTIMENT_BY_YEAR["2026"] },
    { year: "2028", base: Math.round(car.askingPrice * 1.08), optimistic: Math.round(car.askingPrice * 1.14), pessimistic: Math.round(car.askingPrice * 1.02), sentiment: SENTIMENT_BY_YEAR["2028"] },
    { year: "2031", base: car.predictions.base2031, optimistic: car.predictions.optimistic2031, pessimistic: car.predictions.pessimistic2031, sentiment: SENTIMENT_BY_YEAR["2031"] },
    { year: "2033", base: Math.round((car.predictions.base2031 + car.predictions.base2036) / 2), optimistic: Math.round((car.predictions.optimistic2031 + car.predictions.optimistic2036) / 2), pessimistic: Math.round((car.predictions.pessimistic2031 + car.predictions.pessimistic2036) / 2), sentiment: SENTIMENT_BY_YEAR["2033"] },
    { year: "2036", base: car.predictions.base2036, optimistic: car.predictions.optimistic2036, pessimistic: car.predictions.pessimistic2036, sentiment: SENTIMENT_BY_YEAR["2036"] },
  ];

  return (
    <section id="predictions" className="py-14 md:py-20 border-t border-border bg-card/30">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="section-number text-3xl md:text-4xl lg:text-6xl">05</div>
          <div>
            <div className="data-label text-primary mb-2">Step 05 — Where Values Are Heading</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              5 & 10-Year Predictions
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Predictions are calibrated to each vehicle's individual scoring variables. 
              Base rates derived from Hagerty Market Index, Full Throttle Talk, and comparable Ferrari V8 turbocharged trajectories.
            </p>
          </div>
        </div>

        {/* Car selector — dropdown on all screen sizes */}
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <span className="data-label text-xs shrink-0">Select car:</span>
          <Select value={String(selectedId)} onValueChange={(v) => setSelectedId(Number(v))}>
            <SelectTrigger className="w-full max-w-sm bg-card border-border text-sm">
              <SelectValue placeholder="Choose a car" />
            </SelectTrigger>
            <SelectContent>
              {CARS_BY_RANK.filter(c => !c.soldDate).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  #{c.rank} · {c.year} {c.colour} · {fmtK(c.askingPrice)} · {fmtMi(c.mileage)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm whitespace-nowrap shrink-0 ${VERDICT_CLASS[getCarVerdict(car.totalScoreNorm, car.priceVariance)]}`}>
            {VERDICT_LABELS[getCarVerdict(car.totalScoreNorm, car.priceVariance)]}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-card border border-border p-4 md:p-6">
            <div className="flex items-start justify-between mb-3 gap-2">
              <div>
                <div className="data-label text-primary text-[10px] md:text-xs">#{car.rank} · {car.year} {car.colour}</div>
                <div className="data-label mt-0.5 text-[10px] md:text-xs">{car.dealer} · {fmtMi(car.mileage)}</div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm whitespace-nowrap ${VERDICT_CLASS[getCarVerdict(car.totalScoreNorm, car.priceVariance)]}`}>
                {VERDICT_LABELS[getCarVerdict(car.totalScoreNorm, car.priceVariance)]}
              </span>
            </div>
            {/* Sentiment overlay toggle */}
            <button
              onClick={() => setShowSentiment(s => !s)}
              className={`mb-3 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold border transition-colors ${
                showSentiment
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-400"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="w-3 h-0.5 inline-block" style={{ background: showSentiment ? "oklch(0.65 0.18 295)" : "oklch(0.45 0.05 65)" }} />
              {showSentiment ? "Hide" : "Show"} Influencer Sentiment Overlay
            </button>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ top: 5, right: showSentiment ? 38 : 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.15 145)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="oklch(0.65 0.15 145)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.008 60)" />
                <XAxis dataKey="year" tick={{ fill: "oklch(0.65 0.015 65)", fontSize: 11 }} />
                {/* Left Y-axis: price */}
                <YAxis
                  yAxisId="price"
                  tick={{ fill: "oklch(0.55 0.015 65)", fontSize: 10 }}
                  tickFormatter={fmtK}
                  domain={["auto", "auto"]}
                  width={44}
                />
                {/* Right Y-axis: sentiment (only when overlay active) */}
                {showSentiment && (
                  <YAxis
                    yAxisId="sentiment"
                    orientation="right"
                    tick={{ fill: "oklch(0.65 0.18 295)", fontSize: 9 }}
                    domain={[0, 2]}
                    ticks={[0, 0.5, 1.0, 1.5, 2.0]}
                    tickFormatter={v => v === 0 ? "Neg" : v === 1 ? "Mixed" : v === 2 ? "Strong+" : String(v)}
                    width={38}
                  />
                )}
                <Tooltip
                  contentStyle={{ background: "oklch(0.11 0.006 60)", border: "1px solid oklch(0.22 0.008 60)", borderRadius: "3px", fontSize: 12 }}
                  formatter={(v: number, name: string) => {
                    if (name === "Sentiment") return [v.toFixed(2) + " / 2.0", "Influencer Sentiment"];
                    return [fmt(v), name];
                  }}
                />
                <Legend wrapperStyle={{ color: "oklch(0.65 0.015 65)", fontSize: 11 }} />
                <Area yAxisId="price" type="monotone" dataKey="optimistic" name="Optimistic" stroke="oklch(0.72 0.12 75)" strokeWidth={1.5} fill="url(#optGrad)" strokeDasharray="5 3" />
                <Area yAxisId="price" type="monotone" dataKey="base" name="Base Case" stroke="oklch(0.65 0.15 145)" strokeWidth={2} fill="url(#baseGrad)" />
                <Area yAxisId="price" type="monotone" dataKey="pessimistic" name="Pessimistic" stroke="oklch(0.50 0.08 27)" strokeWidth={1.5} fill="none" strokeDasharray="3 3" />
                {showSentiment && (
                  <Line
                    yAxisId="sentiment"
                    type="monotone"
                    dataKey="sentiment"
                    name="Sentiment"
                    stroke="oklch(0.65 0.18 295)"
                    strokeWidth={2}
                    dot={{ fill: "oklch(0.65 0.18 295)", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                    strokeDasharray="6 2"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            {showSentiment && (
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                <span className="font-semibold" style={{ color: "oklch(0.65 0.18 295)" }}>Purple line</span> = influence-weighted sentiment score (right axis, 0–2.0). 2026 data is measured; 2028–2036 projected based on "last pure twin-turbo V8" narrative maturation. Sentiment rising alongside price supports the investment thesis.
              </p>
            )}
          </div>

          {/* Prediction panels */}
          <div className="space-y-3">
            {[
              { label: "5-Year Forecast (2031)", pess: car.predictions.pessimistic2031, base: car.predictions.base2031, opt: car.predictions.optimistic2031, roi: car.predictions.roi5yr },
              { label: "10-Year Forecast (2036)", pess: car.predictions.pessimistic2036, base: car.predictions.base2036, opt: car.predictions.optimistic2036, roi: car.predictions.roi10yr },
            ].map((panel) => (
              <div key={panel.label} className="bg-card border border-border p-4 md:p-5">
                <div className="data-label text-primary mb-3 text-[10px] md:text-xs">{panel.label}</div>
                <div className="space-y-2">
                  {[
                    { label: "Optimistic", value: panel.opt, cls: "variance-positive" },
                    { label: "Base Case", value: panel.base, cls: "text-foreground" },
                    { label: "Pessimistic", value: panel.pess, cls: "text-muted-foreground" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="data-label text-[10px]">{row.label}</span>
                      <span className={`font-mono font-bold text-sm ${row.cls}`}>{fmt(row.value)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between items-center">
                      <span className="data-label text-[10px]">Base ROI</span>
                      <span className="font-mono font-bold text-sm variance-positive">+{panel.roi}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="bg-card border border-border p-4">
              <div className="data-label mb-2 text-[10px]">Assumptions</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Base: <span className="text-foreground font-mono">+4% p.a.</span> (Hagerty V8 Supercar index)</p>
                <p>Optimistic: <span className="text-foreground font-mono">+7% p.a.</span></p>
                <p>Pessimistic: <span className="text-foreground font-mono">+1% p.a.</span></p>
                <p>Score multiplier: <span className="text-foreground font-mono">{(car.totalScoreNorm / 80).toFixed(2)}×</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Buyer's Guide ────────────────────────────────────────────────────────────
function BuyersGuideSection() {
  const activeCars = CARS_BY_RANK.filter(c => !c.soldDate);
  const atelierCars = activeCars.filter(c => c.atelierCar);
  const atelierContent = atelierCars.length > 0
    ? `Atelier (bespoke factory) cars carry unique specification documentation and consistently command 10–15% premiums at auction. Currently ${atelierCars.length === 1 ? `Car #${atelierCars[0].rank} (${atelierCars[0].colour}, ${atelierCars[0].dealer}) is the only Atelier car` : `${atelierCars.length} Atelier cars are`} in the current UK market.`
    : "Atelier (bespoke factory) cars carry unique specification documentation and consistently command 10–15% premiums at auction. There are currently no Atelier cars in the active UK market — watch for new listings.";
  const items = [
    { title: "All F8s Are GPF-Fitted", priority: "CRITICAL", priorityCls: "text-red-700 border-red-400/30 bg-red-400/10", content: "Every F8 Tributo was built with a GPF (Gasoline Particulate Filter) fitted as standard. There are no pre-GPF F8 examples — unlike the 812 Superfast. The investment case rests entirely on specification, mileage, and colour rather than filter status." },
    { title: "Atelier Commission", priority: "HIGH VALUE", priorityCls: "text-primary border-primary/30 bg-primary/10", content: atelierContent },
    { title: "Colour Hierarchy", priority: "SIGNIFICANT", priorityCls: "text-muted-foreground border-border", content: (() => {
      const specialColourCars = activeCars.filter(c => c.colourCategory === 'special');
      const desirableColourCars = activeCars.filter(c => c.colourCategory === 'desirable');
      const specialColours = Array.from(new Set(specialColourCars.map(c => c.colour))).join(', ');
      return `Special colours (${specialColours || 'Canna di Fucile, Argento Nurburgring, historic blues'}) appreciate faster than standard greys. Currently ${specialColourCars.length} special and ${desirableColourCars.length} desirable-category cars are active in the UK market. Avoid standard white or yellow on this model. Matte finishes are rare and highly desirable.`;
    })() },
    { title: "Essential Options", priority: "MUST-HAVE", priorityCls: "text-primary border-primary/30 bg-primary/10", content: (() => {
      const liftCount = activeCars.filter(c => c.checklist.suspensionLift).length;
      const ccbCount = activeCars.filter(c => c.carbonCeramicBrakes).length;
      const daytonaCount = activeCars.filter(c => c.checklist.daytonaSeats).length;
      return `Carbon fibre steering wheel with LEDs is non-negotiable. Front suspension lift is essential for UK roads — ${liftCount} of ${activeCars.length} active listings have it. Carbon Ceramic Brakes (CCB) fitted on ${ccbCount} cars. Daytona seats (${daytonaCount} cars) command a measurable premium. Passenger display adds significant usability and value.`;
    })() },
    { title: "Mileage Thresholds", priority: "IMPORTANT", priorityCls: "text-muted-foreground border-border", content: (() => {
      const mileages = activeCars.map(c => c.mileage);
      const avgMileage = Math.round(mileages.reduce((a, b) => a + b, 0) / mileages.length);
      const lowMileageCount = activeCars.filter(c => c.mileage < 10000).length;
      const highMileageCount = activeCars.filter(c => c.mileage > 20000).length;
      return `Sub-10,000 miles commands a clear premium — currently ${lowMileageCount} of ${activeCars.length} active listings qualify. The market average is ${avgMileage.toLocaleString('en-GB')} miles. ${highMileageCount} listings exceed 20,000 miles, which significantly suppresses investment value. 10,000–15,000 miles is acceptable for a driver's car.`;
    })() },
    { title: "Ferrari Approved vs Independent", priority: "IMPORTANT", priorityCls: "text-amber-700 border-amber-400/30 bg-amber-400/10", content: (() => {
      const faCount = activeCars.filter(c => c.dealerType === 'ferrari-approved').length;
      const indCount = activeCars.filter(c => c.dealerType !== 'ferrari-approved').length;
      return `Of the ${activeCars.length} active UK listings, ${faCount} are Ferrari Approved (201+ point inspection, full service history verification, 24-month European warranty) and ${indCount} are from independent specialists. Ferrari Approved status adds 3–5% premium but provides significant peace of mind. Independent specialist cars can offer better value if provenance is verified independently.`;
    })() },
    { title: "ULEZ & Road Tax", priority: "UK-SPECIFIC", priorityCls: "text-muted-foreground border-border", content: "Despite 366g/km CO2, the F8 Tributo is Euro 6 compliant and fully ULEZ-exempt. Annual VED is £620 (highest band). No daily charge to drive in London or other UK Clean Air Zones. Note: ALL F8 Tributos are GPF-fitted — there are no pre-GPF examples." },
    { title: "Known Issues", priority: "INSPECT", priorityCls: "text-amber-700 border-amber-400/30 bg-amber-400/10", content: "Check for: turbo wastegate rattle (common on early cars), clutch wear on high-mileage examples, front splitter damage without suspension lift, and CCB pad wear indicators. A Ferrari dealer PPI is mandatory." },
    { title: "Market Timing", priority: "OPPORTUNITY", priorityCls: "text-green-700 border-green-400/30 bg-green-400/10", content: (() => {
      const prices = activeCars.map(c => c.askingPrice);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const undervaluedCount = activeCars.filter(c => c.priceVariance > 0).length;
      return `The F8 Tributo is widely considered at the bottom of its depreciation curve in ${MARKET_STATS.lastUpdated.split('-')[0] || '2026'}. With ${activeCars.length} active UK listings ranging from £${Math.round(minP/1000)}k to £${Math.round(maxP/1000)}k, and ${undervaluedCount} currently priced below IIV, the market presents genuine buying opportunities. The 296 GTB successor costs ~£280k new. With only ~600 UK examples, the investment window is now.`;
    })() },
  ];

  return (
    <section id="guide" className="py-14 md:py-20 border-t border-border">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="section-number text-3xl md:text-4xl lg:text-6xl">04</div>
          <div>
            <div className="data-label text-primary mb-2">Step 04 — What You Must Know</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Buyer's Guide
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              The nine things you must know before buying a Ferrari F8 Tributo or Spider — from GPF status and colour hierarchy to known issues and market timing.
            </p>
          </div>
        </div>
        <Accordion type="multiple" className="space-y-2">
          {items.map((item) => (
            <AccordionItem
              key={item.title}
              value={item.title}
              className="bg-card border border-border px-0 rounded-none"
            >
              <AccordionTrigger className="px-4 md:px-5 py-3.5 hover:no-underline hover:bg-muted/20 transition-colors [&[data-state=open]]:border-b [&[data-state=open]]:border-border">
                <div className="flex items-center gap-3 text-left">
                  <span className={`data-label px-1.5 py-0.5 border text-[9px] shrink-0 ${item.priorityCls}`}>
                    {item.priority}
                  </span>
                  <span className="font-serif text-sm md:text-base font-bold text-foreground">{item.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 md:px-5 pt-3 pb-4">
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{item.content}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

// ─── Verdict Section ─────────────────────────────────────────────────────────
function VerdictSection() {
  const [showAll, setShowAll] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [showSold, setShowSold] = useState(false);
  const soldCount = CARS_BY_RANK.filter(c => c.soldDate).length;
  const activeCars = showSold ? CARS_BY_RANK : CARS_BY_RANK.filter(c => !c.soldDate);
  const top3 = activeCars.filter(c => !c.soldDate).slice(0, 3);
  const allRest = activeCars.slice(3);
  const rest = listSearch.trim()
    ? allRest.filter(c => {
        const q = listSearch.toLowerCase();
        return (
          c.colour.toLowerCase().includes(q) ||
          c.dealer.toLowerCase().includes(q) ||
          c.year.toString().includes(q) ||
          String(c.askingPrice).includes(q.replace(/[£k,]/g, ""))
        );
      })
    : allRest;

  return (
    <section id="verdict" className="py-16 md:py-24 border-t-2 border-primary/40 bg-gradient-to-b from-card/60 to-background">
      <div className="container">
        {/* Reveal header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="data-label text-primary mb-3 text-xs tracking-widest">Step 06 — The Answer</div>
          <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl font-black text-foreground mb-4 leading-tight">
            The Verdict
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Based on the scoring framework, market analysis, and IIV modelling above —
            these are the three Ferrari F8 Tributos worth buying right now.
          </p>
          <div className="w-16 h-0.5 bg-primary mx-auto mt-6" />
        </div>

        {/* Top 3 full cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 items-stretch">
          {top3.map((car, idx) => (
            <div key={car.id} className="relative flex flex-col h-full">
              {/* Rank badge */}
              <div className={`absolute -top-3 left-4 z-10 px-3 py-1 text-xs font-bold border ${
                idx === 0
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border'
              }`}>
                {idx === 0 ? '★ #1 TOP PICK' : idx === 1 ? '#2 RUNNER UP' : '#3 CONSIDER'}
              </div>
              <CarCard car={car} />
            </div>
          ))}
        </div>

        {/* Compact list for the rest */}
        <div className="border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                value={listSearch}
                onChange={e => { setListSearch(e.target.value); setShowAll(true); }}
                placeholder="Filter by colour, dealer, or price..."
                className="h-7 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50"
              />
              {listSearch && (
                <button onClick={() => setListSearch("")} className="text-muted-foreground hover:text-foreground text-xs shrink-0">×</button>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {soldCount > 0 && (
                <button
                  onClick={() => setShowSold(!showSold)}
                  className={`text-xs px-2 py-0.5 border transition-colors ${
                    showSold
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {showSold ? `Hide ${soldCount} sold` : `+ ${soldCount} sold`}
                </button>
              )}
              <span className="data-label text-[10px]">{rest.length} of {allRest.length}</span>
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {showAll ? 'Collapse −' : `Show all →`}
              </button>
            </div>
          </div>
          {rest.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No cars match "{listSearch}" — <button onClick={() => setListSearch("")} className="text-primary hover:underline">clear filter</button>
            </div>
          )}
          <div className={`divide-y divide-border/50 ${
            !showAll && rest.length > 0 ? 'max-h-[320px] overflow-hidden relative' : ''
          }`}>
            {rest.map((car) => (
              <Link key={car.id} href={`/f8/${car.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group cursor-pointer ${car.soldDate ? 'opacity-50' : ''}`}>
                {/* Rank */}
                <span className="font-serif font-bold text-muted-foreground text-sm w-6 shrink-0">#{car.rank}</span>
                {/* Verdict pill */}
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-sm shrink-0 ${VERDICT_CLASS[getCarVerdict(car.totalScoreNorm, car.priceVariance)]}`}>
                  {VERDICT_LABELS[getCarVerdict(car.totalScoreNorm, car.priceVariance)]}
                </span>
                {/* Car info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {car.year} {car.colour}
                    {car.soldDate && <span className="ml-1.5 text-[9px] font-bold text-red-700 bg-red-100 px-1 py-0.5 rounded-sm">SOLD</span>}
                    {false && null}
                    {car.priceDropDate && <span className="ml-1.5 text-[9px] font-bold text-amber-700">▼ DROP</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {car.dealer} · {fmtMi(car.mileage)}
                    {car.dealerType !== 'ferrari-approved' && <span className="ml-1 text-blue-700">· INDEP</span>}
                  </div>
                </div>
                {/* Price + variance */}
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-bold text-foreground">{fmtK(car.askingPrice)}</div>
                  <div className={`font-mono text-[11px] font-medium ${
                    car.priceVariance > 0 ? 'variance-positive' : 'variance-negative'
                  }`}>
                    {car.priceVariance > 0 ? '+' : ''}{fmtK(car.priceVariance)}
                  </div>
                </div>
                {/* View button — always visible */}
                <span className="shrink-0 px-2.5 py-1.5 text-[11px] font-medium border border-border text-muted-foreground group-hover:border-primary group-hover:text-primary transition-colors">
                  View →
                </span>
              </Link>
            ))}
            {/* Fade gradient when collapsed */}
            {!showAll && (
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            )}
          </div>
          {!showAll && (
            <div className="px-4 py-3 border-t border-border text-center">
              <button
                onClick={() => setShowAll(true)}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Show all {rest.length} remaining cars →
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Floating Action Button ───────────────────────────────────────────────────────────
function FloatingFAB() {
  const [visible, setVisible] = useState(false);
  const [pastVerdict, setPastVerdict] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
      const verdictEl = document.getElementById("verdict");
      if (verdictEl) setPastVerdict(window.scrollY > verdictEl.offsetTop + 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  if (pastVerdict) {
    return (
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-4 z-50 flex items-center gap-1.5 px-3 py-2 bg-card border border-border text-muted-foreground text-xs font-medium shadow-lg hover:border-primary hover:text-primary transition-colors"
        aria-label="Back to top"
      >
        ↑ Top
      </button>
    );
  }

  return (
    <a
      href="#verdict"
      className="fixed bottom-6 right-4 z-50 flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:bg-primary/90 transition-colors"
      aria-label="Jump to The Verdict"
    >
      ★ The Verdict
    </a>
  );
}

// ─── Influencer Sentiment Section ───────────────────────────────────────────────────────────

// Weighted sentiment data — log10(views) * log10(subscribers) weighting
// 18 sources, 15.9M total views analysed

const SENTIMENT_DATA = F8_SENTIMENT_DATA;

const PLATFORM_ICONS: Record<string, string> = {
  "YouTube": "YT",
  "X / Twitter": "X",
  "TikTok": "TT",
  "Instagram": "IG",
  "Forums": "FR",
  "Reddit": "RD",
};

const SENTIMENT_COLOR: Record<string, string> = {
  "Strongly Positive": "text-emerald-700",
  "Positive": "text-green-700",
  "Mixed (Positive lean)": "text-amber-700",
  "Mixed": "text-amber-700",
  "Negative": "text-red-700",
  "Strongly Negative": "text-red-600",
};

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function InfluencerSentimentSection() {
  const [activeTab, setActiveTab] = useState<"overview" | "influencers" | "themes">("overview");
  const [expandedInfluencer, setExpandedInfluencer] = useState<string | null>(null);


  const { summary, platformBreakdown, yearTrend, topThemes, topInfluencers, keyInsights } = SENTIMENT_DATA;

  // Score gauge: 0–2 mapped to 0–100%
  const gaugeWidth = (summary.weightedScore / 2) * 100;

  return (
    <section id="sentiment" className="py-16 md:py-24 border-t border-border">
      <div className="container">
        {/* Header */}
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="section-number text-3xl md:text-4xl lg:text-6xl">07</div>
          <div>
            <div className="data-label text-primary mb-2">Step 07 — What the World Thinks</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Influencer Pulse
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Sentiment analysis across {summary.totalSources} sources — {(summary.totalViewsAnalysed / 1_000_000).toFixed(1)}M total views analysed. Each source is weighted by
              log₁₀(views) × log₁₀(subscribers) so a 3M-view Doug DeMuro review carries far more weight than a 500-view video.
            </p>
          </div>
        </div>

        {/* Overall score hero */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2 bg-card border border-border p-5 md:p-6">
            <div className="data-label mb-3">Influence-Weighted Sentiment Score</div>
            <div className="flex items-end gap-4 mb-4">
              <div className="font-serif text-5xl md:text-6xl font-black text-emerald-700">
                {summary.weightedScore.toFixed(2)}
              </div>
              <div className="text-muted-foreground text-sm mb-2">/ 2.00 maximum</div>
            </div>
            {/* Gauge bar */}
            <div className="relative h-3 bg-muted rounded-none mb-3">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000"
                style={{ width: `${gaugeWidth}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] md:text-[10px] text-muted-foreground mb-4">
              <span>Neg</span><span>Mixed</span><span>Strong+</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 p-2 md:p-3">
                <div className="data-label text-[9px] md:text-[10px] mb-1">Positive</div>
                <div className="font-serif text-lg md:text-xl font-bold text-emerald-700">{summary.pctPositive}%</div>
              </div>
              <div className="bg-muted/30 p-2 md:p-3">
                <div className="data-label text-[9px] md:text-[10px] mb-1">Mixed</div>
                <div className="font-serif text-lg md:text-xl font-bold text-amber-700">{summary.pctMixed}%</div>
              </div>
              <div className="bg-muted/30 p-2 md:p-3">
                <div className="data-label text-[9px] md:text-[10px] mb-1">Negative</div>
                <div className="font-serif text-lg md:text-xl font-bold text-red-700">{summary.pctNegative}%</div>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border p-5 md:p-6 flex flex-col gap-3">
            <div className="data-label mb-1">Coverage Stats</div>
            {[
              { label: "Sources Analysed", value: String(summary.totalSources) },
              { label: "Total Views", value: `${(summary.totalViewsAnalysed / 1_000_000).toFixed(1)}M` },
              { label: "Platforms", value: "6" },
              { label: "Date Range", value: "2017–2026" },
              { label: "Verdict", value: summary.sentimentLabel },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center border-b border-border/40 pb-2 last:border-0">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className={`text-xs font-bold ${
                  s.label === "Verdict" ? "text-emerald-700" : "text-foreground"
                }`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>


        {/* Tab navigation — equal-width grid on all screen sizes */}
        <div className="grid grid-cols-3 border-b border-border mb-6">
          {(["overview", "influencers", "themes"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full px-2 py-3 text-[10px] md:text-xs font-medium tracking-wide text-center transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "overview" ? "Trend & Platforms" : tab === "influencers" ? "Top Sources" : "Key Themes"}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Year trend chart */}
            <div className="bg-card border border-border p-4 md:p-6">
              <div className="data-label mb-1">Weighted Sentiment by Year (2017–2026)</div>
              <p className="text-xs text-muted-foreground mb-4">Higher = more positive. 2024 dip reflects realistic ownership cost discussions, not fundamental criticism.</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={yearTrend} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.008 60)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: "oklch(0.65 0.015 65)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "oklch(0.55 0.015 65)", fontSize: 10 }} domain={[0, 2]} ticks={[0, 0.5, 1, 1.5, 2]} tickFormatter={v => v === 0 ? "Neg" : v === 1 ? "Mixed" : v === 2 ? "Strong+" : String(v)} width={44} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.11 0.006 60)", border: "1px solid oklch(0.22 0.008 60)", fontSize: 12 }}
                    formatter={(v: number) => [v.toFixed(2), "Weighted Score"]}
                  />
                  <ReferenceLine y={1} stroke="oklch(0.72 0.12 75 / 0.3)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="score" stroke="oklch(0.72 0.12 75)" fill="url(#sentGrad)" strokeWidth={2} dot={{ fill: "oklch(0.72 0.12 75)", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Platform breakdown */}
            <div className="bg-card border border-border p-4 md:p-6">
              <div className="data-label mb-4">Platform Breakdown — Share of Influence Weight</div>
              <div className="space-y-3">
                {platformBreakdown.map(p => {
                  const sentLabel = p.weightedSentiment >= 1.5 ? "+" : p.weightedSentiment >= 0.75 ? "+" : p.weightedSentiment >= 0 ? "~" : "-";
                  const sentLabelFull = p.weightedSentiment >= 1.5 ? "STRONG +" : p.weightedSentiment >= 0.75 ? "POSITIVE" : p.weightedSentiment >= 0 ? "MIXED" : "NEG";
                  const sentCls = p.weightedSentiment >= 1.5 ? "text-emerald-700" : p.weightedSentiment >= 0.75 ? "text-green-700" : p.weightedSentiment >= 0 ? "text-amber-700" : "text-red-700";
                  return (
                    <div key={p.platform}>
                      {/* Mobile: compact 2-line layout */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 w-7 text-center shrink-0">{PLATFORM_ICONS[p.platform] || p.platform.slice(0,2).toUpperCase()}</span>
                        <span className="text-xs text-foreground font-medium flex-1 truncate">{p.platform}</span>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{fmtViews(p.totalViews)}</span>
                        <span className={`text-[10px] font-bold shrink-0 w-14 text-right ${sentCls}`}>{sentLabelFull}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-7 shrink-0" />{/* spacer to align with icon above */}
                        <div className="flex-1 h-1.5 bg-muted relative">
                          <div className="absolute left-0 top-0 h-full transition-all duration-700" style={{ width: `${p.sentimentPct}%`, background: p.color }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground w-10 text-right shrink-0">{p.sentimentPct}% wt</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key buyer insights */}
            <div className="grid sm:grid-cols-2 gap-3">
              {keyInsights.map(insight => (
                <div key={insight.label} className={`border p-4 ${
                  insight.type === "positive" ? "border-emerald-300 bg-emerald-50" :
                  "border-amber-300 bg-amber-50"
                }`}>
                  <div className={`data-label text-[10px] mb-1.5 ${
                    insight.type === "positive" ? "text-emerald-700" : "text-amber-700"
                  }`}>{insight.label}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Top Influencers */}
        {activeTab === "influencers" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-4">Ranked by influence weight (log₁₀(views) × log₁₀(subscribers)). Click any row to expand the full quote.</p>
            {topInfluencers.map((inf, idx) => (
              <div
                key={inf.creator}
                className="border border-border bg-card cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setExpandedInfluencer(expandedInfluencer === inf.creator ? null : inf.creator)}
              >
                <div className="flex items-center gap-2 px-3 py-3 md:px-4">
                  <span className="font-serif font-bold text-muted-foreground text-sm w-5 shrink-0">#{idx + 1}</span>
                  <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 shrink-0">{PLATFORM_ICONS[inf.platform] || "?"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{inf.creator}</div>
                    <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-1.5">
                      <span>{inf.subscribers}</span>
                      <span className="text-border">·</span>
                      <span>{fmtViews(inf.views)} views</span>
                      <span className="text-border">·</span>
                      <span>{inf.year}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-1">
                    <div className={`text-[9px] font-bold leading-tight ${SENTIMENT_COLOR[inf.sentiment] || "text-muted-foreground"}`}>
                      {inf.sentiment === "Mixed (Positive lean)" ? "MIXED+" : inf.sentiment.toUpperCase().replace("STRONGLY ", "STR. ")}
                    </div>
                    <div className="text-[9px] text-muted-foreground">wt {inf.weight.toFixed(1)}</div>
                  </div>
                  <span className="text-muted-foreground text-[10px] ml-0.5">{expandedInfluencer === inf.creator ? "▲" : "▼"}</span>
                </div>
                {expandedInfluencer === inf.creator && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3">
                    <blockquote className="text-sm text-foreground/80 italic leading-relaxed border-l-2 border-primary pl-3 mb-3">
                      “{inf.quote}”
                    </blockquote>
                    <a
                      href={inf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-primary hover:underline"
                    >
                      Watch / Read →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab: Key Themes */}
        {activeTab === "themes" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground mb-4">Recurring themes extracted from all {summary.totalSources} sources. Frequency = number of sources that prominently discuss this theme.</p>
            {topThemes.map((theme, idx) => (
              <div key={theme.theme} className="bg-card border border-border p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground w-5">#{idx + 1}</span>
                    <h3 className="text-sm font-semibold text-foreground">{theme.theme}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                      theme.sentiment === "Strongly Positive" ? "text-emerald-700 border-emerald-300" :
                      theme.sentiment === "Positive" ? "text-green-700 border-green-300" :
                      "text-amber-700 border-amber-300"
                    }`}>{theme.sentiment.toUpperCase()}</span>
                    <span className="text-[10px] text-muted-foreground">{theme.count} sources</span>
                  </div>
                </div>
                {/* Frequency bar */}
                <div className="h-1 bg-muted mb-2">
                  <div
                    className="h-full bg-primary/60"
                    style={{ width: `${(theme.count / 8) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{theme.note}</p>
              </div>
            ))}
          </div>
        )}

        {/* Methodology note */}
        <div className="mt-6 p-3 border border-border/40 bg-muted/10">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Methodology:</span> {summary.methodology} Sources include YouTube reviews, TikTok content, Instagram posts, X/Twitter discussions, Reddit threads, and owner forums. Data collected April 2026.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Finance Section ──────────────────────────────────────────────────────────
function FinanceSectionWrapper() {
  const activeCars = CARS_BY_RANK.filter(c => !c.soldDate);
  const avgPrice = activeCars.length > 0
    ? Math.round(activeCars.reduce((s, c) => s + c.askingPrice, 0) / activeCars.length)
    : 195000;
  const topCar = activeCars[0];
  const iivPrice = topCar && topCar.iiv > topCar.askingPrice ? topCar.iiv : undefined;
  return (
    <section id="finance" className="py-14 md:py-20 border-t border-border">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-10">
          <div className="section-number text-3xl md:text-4xl lg:text-6xl">07</div>
          <div>
            <div className="data-label text-primary mb-2">Step 07 — Finance Planning</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3">
              Finance Calculator
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Estimate your monthly PCP or HP payments based on the current average F8 Tributo asking price.
              Adjust deposit, term, and APR to find a structure that works for you.
            </p>
          </div>
        </div>
        <FinanceCalculator
          vehiclePrice={avgPrice}
          iivPrice={iivPrice}
          carTitle="Ferrari F8 Tributo"
        />
      </div>
    </section>
  );
}
// ─── Research Hub CTA ───────────────────────────────────────────────────────────
function ResearchHubCTA() {
  return (
    <section className="py-12 md:py-16 border-t border-border bg-card/30">
      <div className="container text-center">
        <div className="data-label text-primary text-xs mb-3">Expand Your Research</div>
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-3">
          Analyse Any Investment-Grade Car
        </h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto mb-6 leading-relaxed">
          The same rigorous methodology — live market data, verified specifications, weighted scoring, and 5 &amp; 10-year predictions — applied to any collector car.
        </p>
        <Link
          href="/research"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Explore the Research Hub →
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border py-8 md:py-10">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div>
            <div className="font-serif text-base md:text-lg font-bold text-foreground mb-1">Ferrari F8 Tributo / Spider</div>
            <div className="data-label">UK Investment Analysis · April 2026</div>
            <p className="text-xs text-muted-foreground mt-2 max-w-md">
              All specifications verified from Ferrari Approved UK (preowned.ferrari.com). 
              Price predictions are based on analyst data and historical comparable models. 
              This report is for informational purposes only and does not constitute financial advice.
            </p>
          </div>
          <div className="md:text-right">
            <div className="data-label mb-2">Sources</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Ferrari Approved UK · preowned.ferrari.com</div>
              <div>Hagerty Market Index 2026</div>
              <div>Full Throttle Talk Analyst Commentary</div>
              <div>Classic Valuer UK Price Guide</div>
              <div>Octoclassic Ferrari Market Analysis</div>
              <div>Bring a Trailer Auction Results</div>
              <div>DVLA Registration Data</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────────────────
export default function F8TributoReport() {
  useEffect(() => { document.title = 'Ferrari F8 Tributo — UK Investment Analysis'; return () => { document.title = 'SupercarIQ — Ferrari Investment Analysis'; }; }, []);
  return (
    <ReportGate modelKey="f8-tributo" modelLabel="Ferrari F8 Tributo" heroImageUrl={F8_HERO_IMAGE}>
      <div className="min-h-screen bg-background">
        <IntelBar />
        <GlobalNav reportTitle="F8 Tributo" />
        <Hero />
        <FloatingFAB />
        <SharedFrameworkSection
          weights={WEIGHTS}
          weightLabels={WEIGHT_LABELS}
          weightDescriptions={WEIGHT_DESCRIPTIONS}
          weightEvidence={WEIGHT_EVIDENCE}
          sectionNumber="01"
          modelName="Ferrari F8 Tributo"
        />
        <RankingsSection />
        {/* <CarsSection /> */}
        <BuyersGuideSection />
        <PredictionsSection />
        <InfluencerSentimentSection />
        <VerdictSection />
        <FinanceSectionWrapper />
        <ResearchHubCTA />
        <Footer />
      </div>
    </ReportGate>
  );
}
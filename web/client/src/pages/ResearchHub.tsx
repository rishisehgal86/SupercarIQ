import { GlobalNav } from "@/components/GlobalNav";
/**
 * Research Hub — All Models Library
 * Design: Light editorial theme matching the 812/F8 report pages
 * Sharp edges, warm cream background, DM Mono data labels, Ferrari red accents
 */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, TrendingUp, Clock, CheckCircle, ChevronRight, BarChart2, Shield, Star } from "lucide-react";
import { carLibrary, universalScoringFramework, type CarAnalysis } from "@/data/research";

// ─── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CarAnalysis["status"] }) {
  if (status === "complete") {
    return (
      <span className="data-label inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] bg-emerald-600 text-white border border-emerald-700">
        ● LIVE
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="data-label inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-700 border border-amber-300">
        ◐ IN PROGRESS
      </span>
    );
  }
  return (
    <span className="data-label inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] bg-muted text-muted-foreground border border-border">
      ○ COMING SOON
    </span>
  );
}

// ─── Grade badge ─────────────────────────────────────────────────────────────
function GradeBadge({ grade }: { grade: CarAnalysis["investmentGrade"] }) {
  const map: Record<string, string> = {
    "strong-buy": "verdict-strong-buy",
    buy: "verdict-buy",
    consider: "verdict-consider",
    avoid: "verdict-avoid",
    pending: "bg-muted text-muted-foreground border border-border",
  };
  const label: Record<string, string> = {
    "strong-buy": "STRONG BUY",
    buy: "BUY",
    consider: "CONSIDER",
    avoid: "AVOID",
    pending: "PENDING",
  };
  return (
    <span className={`data-label px-1.5 py-0.5 text-[9px] font-bold ${map[grade]}`}>
      {label[grade]}
    </span>
  );
}

// ─── Car library card ─────────────────────────────────────────────────────────
function CarCard({ car }: { car: CarAnalysis }) {
  const isComplete = car.status === "complete";

  const content = (
    <div
      className={`group bg-card border border-border overflow-hidden transition-all duration-200 ${
        isComplete ? "hover:border-primary/40 hover:shadow-sm cursor-pointer" : "opacity-70"
      }`}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-muted">
        <img
          src={car.heroImage}
          alt={`${car.make} ${car.model}`}
          className={`w-full h-full object-cover transition-transform duration-500 ${isComplete ? "group-hover:scale-105" : ""}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <p className="text-white/70 text-[10px] font-medium tracking-widest uppercase">{car.make}</p>
            <p className="text-white font-bold text-lg leading-tight font-serif">
              {car.model}
            </p>
          </div>
          <GradeBadge grade={car.investmentGrade} />
        </div>
        <div className="absolute top-3 right-3">
          <StatusBadge status={car.status} />
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="data-label text-[10px]">{car.yearRange}</span>
          <span className="text-border">·</span>
          <span className="data-label text-[10px]">{car.market} Market</span>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed mb-3 line-clamp-2">{car.summary}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {car.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="data-label text-[9px] px-1.5 py-0.5 bg-muted border border-border">
              {tag}
            </span>
          ))}
        </div>

        {/* Stats row */}
        {isComplete && (
          <div className="grid grid-cols-3 gap-px bg-border mb-4">
            <div className="bg-card p-2 text-center">
              <p className="data-label text-[9px] mb-0.5">Listings</p>
              <p className="font-mono font-bold text-foreground text-sm">{car.listingCount}</p>
            </div>
            <div className="bg-card p-2 text-center">
              <p className="data-label text-[9px] mb-0.5">Price Range</p>
              <p className="font-mono font-bold text-foreground text-xs">{car.priceRange}</p>
            </div>
            <div className="bg-card p-2 text-center">
              <p className="data-label text-[9px] mb-0.5">Top Score</p>
              <p className="font-mono font-bold text-primary text-sm">{car.topScore}/100</p>
            </div>
          </div>
        )}

        {/* CTA */}
        {isComplete ? (
          <div className="flex items-center justify-between">
            <span className="data-label text-[10px]">
              Updated {new Date(car.lastRefresh).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
              View Analysis <ChevronRight size={12} />
            </span>
          </div>
        ) : (
          <div className="text-center py-1">
            <span className="data-label text-[10px]">Analysis in preparation</span>
          </div>
        )}
      </div>
    </div>
  );

  if (isComplete) {
    return <Link href={car.route}>{content}</Link>;
  }
  return <div>{content}</div>;
}

// ─── Scoring framework section ────────────────────────────────────────────────
function ScoringFrameworkSection() {
  return (
    <section className="py-14 md:py-20 border-t border-border bg-card/30">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="section-number text-3xl md:text-4xl lg:text-6xl">02</div>
          <div>
            <div className="data-label text-primary mb-2">The Methodology</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Weighted Scoring Framework
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Every car is evaluated across 10 weighted categories covering 20+ individual scoring variables, calibrated from auction data, Hagerty market indices, and specialist dealer insight. The framework produces a score out of 100 and an Intrinsic Investment Value (IIV) compared against the asking price.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border mb-8">
          {universalScoringFramework.map((cat) => (
            <div key={cat.id} className="bg-card p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xl">{cat.icon}</span>
                <span className="data-label text-[10px] text-primary">
                  {cat.weight}%
                </span>
              </div>
              <h3 className="font-serif font-bold text-foreground text-sm mb-1 leading-tight">{cat.name}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">{cat.description}</p>
            </div>
          ))}
        </div>

        {/* IIV formula */}
        <div className="bg-card border border-border p-5 md:p-6">
          <div className="data-label text-primary mb-3">IIV Formula — Hedonic Pricing Model</div>
          <div className="font-mono text-xs md:text-sm text-foreground bg-muted/40 p-3 border border-border leading-relaxed">
            IIV = Market Median × ∏(1 + Premium_i)<br/>
            <span className="text-muted-foreground">where Base = median pre/post-GPF UK auction price</span><br/>
            <span className="text-muted-foreground">Opportunity Gap = IIV − Asking Price (positive = undervalued)</span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Positive variance = priced below fair value. The larger the gap, the greater the buying opportunity.
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How it works section ─────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    {
      icon: <Search size={18} className="text-primary" />,
      title: "Market Research",
      desc: "Live data from Hagerty, Bring a Trailer, Glenmarch, Collecting Cars, and OEM approved pre-owned portals.",
    },
    {
      icon: <Shield size={18} className="text-primary" />,
      title: "Spec Verification",
      desc: "Every listing verified directly from the official dealer or OEM portal — never from third-party summaries.",
    },
    {
      icon: <BarChart2 size={18} className="text-primary" />,
      title: "Weighted Scoring",
      desc: "Each car scored across 20+ investment variables across 10 weighted categories, producing a score out of 100 and an IIV.",
    },
    {
      icon: <TrendingUp size={18} className="text-primary" />,
      title: "5 & 10-Year Predictions",
      desc: "Per-vehicle CAGR projections calibrated to the individual car's score, using Hagerty index data and comparable model trajectories.",
    },
    {
      icon: <Star size={18} className="text-primary" />,
      title: "Investment Verdict",
      desc: "A clear Strong Buy / Buy / Consider / Avoid verdict with a ranked comparison of all available cars in the segment.",
    },
  ];

  return (
    <section className="py-14 md:py-20 border-t border-border">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="section-number text-3xl md:text-4xl lg:text-6xl">03</div>
          <div>
            <div className="data-label text-primary mb-2">The Process</div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              How Every Analysis Is Built
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-border">
          {steps.map((step, i) => (
            <div key={i} className="bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  {step.icon}
                </div>
                <span className="data-label text-[10px] text-primary">STEP {i + 1}</span>
              </div>
              <h3 className="font-serif font-bold text-foreground text-sm mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main Research Hub page ───────────────────────────────────────────────────
export default function ResearchHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "complete" | "coming-soon">("all");

  const filtered = useMemo(() => {
    return carLibrary.filter((car) => {
      const matchesSearch =
        searchQuery === "" ||
        `${car.make} ${car.model}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        car.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "complete" && car.status === "complete") ||
        (filterStatus === "coming-soon" && car.status !== "complete");
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, filterStatus]);

  return (
    <div className="min-h-screen bg-background">

      <GlobalNav />

      {/* ── Hero ── */}
      <section className="border-b border-border py-14 md:py-20">
        <div className="container">
          <div className="flex gap-4 md:gap-8 items-start">
            <div className="section-number text-3xl md:text-4xl lg:text-6xl">01</div>
            <div className="flex-1 min-w-0">
              <div className="data-label text-primary mb-2">SupercarIQ · UK Market Analysis</div>
              <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight mb-4">
                Collector Car<br />
                <span className="text-primary italic">Investment Research</span>
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mb-6">
                Every analysis uses the same rigorous methodology — live market data, verified specifications, weighted scoring, and per-vehicle 5 and 10-year price predictions.
              </p>

              {/* Search bar */}
              <div className="relative max-w-xl mb-6">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by make, model, or tag (e.g. V12, Last of Line)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 text-sm"
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-px bg-border max-w-sm">
                {[
                  { value: carLibrary.filter((c) => c.status === "complete").length.toString(), label: "Live Analyses" },
                  { value: carLibrary.length.toString(), label: "Cars Tracked" },
                  { value: "20+", label: "Scoring Variables" },
                ].map((s) => (
                  <div key={s.label} className="bg-card px-4 py-3">
                    <div className="font-serif text-xl font-bold text-primary">{s.value}</div>
                    <div className="data-label text-[10px] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Car library ── */}
      <section className="py-12 md:py-16">
        <div className="container">
          {/* Filter tabs */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-foreground">
              Analysis Library
            </h2>
            <div className="flex gap-1">
              {(["all", "complete", "coming-soon"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                    filterStatus === f
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                  }`}
                >
                  {f === "all" ? "All Cars" : f === "complete" ? "Live" : "Coming Soon"}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filtered.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-border bg-card">
              <Search size={28} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">No cars found for "{searchQuery}"</p>
              <p className="text-muted-foreground text-sm mt-1">Try searching by make, model, or tag</p>
            </div>
          )}

          {/* Request a car CTA */}
          <div className="mt-12 bg-card border border-border p-6 md:p-8">
            <div className="data-label text-primary mb-3">Expand the Research</div>
            <h3 className="font-serif text-xl md:text-2xl font-bold text-foreground mb-2">
              Request a Car Analysis
            </h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-md">
              Don't see the car you're researching? Every analysis follows the same rigorous methodology. New analyses are added regularly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                Full market research
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                Verified specifications
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                10-year predictions
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Scoring framework ── */}
      <ScoringFrameworkSection />

      {/* ── How it works ── */}
      <HowItWorksSection />

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 md:py-10">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <div className="font-serif text-base font-bold text-foreground mb-1">SupercarIQ</div>
              <div className="data-label">Collector Car Investment Research · UK Market</div>
            </div>
            <p className="text-xs text-muted-foreground max-w-md">
              All analyses are for informational purposes only and do not constitute financial advice. Data refreshed regularly from Ferrari Approved UK, Hagerty, and specialist dealers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

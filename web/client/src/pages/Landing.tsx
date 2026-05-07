/**
 * SupercarIQ — Home Screen
 * Design: Light editorial, warm cream background, Ferrari red accents
 * Matches the premium design language of the 812 and F8 report pages
 */
import { Link } from "wouter";
import { useState, useEffect } from "react";
import {
  TrendingUp, BarChart2, Shield, Star, ChevronRight, ArrowRight,
  Zap, Clock, Award, Target
} from "lucide-react";
import { carLibrary } from "@/data/research";
import { CARS_MARKET_STATS as MARKET_STATS, CARS_BY_RANK } from "@/data/cars";
import { CARS_F8_MARKET_STATS as F8_MARKET_STATS, CARS_F8_BY_RANK as F8_CARS_BY_RANK } from "@/data/f8tributo";

// ─── Live market ticker ───────────────────────────────────────────────────────
function MarketTicker() {
  const _activeCars812 = CARS_BY_RANK.filter((c) => !c.soldDate);
  const _bestGap812 = Math.max(..._activeCars812.map((c) => c.priceVariance));
  const _activeCarsF8 = F8_CARS_BY_RANK.filter((c) => !c.soldDate);
  const _bestGapF8 = Math.max(..._activeCarsF8.map((c) => c.priceVariance));
  const items = [
    `${MARKET_STATS.activeListings} Ferrari 812 Superfast listings · Best gap +£${Math.round(_bestGap812 / 1000)}k`,
    `${F8_MARKET_STATS.activeListings} Ferrari F8 Tributo / Spider listings · Best gap +£${Math.round(_bestGapF8 / 1000)}k`,
    `2 live analyses · 4 models tracked · Refreshed ${MARKET_STATS.lastUpdated}`,
    `812 Superfast: STRONG BUY · F8 Tributo: BUY`,
  ];
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
        setVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="bg-primary border-b border-primary/80 py-2 overflow-hidden">
      <div className="container flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/70 animate-pulse" />
          <span className="text-primary-foreground/90 text-[10px] font-bold tracking-widest uppercase font-mono">Live</span>
        </div>
        <div
          className={`text-primary-foreground/80 text-xs font-mono transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        >
          {items[idx]}
        </div>
      </div>
    </div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-background/97 backdrop-blur-sm border-b border-border shadow-sm"
          : "bg-background border-b border-border"
      }`}
    >
      <div className="container h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary flex items-center justify-center">
            <TrendingUp size={13} className="text-primary-foreground" />
          </div>
          <span className="font-serif font-bold text-foreground text-base tracking-tight">
            SupercarIQ
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5">
          <Link href="/812-superfast" className="px-3 py-1.5 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors tracking-wide">
            812 Superfast
          </Link>
          <Link href="/f8-tributo" className="px-3 py-1.5 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors tracking-wide">
            F8 Tributo
          </Link>
          <Link href="/research" className="px-3 py-1.5 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors tracking-wide">
            All Models
          </Link>
          <Link href="/compare" className="px-3 py-1.5 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors tracking-wide">
            Compare
          </Link>
          <Link href="/watchlist" className="px-3 py-1.5 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors tracking-wide">
            Watchlist
          </Link>
        </div>

        {/* CTA + mobile hamburger */}
        <div className="flex items-center gap-2">
          <Link
            href="/research"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            All Reports <ChevronRight size={12} />
          </Link>
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
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background pb-3">
          {[
            { href: "/812-superfast", label: "812 Superfast" },
            { href: "/f8-tributo", label: "F8 Tributo" },
            { href: "/research", label: "All Models" },
            { href: "/compare", label: "Compare" },
            { href: "/watchlist", label: "Watchlist" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-4 py-3 text-sm text-muted-foreground hover:text-foreground border-b border-border/50 last:border-0 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const liveModels = carLibrary.filter((c) => c.status === "complete");
  const totalListings = MARKET_STATS.activeListings + F8_MARKET_STATS.activeListings;
  const activeCars812 = CARS_BY_RANK.filter((c) => !c.soldDate);
  const bestGap812 = Math.max(...activeCars812.map((c) => c.priceVariance));

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Background image with light overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/ferrari-812-hero_dca01ee3.jpg)`,
        }}
      />
      {/* Light warm overlay — keeps the editorial feel */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/96 via-background/90 to-background/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

      <div className="relative container py-16 md:py-24">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-6 h-px bg-primary" />
            <span className="data-label text-primary">
              {liveModels.length} Live Analyses · {totalListings} Active UK Listings
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-black text-foreground leading-none mb-5">
            Buy the right
            <br />
            <span className="text-primary italic">supercar.</span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mb-8 leading-relaxed">
            Every Ferrari and collector car on the UK market — scored, ranked, and valued from first principles.
            We tell you exactly which car to buy, and why.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-2.5 mb-12">
            <Link
              href="/812-superfast"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Ferrari 812 Superfast Analysis
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/f8-tributo"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-card border border-border text-foreground font-semibold text-sm hover:border-primary/50 transition-colors"
            >
              Ferrari F8 Tributo Analysis
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/research"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border text-muted-foreground font-semibold text-sm hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              All Models
            </Link>
          </div>

          {/* Trust stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
            {[
              { value: `${totalListings}`, label: "Live UK Listings" },
              { value: "20+", label: "Scoring Variables" },
              { value: "47+", label: "Auction Results" },
              { value: "15M+", label: "Views Analysed" },
            ].map((s) => (
              <div key={s.label} className="bg-card px-4 py-4">
                <div className="font-serif text-2xl font-black text-primary mb-0.5">{s.value}</div>
                <div className="data-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Live model cards ─────────────────────────────────────────────────────────
function LiveModels() {
  const liveModels = carLibrary.filter((c) => c.status === "complete");
  const activeCars812 = CARS_BY_RANK.filter((c) => !c.soldDate);
  const bestGap812 = Math.max(...activeCars812.map((c) => c.priceVariance));
  const topCar812 = activeCars812.sort((a, b) => a.rank - b.rank)[0] ?? null;

  const activeCarsF8 = F8_CARS_BY_RANK.filter((c) => !c.soldDate);
  const bestGapF8 = Math.max(...activeCarsF8.map((c) => c.priceVariance));
  const topCarF8 = activeCarsF8.sort((a, b) => a.rank - b.rank)[0] ?? null;

  const modelData = [
    {
      id: "ferrari-812-superfast",
      route: "/812-superfast",
      make: "Ferrari",
      model: "812 Superfast",
      yearRange: "2017–2022",
      tagline: "Last naturally aspirated V12 Ferrari GT",
      listings: MARKET_STATS.activeListings,
      priceRange: `£${Math.round(Math.min(...activeCars812.map(c => c.askingPrice)) / 1000)}k–£${Math.round(Math.max(...activeCars812.map(c => c.askingPrice)) / 1000)}k`,
      topVerdict: "STRONG BUY",
      verdictClass: "verdict-strong-buy",
      bestGap: `+£${Math.round(bestGap812 / 1000)}k`,
      tags: ["V12", "Pre-GPF", "Last of Line"],
      image: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/car21_photo1_7848a39a.jpg",
      topPick: topCar812 ? `#${topCar812.rank} Pick: ${topCar812.year} ${topCar812.colour} · ${topCar812.totalScoreNorm.toFixed(1)}/100` : null,
      topPickSub: topCar812 ? `${topCar812.atelierCar ? "Atelier · " : ""}Pre-GPF · +£${Math.round(topCar812.priceVariance / 1000)}k vs IIV` : null,
      investmentThesis: "At the bottom of its depreciation curve. The 12Cilindri successor costs £500k+. Only ~440 UK examples exist.",
    },
    {
      id: "ferrari-f8-tributo",
      route: "/f8-tributo",
      make: "Ferrari",
      model: "F8 Tributo / Spider",
      yearRange: "2019–2023",
      tagline: "Last pure turbocharged V8 mid-engine Ferrari",
      listings: F8_MARKET_STATS.activeListings,
      priceRange: `£${Math.round(Math.min(...activeCarsF8.map(c => c.askingPrice)) / 1000)}k–£${Math.round(Math.max(...activeCarsF8.map(c => c.askingPrice)) / 1000)}k`,
      topVerdict: "BUY",
      verdictClass: "verdict-buy",
      bestGap: `+£${Math.round(bestGapF8 / 1000)}k`,
      tags: ["Twin-Turbo V8", "Coupe & Spider", "Mid-Engine"],
      image: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/f8-rosso-corsa-coupe_ffb0ff71.jpg",
      topPick: topCarF8 ? `#${topCarF8.rank} Pick: ${topCarF8.year} ${topCarF8.colour} ${(topCarF8 as any).bodyStyle === "spider" ? "Spider" : "Coupé"} · ${topCarF8.totalScoreNorm.toFixed(1)}/100` : null,
      topPickSub: topCarF8 ? `CCB · MagneRide · Daytona Seats · +£${Math.round(topCarF8.priceVariance / 1000)}k vs IIV` : null,
      investmentThesis: "The SF90 hybrid successor costs £450k+. Pre-facelift F8 with full carbon spec is the sweet spot.",
    },
  ];

  return (
    <section className="py-14 md:py-20 border-b border-border">
      <div className="container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="data-label text-primary mb-2">Live Analyses</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              Current Reports
            </h2>
          </div>
          <Link
            href="/research"
            className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            All models <ChevronRight size={12} />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {modelData.map((car) => (
            <Link key={car.id} href={car.route}>
              <div className="group car-card bg-card cursor-pointer overflow-hidden">
                {/* Image */}
                <div className="relative h-52 overflow-hidden bg-muted">
                  <img
                    src={car.image}
                    alt={`${car.make} ${car.model}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${car.verdictClass}`}>
                      {car.topVerdict}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white">
                      LIVE
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="data-label mb-1">{car.make} · {car.yearRange}</div>
                  <h3 className="font-serif text-xl font-bold text-foreground mb-1 leading-tight">
                    {car.model}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">{car.tagline}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-px bg-border mb-4">
                    {[
                      { label: "Listings", value: String(car.listings) },
                      { label: "Price Range", value: car.priceRange },
                      { label: "Best Gap", value: car.bestGap },
                    ].map((s) => (
                      <div key={s.label} className="bg-card px-3 py-2.5">
                        <div className="data-label text-[9px] mb-0.5">{s.label}</div>
                        <div className="text-foreground text-xs font-bold font-mono">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Top pick highlight */}
                  {car.topPick && (
                    <div className="bg-primary/5 border border-primary/20 px-3 py-2.5 mb-4">
                      <div className="data-label text-primary text-[9px] mb-0.5">Top Pick</div>
                      <div className="text-foreground text-xs font-semibold">{car.topPick}</div>
                      <div className="text-muted-foreground text-[11px] mt-0.5">{car.topPickSub}</div>
                    </div>
                  )}

                  {/* Investment thesis */}
                  <p className="text-muted-foreground text-xs leading-relaxed mb-4 italic">
                    {car.investmentThesis}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {car.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-muted-foreground text-xs">Full analysis with IIV modelling</span>
                    <span className="flex items-center gap-1 text-primary text-xs font-semibold group-hover:gap-2 transition-all">
                      View Report <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile "All models" link */}
        <div className="mt-5 text-center sm:hidden">
          <Link href="/research" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
            All models & coming soon →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Latest Findings ──────────────────────────────────────────────────────────
function LatestFindings() {
  const activeCars812 = CARS_BY_RANK.filter((c) => !c.soldDate);
  const topCar812 = activeCars812.sort((a, b) => a.rank - b.rank)[0] ?? null;
  const preGpfCount = activeCars812.filter((c) => c.gpfStatus === "none").length;

  const activeCarsF8 = F8_CARS_BY_RANK.filter((c) => !c.soldDate);
  const spiderCount = activeCarsF8.filter((c) => (c as any).bodyStyle === "spider").length;

  const findings = [
    {
      icon: <Award size={16} className="text-primary" />,
      label: "812 Top Pick",
      title: topCar812 ? `${topCar812.year} ${topCar812.colour}` : "Giallo Triplo Strato",
      detail: topCar812
        ? `Score ${topCar812.totalScoreNorm.toFixed(1)}/100 · ${topCar812.atelierCar ? "Atelier commission · " : ""}Pre-GPF · +£${Math.round(topCar812.priceVariance / 1000)}k below IIV`
        : "Pre-GPF · +£40k below IIV",
      cta: "View 812 Analysis",
      route: "/812-superfast",
      accent: "border-primary/20 bg-primary/5",
      labelColor: "text-primary",
    },
    {
      icon: <Zap size={16} className="text-amber-600" />,
      label: "Key Finding: 812",
      title: `${preGpfCount} Pre-GPF Cars Available`,
      detail: `Only ${preGpfCount} of ${MARKET_STATS.activeListings} active listings are pre-GPF. These produce the unrestricted V12 exhaust note collectors covet and command a measurable premium.`,
      cta: "See Pre-GPF Cars",
      route: "/812-superfast",
      accent: "border-amber-200 bg-amber-50/50",
      labelColor: "text-amber-700",
    },
    {
      icon: <Target size={16} className="text-blue-600" />,
      label: "F8 Insight",
      title: `${spiderCount} Spider${spiderCount !== 1 ? "s" : ""} vs ${activeCarsF8.length - spiderCount} Coupés`,
      detail: `Spider variants command a 12–18% premium over equivalent Coupés. Best value is currently in the Coupé segment — full spec cars available below IIV.`,
      cta: "View F8 Analysis",
      route: "/f8-tributo",
      accent: "border-blue-200 bg-blue-50/50",
      labelColor: "text-blue-700",
    },
    {
      icon: <Clock size={16} className="text-emerald-700" />,
      label: "Market Timing",
      title: "Early 2026: Buy Window",
      detail: `Both models are at or near depreciation floor. The 812's V12 successor (12Cilindri) costs £500k+. The F8's SF90 hybrid successor costs £450k+. The value gap is widening.`,
      cta: "See Full Analysis",
      route: "/research",
      accent: "border-emerald-200 bg-emerald-50/50",
      labelColor: "text-emerald-700",
    },
  ];

  return (
    <section className="py-14 border-b border-border bg-muted/30">
      <div className="container">
        <div className="mb-8">
          <div className="data-label text-primary mb-2">Key Insights</div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
            What the data shows right now
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {findings.map((f) => (
            <Link key={f.title} href={f.route}>
              <div className={`group h-full border p-4 hover:border-primary/30 transition-all duration-200 cursor-pointer ${f.accent}`}>
                <div className="flex items-center gap-2 mb-3">
                  {f.icon}
                  <span className={`data-label text-[9px] ${f.labelColor}`}>{f.label}</span>
                </div>
                <h3 className="font-serif text-foreground font-bold text-sm mb-2 leading-tight">{f.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mb-4">{f.detail}</p>
                <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors mt-auto">
                  {f.cta} <ChevronRight size={11} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Methodology trust strip ──────────────────────────────────────────────────
function MethodologyStrip() {
  const pillars = [
    {
      icon: <BarChart2 size={18} className="text-primary" />,
      title: "20+ Scoring Variables",
      desc: "Every car scored across powertrain, provenance, specification, and market value — weighted from real auction data.",
    },
    {
      icon: <Shield size={18} className="text-primary" />,
      title: "Verified from Source",
      desc: "All specs confirmed directly from Ferrari Approved, PistonHeads, and AutoTrader. Never from third-party summaries.",
    },
    {
      icon: <TrendingUp size={18} className="text-primary" />,
      title: "IIV Modelling",
      desc: "Intrinsic Investment Value calculated from 47+ UK auction results using a hedonic pricing model.",
    },
    {
      icon: <Star size={18} className="text-primary" />,
      title: "15M+ Views Analysed",
      desc: "Influencer sentiment weighted by log₁₀(views × subscribers) across YouTube, X, TikTok, and specialist press.",
    },
  ];

  return (
    <section className="py-14 border-b border-border">
      <div className="container">
        <div className="text-center mb-10">
          <div className="data-label text-primary mb-2">The Methodology</div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
            Built from first principles
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p) => (
            <div key={p.title} className="bg-card border border-border p-5">
              <div className="w-9 h-9 bg-primary/8 border border-primary/20 flex items-center justify-center mb-4">
                {p.icon}
              </div>
              <h3 className="font-serif text-foreground font-bold text-sm mb-2">{p.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Coming soon strip ────────────────────────────────────────────────────────
function ComingSoon() {
  const upcoming = carLibrary.filter((c) => c.status !== "complete");

  return (
    <section className="py-10 border-b border-border bg-muted/20">
      <div className="container">
        <div className="flex items-center justify-between mb-5">
          <div className="data-label">In Preparation</div>
          <Link href="/research" className="text-xs text-primary hover:text-primary/80 font-medium">
            Full library →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {upcoming.map((car) => (
            <div
              key={car.id}
              className="flex items-center gap-2 px-3 py-2 bg-card border border-border text-muted-foreground text-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
              {car.make} {car.model}
              <span className="text-border">·</span>
              <span className="text-muted-foreground/60">{car.yearRange}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border py-10 bg-card">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-primary flex items-center justify-center">
                <TrendingUp size={11} className="text-primary-foreground" />
              </div>
              <span className="font-serif font-bold text-foreground text-sm">
                SupercarIQ
              </span>
            </div>
            <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
              Rigorous investment analysis for the UK collector car market. All reports are for informational purposes only and do not constitute financial advice.
            </p>
          </div>
          <div className="flex gap-12">
            <div>
              <div className="data-label mb-3">Reports</div>
              <div className="space-y-2">
                <Link href="/812-superfast" className="block text-muted-foreground text-xs hover:text-foreground transition-colors">Ferrari 812 Superfast</Link>
                <Link href="/f8-tributo" className="block text-muted-foreground text-xs hover:text-foreground transition-colors">Ferrari F8 Tributo</Link>
                <Link href="/research" className="block text-muted-foreground text-xs hover:text-foreground transition-colors">All Models</Link>
              </div>
            </div>
            <div>
              <div className="data-label mb-3">Tools</div>
              <div className="space-y-2">
                <Link href="/compare" className="block text-muted-foreground text-xs hover:text-foreground transition-colors">Compare Cars</Link>
                <Link href="/watchlist" className="block text-muted-foreground text-xs hover:text-foreground transition-colors">Watchlist</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border text-muted-foreground/60 text-xs">
          © 2026 SupercarIQ · Data refreshed March 2026 · Sources: Ferrari Approved UK, Hagerty Market Index, Bring a Trailer
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <MarketTicker />
      <Nav />
      <Hero />
      <LiveModels />
      <LatestFindings />
      <MethodologyStrip />
      <ComingSoon />
      <Footer />
    </div>
  );
}

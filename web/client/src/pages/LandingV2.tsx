/**
 * SupercarIQ — Home Screen V3 (Direction B: Editorial Magazine)
 *
 * Design language:
 * - Warm off-white background (CSS var --background ≈ #FAF8F5)
 * - Playfair Display serif headlines + DM Sans body (already loaded)
 * - Ferrari red accent (CSS var --primary ≈ #C8102E)
 * - Asymmetric hero: text left / full-bleed image right
 * - Clean white cards with warm borders
 * - Dark stats bar
 * - Live-only data (CARS_BY_RANK already pre-filtered at data layer)
 */
import { Link } from "wouter";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  TrendingUp, ChevronRight, ArrowRight, ArrowUpRight,
  CheckCircle2, AlertCircle, Award, Clock, BarChart2, Eye,
  ChevronDown, ChevronUp, Info, Target, Zap, BookOpen, Star
} from "lucide-react";
import { carLibrary } from "@/data/research";
import { GlobalNav } from "@/components/GlobalNav";
import { trpc } from "@/lib/trpc";

// ─── Model key mapping: carLibrary id → DB modelKey ──────────────────────────
const LIBRARY_ID_TO_MODEL_KEY: Record<string, string> = {
  "ferrari-812-superfast": "812-superfast",
  "ferrari-f8-tributo": "f8-tributo",
  "ferrari-812-gts": "812-gts",
  "ferrari-458-italia": "458-italia",
  "ferrari-488-gtb": "488-gtb",
  "ferrari-california-t": "california-t",
  "ferrari-portofino": "portofino",
  "ferrari-roma": "roma",
  "ferrari-488-pista": "488-pista",
  "ferrari-sf90-stradale": "sf90-stradale",
  "lamborghini-huracan-sto": "huracan-sto",
};

// ─── Per-model live stats derived from allActive query ────────────────────────
interface ModelLiveStats {
  listings: number;
  priceRange: string;
  bestGap: string;
  bestGapRaw: number;
  topScore: number;
  topPick: string | null;
  topPickGpfNone: boolean;
  topPickCcb: boolean;
  topPickMileage: number;
  preGpfCount: number;
  lastUpdated: string;
}

function useAllModelStats() {
  const { data: allActive, isLoading } = trpc.listings.allActive.useQuery();

  const modelStats = useMemo<Record<string, ModelLiveStats>>(() => {
    if (!allActive || allActive.length === 0) return {};

    const byModel: Record<string, typeof allActive> = {};
    for (const row of allActive) {
      if (!byModel[row.modelKey]) byModel[row.modelKey] = [];
      byModel[row.modelKey].push(row);
    }

    const result: Record<string, ModelLiveStats> = {};
    for (const [modelKey, rows] of Object.entries(byModel)) {
      const prices = rows.map(r => r.askingPrice).filter(Boolean);
      const minP = prices.length > 0 ? Math.round(Math.min(...prices) / 1000) : 0;
      const maxP = prices.length > 0 ? Math.round(Math.max(...prices) / 1000) : 0;
      const priceRange = prices.length > 0 ? `£${minP}k–£${maxP}k` : "—";

      const enriched = rows.filter(r => r.details && r.details.priceVariance != null);
      const gaps = enriched.map(r => r.details!.priceVariance!);
      const bestGapRaw = gaps.length > 0 ? Math.max(...gaps) : 0;
      const bestGap = bestGapRaw > 0 ? `+£${Math.round(bestGapRaw / 1000)}k` : (bestGapRaw < 0 ? `-£${Math.round(Math.abs(bestGapRaw) / 1000)}k` : "—");

      const scored = enriched.filter(r => r.details!.totalScore != null);
      scored.sort((a, b) => (b.details!.totalScore ?? 0) - (a.details!.totalScore ?? 0));
      const topRow = scored[0] ?? rows[0];
      const topScore = topRow?.details?.totalScore ?? 0;
      const topPick = topRow ? `${topRow.year ?? ""} ${topRow.colour ?? ""}`.trim() : null;
      const topPickGpfNone = topRow?.details?.gpfStatus === "none";
      const topPickCcb = topRow?.details?.ccb === true;
      const topPickMileage = topRow?.mileage ?? 0;

      const preGpfCount = rows.filter(r => r.details?.gpfStatus === "none").length;

      // Last updated: most recent lastSeenDate across all rows
      const dates = rows.map(r => r.lastSeenDate).filter(Boolean) as Date[];
      let lastUpdated = "recently";
      if (dates.length > 0) {
        const latest = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
        lastUpdated = latest.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      }

      result[modelKey] = { listings: rows.length, priceRange, bestGap, bestGapRaw, topScore, topPick, topPickGpfNone, topPickCcb, topPickMileage, preGpfCount, lastUpdated };
    }
    return result;
  }, [allActive]);

  const totalListings = useMemo(() => allActive?.length ?? 0, [allActive]);
  const globalLastUpdated = useMemo(() => {
    if (!allActive || allActive.length === 0) return "recently";
    const dates = allActive.map(r => r.lastSeenDate).filter(Boolean) as Date[];
    if (dates.length === 0) return "recently";
    const latest = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    return latest.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }, [allActive]);

  return { modelStats, totalListings, globalLastUpdated, isLoading };
}

// Helper to get live stats for a given carLibrary entry
function getModelStats(stats: Record<string, ModelLiveStats>, libraryId: string): ModelLiveStats | null {
  const modelKey = LIBRARY_ID_TO_MODEL_KEY[libraryId];
  return modelKey ? (stats[modelKey] ?? null) : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCountUp(target: number, duration = 1200, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

function AnimatedStat({ value, label, prefix = "", suffix = "", delay = 0 }: {
  value: number; label: string; prefix?: string; suffix?: string; delay?: number;
}) {
  const { ref, inView } = useInView(0.3);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(t);
    }
  }, [inView, delay]);
  const count = useCountUp(value, 1400, started);
  return (
    <div ref={ref} className="px-8 py-6 border-r border-white/10 last:border-0">
      <div className="font-serif text-4xl font-black text-white leading-none mb-1 tabular-nums">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-white/50 text-[10px] font-medium tracking-widest uppercase">{label}</div>
    </div>
  );
}

// ─── Live Ticker ──────────────────────────────────────────────────────────────
function LiveTicker({ modelStats, totalListings, globalLastUpdated }: { modelStats: Record<string, ModelLiveStats>; totalListings: number; globalLastUpdated: string }) {
  const s812 = modelStats["812-superfast"];
  const sF8 = modelStats["f8-tributo"];
  const s458 = modelStats["458-italia"];
  const s488 = modelStats["488-gtb"];
  const s812gts = modelStats["812-gts"];
  const sPortofino = modelStats["portofino"];
  const sRoma = modelStats["roma"];

  const items = [
    `812 Superfast — ${s812?.listings ?? 0} active UK listings · Best opportunity ${s812?.bestGap ?? "—"} below IIV`,
    `F8 Tributo / Spider — ${sF8?.listings ?? 0} active UK listings · Best opportunity ${sF8?.bestGap ?? "—"} below IIV`,
    `458 Italia — ${s458?.listings ?? 0} active UK listings · Last naturally aspirated V8 Ferrari · STRONG BUY`,
    `488 GTB / Pista — ${s488?.listings ?? 0} active UK listings · 488 Pista is the investment target`,
    `812 GTS — ${s812gts?.listings ?? 0} active UK listings · One of only 599 produced worldwide`,
    `Portofino / M — ${sPortofino?.listings ?? 0} active UK listings · Portofino M is the preferred spec`,
    `Roma / Spider — ${sRoma?.listings ?? 0} active UK listings · Last pure ICE Ferrari convertible`,
    `${carLibrary.filter(c => c.status === "complete").length} live analyses · ${totalListings} UK listings tracked · Refreshed ${globalLastUpdated}`,
    `Market verdict: 812 STRONG BUY · 458 STRONG BUY · F8 BUY · 488 BUY`,
  ];
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx((i) => (i + 1) % items.length); setVisible(true); }, 300);
    }, 4500);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="bg-foreground border-b border-foreground py-2 overflow-hidden">
      <div className="container flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-background/90 text-[10px] font-bold tracking-widest uppercase font-mono">Live</span>
        </div>
        <div className={`text-background/70 text-xs font-mono transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"} truncate`}>
          {items[idx]}
        </div>
      </div>
    </div>
  );
}

// ─── Hero: Asymmetric Split (Direction B) ─────────────────────────────────────
const SLIDE_DURATION_MS = 6000;

type HeroSlide = {
  id: string;
  bgImage: string;
  make: string;
  model: string;
  listingCount: number;
  topPickLabel: string;
  topPickSub: string;
  score: number;
  iivGap: number;
  verdict: string;
  verdictColor: string;
  verdictBg: string;
  problemStatement: string;
  ctaLabel: string;
  ctaHref: string;
};

function buildHeroSlides(modelStats: Record<string, ModelLiveStats>): HeroSlide[] {
  const slides: HeroSlide[] = [];
  const s812 = modelStats["812-superfast"];
  const sF8 = modelStats["f8-tributo"];
  const s458 = modelStats["458-italia"];

  if (s812 && s812.listings > 0) {
    slides.push({
      id: "ferrari-812",
      bgImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/ferrari-812-hero_dca01ee3.jpg",
      make: "Ferrari",
      model: "812 Superfast",
      listingCount: s812.listings,
      topPickLabel: s812.topPick ?? "Top Pick",
      topPickSub: [s812.topPickGpfNone ? "Pre-GPF" : "", s812.topPickCcb ? "CCB" : "", s812.topPickMileage > 0 ? `${s812.topPickMileage.toLocaleString()} mi` : ""].filter(Boolean).join(" · "),
      score: s812.topScore,
      iivGap: s812.bestGapRaw,
      verdict: "STRONG BUY",
      verdictColor: "text-emerald-700",
      verdictBg: "bg-emerald-50 border-emerald-200",
      problemStatement: `The last naturally aspirated V12 Ferrari. Every active UK listing scored, ranked, and valued against real auction data.`,
      ctaLabel: "See Full 812 Analysis",
      ctaHref: "/812-superfast",
    });
  }

  if (sF8 && sF8.listings > 0) {
    slides.push({
      id: "ferrari-f8",
      bgImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_f8tributo_dca01ee3.jpg",
      make: "Ferrari",
      model: "F8 Tributo / Spider",
      listingCount: sF8.listings,
      topPickLabel: sF8.topPick ?? "Top Pick",
      topPickSub: [sF8.topPickMileage > 0 ? `${sF8.topPickMileage.toLocaleString()} mi` : ""].filter(Boolean).join(" · "),
      score: sF8.topScore,
      iivGap: sF8.bestGapRaw,
      verdict: "BUY",
      verdictColor: "text-amber-700",
      verdictBg: "bg-amber-50 border-amber-200",
      problemStatement: `The last pure turbocharged V8 mid-engine Ferrari. ${sF8.listings} UK listings scored — Coupé and Spider ranked by investment value.`,
      ctaLabel: "See Full F8 Analysis",
      ctaHref: "/f8-tributo",
    });
  }

  if (s458 && s458.listings > 0) {
    slides.push({
      id: "ferrari-458",
      bgImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_2c52f925.jpg",
      make: "Ferrari",
      model: "458 Italia / Spider",
      listingCount: s458.listings,
      topPickLabel: s458.topPick ?? "Top Pick",
      topPickSub: [s458.topPickMileage > 0 ? `${s458.topPickMileage.toLocaleString()} mi` : ""].filter(Boolean).join(" · "),
      score: s458.topScore,
      iivGap: s458.bestGapRaw,
      verdict: "STRONG BUY",
      verdictColor: "text-emerald-700",
      verdictBg: "bg-emerald-50 border-emerald-200",
      problemStatement: `The last naturally aspirated V8 Ferrari. ${s458.listings} UK listings scored — the strongest long-term investment in the range.`,
      ctaLabel: "See Full 458 Analysis",
      ctaHref: "/458-italia",
    });
  }

  return slides;
}

function Hero({ modelStats, totalListings, globalLastUpdated }: { modelStats: Record<string, ModelLiveStats>; totalListings: number; globalLastUpdated: string }) {
  const slides = buildHeroSlides(modelStats);
  const [activeIdx, setActiveIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const [contentVisible, setContentVisible] = useState(true);

  const goTo = useCallback((idx: number) => {
    if (idx === activeIdx || transitioning) return;
    setContentVisible(false);
    setTimeout(() => {
      setTransitioning(true);
      setPrevIdx(activeIdx);
      setActiveIdx(idx);
      setProgress(0);
      progressRef.current = 0;
      lastTickRef.current = 0;
      setTimeout(() => { setTransitioning(false); setPrevIdx(null); setContentVisible(true); }, 700);
    }, 200);
  }, [activeIdx, transitioning]);

  useEffect(() => {
    if (paused) return;
    let running = true;
    const tick = (ts: number) => {
      if (!running) return;
      if (lastTickRef.current === 0) lastTickRef.current = ts;
      const delta = ts - lastTickRef.current;
      lastTickRef.current = ts;
      progressRef.current = Math.min(progressRef.current + (delta / SLIDE_DURATION_MS) * 100, 100);
      setProgress(progressRef.current);
      if (progressRef.current >= 100) {
        progressRef.current = 0; lastTickRef.current = 0; setProgress(0);
        const nextIdx = (activeIdx + 1) % slides.length;
        setContentVisible(false);
        setTimeout(() => {
          setTransitioning(true); setPrevIdx(activeIdx); setActiveIdx(nextIdx);
          setTimeout(() => { setTransitioning(false); setPrevIdx(null); setContentVisible(true); }, 700);
        }, 200);
      } else { rafRef.current = requestAnimationFrame(tick); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); lastTickRef.current = 0; };
  }, [paused, activeIdx, slides.length]);

  const slide = slides[activeIdx];
  const prevSlide = prevIdx !== null ? slides[prevIdx] : null;

  // Guard: don't render until we have at least one slide (data loading)
  if (!slide) {
    return (
      <section className="relative overflow-hidden border-b border-border" style={{ minHeight: 560 }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] min-h-[560px]">
          <div className="flex flex-col justify-end bg-background px-6 md:px-12 py-12 md:py-16">
            <div className="animate-pulse space-y-4">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-10 w-3/4 bg-muted rounded" />
              <div className="h-10 w-1/2 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-5/6 bg-muted rounded" />
            </div>
          </div>
          <div className="bg-muted min-h-[300px] lg:min-h-[560px]" />
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden border-b border-border"
      style={{ minHeight: 560 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border z-20">
        <div className="h-full bg-primary transition-none" style={{ width: `${progress}%` }} />
      </div>

      {/* Asymmetric grid: text left / image right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] min-h-[560px]">

        {/* ── Left: editorial text panel ── */}
        <div className="relative z-10 flex flex-col justify-end bg-background px-6 md:px-12 py-12 md:py-16">

          {/* Eyebrow */}
          <div className={`transition-all duration-300 ${contentVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
            <div className="flex items-center gap-2 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
                Live Analysis · {totalListings} Active UK Listings · {globalLastUpdated}
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-foreground leading-[1.08] mb-5">
              {slide.make}{" "}
              <em className="text-primary not-italic">{slide.model}</em>
            </h1>

            <p className="text-muted-foreground text-base leading-relaxed mb-7 max-w-md">
              {slide.problemStatement}
            </p>

            {/* IIV pull-quote — Direction B signature element */}
            <div className="border-l-[3px] border-primary pl-5 mb-7">
              <div className="font-serif text-4xl font-black text-foreground leading-none">
                +£{Math.round(slide.iivGap / 1000)}k
              </div>
              <div className="text-xs text-muted-foreground mt-1">best opportunity below implied investment value</div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Link href={slide.ctaHref}
                className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                {slide.ctaLabel} <ArrowRight size={14} />
              </Link>
              <Link href="/research"
                className="inline-flex items-center gap-2 px-5 py-3 bg-card border border-border text-foreground text-sm font-medium hover:border-primary/40 transition-colors">
                All Models <ChevronRight size={14} />
              </Link>
            </div>

            {/* Slide dots */}
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={`transition-all duration-300 ${i === activeIdx ? "w-6 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border hover:bg-muted-foreground"}`}
                  aria-label={`Go to ${s.model}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: full-bleed image with verdict badge ── */}
        <div className="relative overflow-hidden min-h-[300px] lg:min-h-0">
          {/* Background crossfade */}
          {prevSlide && (
            <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
              style={{ backgroundImage: `url(${prevSlide.bgImage})`, opacity: transitioning ? 0 : 1 }} />
          )}
          <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
            style={{ backgroundImage: `url(${slide.bgImage})`, opacity: transitioning && prevSlide ? 0 : 1 }} />
          <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent" />

          {/* Verdict badge — top right, Direction B style */}
          <div className={`absolute top-5 right-5 bg-card border shadow-lg px-4 py-3 ${slide.verdictBg} transition-all duration-300 ${contentVisible ? "opacity-100" : "opacity-0"}`}>
            <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Investment Verdict</div>
            <div className={`font-serif text-xl font-black ${slide.verdictColor}`}>{slide.verdict}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{slide.score.toFixed(1)} / 100 score</div>
          </div>

          {/* Top pick strip — bottom left */}
          <div className={`absolute bottom-5 left-5 right-5 transition-all duration-300 ${contentVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
            <div className="bg-background/95 backdrop-blur-sm border border-border px-4 py-3 inline-flex flex-col gap-0.5 max-w-xs">
              <div className="flex items-center gap-1.5">
                <Award size={10} className="text-primary" />
                <span className="text-[9px] font-bold tracking-widest text-primary uppercase">Current Top Pick</span>
              </div>
              <div className="font-serif text-sm font-bold text-foreground">{slide.topPickLabel}</div>
              <div className="text-xs text-muted-foreground">{slide.topPickSub}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Mission Strip ────────────────────────────────────────────────────────────
function MissionStrip({ totalListings }: { totalListings: number }) {
  const liveCount = carLibrary.filter(c => c.status === "complete").length;

  return (
    <section className="border-b border-border bg-background">
      <div className="container py-10 md:py-14">
        <div className="grid md:grid-cols-[2fr_1fr] gap-8 md:gap-16 items-start">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-primary uppercase mb-4">What is SupercarIQ?</div>
            <h2 className="font-serif text-2xl md:text-3xl font-black text-foreground leading-snug mb-4">
              The only independent, data-driven ranking of{" "}
              <span className="text-primary">{totalListings} Ferraris</span>{" "}
              for sale in the UK — updated daily.
            </h2>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-2xl mb-3">
              Most buyers spend weeks researching a Ferrari purchase, relying on gut feel and dealer claims.
              SupercarIQ does the work for you: we track every active UK listing, score each car across 20+
              investment criteria, and calculate its fair market value using real auction data. The result is
              a single, honest ranking that tells you which cars are genuinely underpriced — and which to avoid.
            </p>
            <p className="text-xs text-muted-foreground/70 italic">
              Built for serious buyers and investors. If you're spending £100k–£500k on a Ferrari, this is the research you need.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: <Eye size={14} className="text-primary" />, title: "Independent analysis", desc: "No dealer affiliations. No sponsored listings. Every score is computed from public data." },
              { icon: <BarChart2 size={14} className="text-primary" />, title: "Auction-calibrated values", desc: "IIV is built from 47+ real Hagerty, BaT, and Collecting Cars results — not guesswork." },
              { icon: <TrendingUp size={14} className="text-primary" />, title: `${liveCount} models tracked`, desc: "Ferrari, Lamborghini, and more — with new models added regularly." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="mt-0.5 w-6 h-6 bg-primary/10 flex items-center justify-center shrink-0">{item.icon}</div>
                <div>
                  <div className="text-sm font-semibold text-foreground mb-0.5">{item.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Model Grid — all live analyses ──────────────────────────────────────────
type ModelCard = {
  id: string;
  route: string;
  make: string;
  model: string;
  yearRange: string;
  image: string;
  verdict: string;
  verdictClass: string;
  listings: number;
  priceRange: string;
  bestGap: string;
  topScore: number;
  topPick: string | null;
  thesis: string;
  tags: string[];
};

function buildModelCards(modelStats: Record<string, ModelLiveStats>): ModelCard[] {
  // Build cards from carLibrary (complete models only) merged with live stats
  const liveModels = carLibrary.filter(c => c.status === "complete");
  const VERDICT_CLASS: Record<string, string> = {
    "strong-buy": "verdict-strong-buy",
    "buy": "verdict-buy",
    "consider": "verdict-consider",
    "avoid": "verdict-avoid",
    "pending": "verdict-consider",
  };
  const VERDICT_LABEL: Record<string, string> = {
    "strong-buy": "STRONG BUY",
    "buy": "BUY",
    "consider": "CONSIDER",
    "avoid": "AVOID",
    "pending": "PENDING",
  };

  return liveModels.map(car => {
    const live = getModelStats(modelStats, car.id);
    return {
      id: car.id,
      route: car.route,
      make: car.make,
      model: car.model,
      yearRange: car.yearRange,
      image: car.heroImage,
      verdict: VERDICT_LABEL[car.investmentGrade] ?? car.investmentGrade.toUpperCase(),
      verdictClass: VERDICT_CLASS[car.investmentGrade] ?? "verdict-consider",
      listings: live?.listings ?? car.listingCount,
      priceRange: live?.priceRange ?? car.priceRange,
      bestGap: live?.bestGap ?? (car.avgIIVGap > 0 ? `+£${Math.round(car.avgIIVGap / 1000)}k` : "—"),
      topScore: live?.topScore ?? car.topScore,
      topPick: live?.topPick ?? null,
      thesis: car.summary.split(".")[0] + ".",
      tags: car.tags,
    };
  }).filter(m => m.listings > 0);
}

function ModelGrid({ modelStats }: { modelStats: Record<string, ModelLiveStats> }) {
  const models = buildModelCards(modelStats);
  const { ref, inView } = useInView(0.1);

  return (
    <section id="models" className="py-14 md:py-20 border-b border-border">
      <div className="container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-primary uppercase mb-2">Live Analyses</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">Current Reports</h2>
          </div>
          <Link href="/research" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
            All models <ChevronRight size={12} />
          </Link>
        </div>

        <div ref={ref} className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {models.map((car, i) => (
            <div
              key={car.id}
              className={`transition-all duration-500 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <Link href={car.route}>
                <div className="group bg-card border border-border cursor-pointer overflow-hidden h-full hover:shadow-md transition-shadow">
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden bg-muted">
                    <img
                      src={car.image}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80"; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent" />
                    {/* Verdict badge */}
                    <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-2.5">
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${car.verdictClass}`}>
                        {car.verdict}
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-foreground/80 text-background">
                        {car.topScore.toFixed(1)}/100
                      </span>
                    </div>
                    {/* Best gap */}
                    <div className="absolute bottom-2.5 left-2.5">
                      <div className="flex items-center gap-1.5 bg-background/92 backdrop-blur-sm px-2.5 py-1 border border-border">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wide">Best Gap</span>
                        <span className="font-serif font-black text-emerald-600 text-xs">{car.bestGap}</span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">{car.make} · {car.yearRange}</div>
                    <h3 className="font-serif text-base font-bold text-foreground mb-1 leading-tight">{car.model}</h3>

                    {/* Top pick */}
                    {car.topPick && (
                      <div className="bg-primary/5 border border-primary/20 px-2.5 py-2 mb-3">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Award size={9} className="text-primary" />
                          <span className="text-[8px] font-bold tracking-widest text-primary uppercase">Top Pick</span>
                        </div>
                        <div className="text-foreground text-xs font-bold font-serif">{car.topPick}</div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-px bg-border mb-3">
                      {[
                        { label: "Listings", value: String(car.listings) },
                        { label: "Price Range", value: car.priceRange },
                      ].map((s) => (
                        <div key={s.label} className="bg-card px-2.5 py-2">
                          <div className="text-[8px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">{s.label}</div>
                          <div className="text-foreground text-xs font-bold font-mono">{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Thesis */}
                    <p className="text-muted-foreground text-[11px] leading-relaxed italic border-l border-border pl-2.5 mb-3">
                      {car.thesis}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {car.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground border border-border">{tag}</span>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-border">
                      <span className="text-muted-foreground text-[10px]">{car.listings} cars ranked</span>
                      <span className="flex items-center gap-1 text-primary text-xs font-semibold group-hover:gap-2 transition-all">
                        View Report <ArrowUpRight size={11} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-6 sm:hidden">
          <Link href="/research" className="flex items-center justify-center gap-2 py-3 border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            View All Models <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Key Insights ─────────────────────────────────────────────────────────────
function KeyInsights({ modelStats }: { modelStats: Record<string, ModelLiveStats> }) {
  const s812 = modelStats["812-superfast"];
  const preGpfCount = s812?.preGpfCount ?? 0;
  const totalListings812 = s812?.listings ?? 0;

  const insights = [
    {
      icon: <Award size={16} className="text-primary" />,
      category: "812 Top Pick",
      bg: "bg-primary/5 border-primary/20",
      title: s812?.topPick ?? "—",
      stat: s812 ? `${s812.topScore.toFixed(1)}/100` : "—",
      statLabel: "Investment Score",
      detail: s812 ? `${s812.topPickGpfNone ? "Pre-GPF · " : ""}${s812.topPickCcb ? "CCB · " : ""}${s812.bestGap} below its implied investment value` : "",
      cta: "View 812 Analysis", route: "/812-superfast",
    },
    {
      icon: <Zap size={16} className="text-amber-600" />,
      category: "812 Key Finding",
      bg: "bg-amber-50/60 border-amber-200",
      title: `Only ${preGpfCount} Pre-GPF Cars Left`,
      stat: `${preGpfCount}/${totalListings812}`,
      statLabel: "Pre-GPF Available",
      detail: "Pre-GPF cars produce the unrestricted V12 exhaust note collectors covet and command a measurable premium at auction.",
      cta: "See Pre-GPF Cars", route: "/812-superfast",
    },
    {
      icon: <Target size={16} className="text-blue-600" />,
      category: "F8 Insight",
      bg: "bg-blue-50/60 border-blue-200",
      title: "Coupé vs Spider: Buy the Coupé",
      stat: "12–18%",
      statLabel: "Spider Premium",
      detail: `Spider variants command a 12–18% premium over equivalent Coupés. Best value is in the Coupé segment — full-spec cars available below IIV.`,
      cta: "View F8 Analysis", route: "/f8-tributo",
    },
    {
      icon: <Clock size={16} className="text-emerald-700" />,
      category: "Market Timing",
      bg: "bg-emerald-50/60 border-emerald-200",
      title: "Early 2026: Buy Window Open",
      stat: "£500k+",
      statLabel: "12Cilindri Successor",
      detail: "Both the 812 and F8 are at or near depreciation floor. The V12 successor costs £500k+. The value gap is widening.",
      cta: "See Market Analysis", route: "/market",
    },
  ];

  const { ref, inView } = useInView(0.15);

  return (
    <section className="py-12 border-b border-border bg-muted/20">
      <div className="container">
        <div className="flex items-center gap-4 mb-8">
          <div className="text-[10px] font-bold tracking-widest text-primary uppercase">Key Insights</div>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div ref={ref} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {insights.map((ins, i) => (
            <div
              key={ins.category}
              className={`bg-card border ${ins.bg} p-4 transition-all duration-500 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-2 mb-3">
                {ins.icon}
                <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">{ins.category}</span>
              </div>
              <div className="font-serif text-base font-bold text-foreground mb-1 leading-tight">{ins.title}</div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="font-serif text-2xl font-black text-foreground">{ins.stat}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{ins.statLabel}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{ins.detail}</p>
              <Link href={ins.route} className="flex items-center gap-1 text-primary text-xs font-semibold hover:gap-2 transition-all">
                {ins.cta} <ArrowRight size={11} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: <Eye size={18} className="text-primary" />,
      title: "We score every listing",
      desc: "Every active UK listing is scored across 20+ criteria — powertrain, provenance, specification, and market value — weighted from 47+ real auction results.",
    },
    {
      n: "02",
      icon: <BarChart2 size={18} className="text-primary" />,
      title: "We calculate fair value",
      desc: "Our IIV (Implied Investment Value) model calculates what each car is truly worth using a hedonic pricing model calibrated against Hagerty, BaT, and Collecting Cars data.",
    },
    {
      n: "03",
      icon: <Award size={18} className="text-primary" />,
      title: "We rank the market",
      desc: "Every car is ranked by value gap — how far below (or above) its IIV it's priced. The #1 ranked car is the best investment opportunity in the UK market right now.",
    },
  ];
  const { ref, inView } = useInView(0.2);

  return (
    <section ref={ref} className="py-12 border-b border-border">
      <div className="container">
        <div className="flex items-center gap-4 mb-8">
          <div className="text-[10px] font-bold tracking-widest text-primary uppercase">How It Works</div>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid md:grid-cols-3 gap-0 border border-border">
          {steps.map((step, i) => (
            <div
              key={step.n}
              className={`p-6 border-b md:border-b-0 md:border-r border-border last:border-0 transition-all duration-500 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="font-serif text-4xl font-black text-border leading-none shrink-0">{step.n}</div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {step.icon}
                    <h3 className="font-serif text-foreground font-bold text-sm">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Methodology ──────────────────────────────────────────────────────────────
function Methodology() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { ref, inView } = useInView(0.1);

  const categories = [
    {
      id: "powertrain",
      weight: 25,
      label: "Powertrain & Emissions",
      icon: <Zap size={14} className="text-red-600" />,
      color: "text-red-600", bg: "bg-red-50", border: "border-red-200",
      desc: "GPF/OPF filter status is the single most important scoring variable. Pre-filter cars produce the unrestricted exhaust note collectors covet and command a 12–20% premium at auction.",
      criteria: ["GPF Status (wt:20)", "Engine Condition (wt:5)"],
    },
    {
      id: "provenance",
      weight: 25,
      label: "Provenance & History",
      icon: <BookOpen size={14} className="text-amber-600" />,
      color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200",
      desc: "Single-owner cars with full Ferrari service history and no accident record consistently outperform at auction. Provenance is the second most important variable.",
      criteria: ["Owner History (wt:8)", "Service History (wt:10)", "Accident Free (wt:7)"],
    },
    {
      id: "specification",
      weight: 40,
      label: "Specification",
      icon: <Star size={14} className="text-blue-600" />,
      color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200",
      desc: "Colour, interior, and carbon specification drive the largest spread in auction results. Rare colours and full carbon packs command 7–15% premiums.",
      criteria: ["Colour (wt:15)", "Carbon Pack (wt:12)", "Seats (wt:7)", "Interior (wt:6)"],
    },
    {
      id: "upgrades",
      weight: 20,
      label: "Mechanical Upgrades",
      icon: <Target size={14} className="text-emerald-600" />,
      color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200",
      desc: "CCB, MagneRide, and rear-wheel steering are the three mechanical upgrades that collectors consistently pay a premium for at auction.",
      criteria: ["Suspension Lift (wt:7)", "Carbon Ceramic Brakes (wt:5)", "MagneRide (wt:4)", "Rear-Wheel Steering (wt:4)"],
    },
    {
      id: "exclusivity",
      weight: 15,
      label: "Exclusivity",
      icon: <Award size={14} className="text-purple-600" />,
      color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200",
      desc: "Atelier-commissioned cars and limited editions trade at a consistent premium. Track Pack adds both collectibility and usability value.",
      criteria: ["Atelier Commission (wt:7)", "Track Pack (wt:4)", "Limited Edition (wt:4)"],
    },
    {
      id: "condition",
      weight: 16,
      label: "Condition & Value",
      icon: <BarChart2 size={14} className="text-slate-600" />,
      color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200",
      desc: "Mileage, warranty coverage, storage quality, and asking price relative to IIV complete the scoring picture.",
      criteria: ["Mileage (wt:6)", "Warranty (wt:8)", "Storage Quality (wt:2)", "Price vs IIV (wt:3)"],
    },
  ];

  return (
    <section id="methodology" className="py-14 border-b border-border">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-primary uppercase mb-2">The Methodology</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">Built from first principles</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg">
              18 scoring categories, 150 weighted points, calibrated against 47+ UK auction results.
              Every weight is evidence-based — not opinion.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info size={12} />
            <span>Click any category to see the criteria</span>
          </div>
        </div>

        <div ref={ref} className="space-y-2">
          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className={`border border-border bg-card transition-all duration-400 ${inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-7 h-7 flex items-center justify-center ${cat.bg} border ${cat.border} shrink-0`}>{cat.icon}</div>
                  <span className="font-medium text-sm text-foreground truncate">{cat.label}</span>
                </div>
                <div className="hidden sm:flex items-center gap-3 w-48 shrink-0">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden flex-1">
                    <div className={`h-full bg-primary transition-all duration-1000 ease-out`} style={{ width: inView ? `${cat.weight * 2.5}%` : "0%" }} />
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground w-12 text-right shrink-0">{cat.weight} pts</span>
                </div>
                <div className="shrink-0 text-muted-foreground">
                  {expanded === cat.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              {expanded === cat.id && (
                <div className={`px-5 pb-4 border-t border-border ${cat.bg}`}>
                  <p className="text-muted-foreground text-xs leading-relaxed mt-3 mb-3">{cat.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.criteria.map((c) => (
                      <span key={c} className={`px-2 py-0.5 text-[10px] font-mono border ${cat.border} ${cat.color} bg-card`}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link href="/812-superfast#framework"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
            See Full 812 Methodology <ArrowRight size={12} />
          </Link>
          <Link href="/f8-tributo#framework"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-muted-foreground text-xs font-semibold hover:text-foreground hover:border-foreground/40 transition-colors">
            See Full F8 Methodology <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Dark Stats Bar ────────────────────────────────────────────────────────────
function StatsBar({ totalListings }: { totalListings: number }) {
  const liveCount = carLibrary.filter(c => c.status === "complete").length;

  return (
    <section className="bg-foreground border-b border-foreground/20">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
          <AnimatedStat value={totalListings} label="Active UK Listings" delay={0} />
          <AnimatedStat value={liveCount} label="Live Analyses" delay={100} />
          <AnimatedStat value={20} label="Scoring Variables" suffix="+" delay={200} />
          <AnimatedStat value={47} label="Auction Results Used" suffix="+" delay={300} />
        </div>
      </div>
    </section>
  );
}

// ─── Coming Soon ──────────────────────────────────────────────────────────────
function ComingSoon() {
  const upcoming = carLibrary.filter(c => c.status === "coming-soon");
  if (upcoming.length === 0) return null;
  return (
    <section className="py-10 border-b border-border bg-muted/20">
      <div className="container">
        <div className="flex items-center justify-between mb-5">
          <div className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">In Preparation</div>
          <Link href="/research" className="text-xs text-primary hover:text-primary/80 font-medium">Full library →</Link>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {upcoming.map((car) => (
            <div key={car.id} className="flex items-center gap-2 px-3 py-2 bg-card border border-border text-muted-foreground text-xs">
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
  const liveModels = carLibrary.filter(c => c.status === "complete");
  return (
    <footer className="border-t border-border py-10 bg-card">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-primary" />
              <span className="font-serif font-bold text-foreground text-sm">SupercarIQ</span>
            </div>
            <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
              Rigorous investment analysis for the UK collector car market. All reports are for informational purposes only and do not constitute financial advice.
            </p>
          </div>
          <div className="flex gap-12">
            <div>
              <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase mb-3">Reports</div>
              <div className="space-y-2">
                {liveModels.slice(0, 6).map(m => (
                  <Link key={m.id} href={m.route} className="block text-muted-foreground text-xs hover:text-foreground transition-colors">
                    {m.make} {m.model}
                  </Link>
                ))}
                <Link href="/research" className="block text-primary text-xs hover:text-primary/80 transition-colors font-medium">All Models →</Link>
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase mb-3">Tools</div>
              <div className="space-y-2">
                <Link href="/compare" className="block text-muted-foreground text-xs hover:text-foreground transition-colors">Compare Cars</Link>
                <Link href="/watchlist" className="block text-muted-foreground text-xs hover:text-foreground transition-colors">Watchlist</Link>
                <Link href="/market" className="block text-muted-foreground text-xs hover:text-foreground transition-colors">Market Overview</Link>
                <Link href="/sold-archive" className="block text-muted-foreground text-xs hover:text-foreground transition-colors">Sold Archive</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border text-muted-foreground/60 text-xs">
          © 2026 SupercarIQ · Sources: Ferrari Approved UK, Hagerty Market Index, Bring a Trailer
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingV2() {
  const { modelStats, totalListings, globalLastUpdated, isLoading } = useAllModelStats();

  return (
    <div className="min-h-screen bg-background">
      <LiveTicker modelStats={modelStats} totalListings={totalListings} globalLastUpdated={globalLastUpdated} />
      <GlobalNav />
      <Hero modelStats={modelStats} totalListings={totalListings} globalLastUpdated={globalLastUpdated} />
      <MissionStrip totalListings={totalListings} />
      <ModelGrid modelStats={modelStats} />
      <KeyInsights modelStats={modelStats} />
      <StatsBar totalListings={totalListings} />
      <HowItWorks />
      <Methodology />
      <ComingSoon />
      <Footer />
    </div>
  );
}

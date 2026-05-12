/**
 * GenericCarDetail — shared car detail page for 458, 488, California T, Portofino, Roma
 * Layout matches F8CarDetail template: left sidebar (gallery + price + checklist + history),
 * right 2-col (verdict + strengths/weaknesses + radar + score bars + predictions + negotiation + spec).
 */
import React, { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocalWatchlist } from "@/hooks/useLocalWatchlist";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import type { EvidenceItem } from "@/components/ScoreBreakdown";
import { FullSpecSheet } from "@/components/FullSpecSheet";
import FinanceCalculator from "@/components/FinanceCalculator";
import { GlobalNav } from "@/components/GlobalNav";
import { isReportUnlocked, setUnlockedReport } from "@/components/DealerGate";

const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
const fmtK = (n: number) => `£${(n / 1000).toFixed(0)}k`;
const fmtMi = (n: number) => `${n.toLocaleString("en-GB")} mi`;
const isFA = (dt?: string) => !!dt && ["ferrari-approved", "ferrari approved", "franchise"].includes(dt.toLowerCase());

const VERDICT_LABELS: Record<string, string> = {
  "strong-buy": "STRONG BUY",
  "buy": "BUY",
  "consider": "CONSIDER",
  "avoid": "AVOID",
};
const VERDICT_CLASS: Record<string, string> = {
  "strong-buy": "verdict-strong-buy",
  "buy": "verdict-buy",
  "consider": "verdict-consider",
  "avoid": "verdict-avoid",
};

export interface CarDetailData {
  id: string;
  modelKey?: string;
  modelName: string;
  rank: number;
  year: number;
  colour: string;
  interior: string;
  mileage: number;
  askingPrice: number;
  iiv: number;
  priceVariance: number;
  priceVariancePct?: number;
  totalScoreNorm: number;
  investmentVerdict: string;
  verdictReason: string;
  keyStrengths?: string[];
  keyWeaknesses?: string[];
  dealer: string;
  dealerType: string;
  dealerUrl: string;
  dealerCarUrl?: string;
  listingUrl?: string;
  ownerCount: number;
  serviceHistory: boolean;
  checklist: Record<string, boolean>;
  equipment: { addedExtras: string[]; exterior: string[]; interior: string[]; audio: string[]; performance: string[]; safety: string[]; driversAssistance: string[]; illumination: string[]; paint: string[]; other: string[] };
  predictions: {
    roi5yr: number;
    roi10yr: number;
    base2031: number;
    optimistic2031: number;
    pessimistic2031: number;
    base2036: number;
    optimistic2036: number;
    pessimistic2036: number;
  };
  targetPrice: number;
  negotiationDiscountPct: number;
  images: string[];
  soldDate?: string;
  bodyStyle?: string;
  variant?: string;
  scores?: Record<string, number>;
}

interface Props {
  cars: CarDetailData[];
  modelName: string;
  reportRoute: string;
  reportLabel: string;
  weights: Record<string, number>;
  weightLabels: Record<string, string>;
  weightEvidence?: Record<string, EvidenceItem>;
  checklistLabels: Record<string, string>;
  expectedModelKey?: string;
}

// ─── Photo Gallery ────────────────────────────────────────────────────────────
function PhotoGallery({ images, alt, dealerUrl, listingUrl, dealerType }: { images: string[]; alt: string; dealerUrl?: string; listingUrl?: string; dealerType?: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const openLightbox = (idx: number) => { setLightboxIdx(idx); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);
  const prevImg = () => setLightboxIdx(i => (i - 1 + displayImages.length) % displayImages.length);
  const nextImg = () => setLightboxIdx(i => (i + 1) % displayImages.length);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevImg();
      if (e.key === "ArrowRight") nextImg();
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen]);

  const displayImages = images.length > 0 ? images : [
    "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/ferrari-812-hero_dca01ee3.jpg"
  ];

  const href = dealerUrl || listingUrl;

  return (
    <>
      <div className="space-y-2">
        <div className="rounded-md overflow-hidden bg-muted cursor-zoom-in relative group" style={{ height: "280px" }} onClick={() => openLightbox(activeIdx)}>
          <img src={displayImages[activeIdx]} alt={alt} className="w-full h-full object-cover transition-opacity duration-300" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-2 py-1 rounded">Click to expand</span>
          </div>
        </div>
        {displayImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {displayImages.map((src, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} className={`shrink-0 rounded overflow-hidden border-2 transition-all ${i === activeIdx ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`} style={{ width: 72, height: 48 }}>
                <img src={src} alt={`View ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full mt-1 py-2 px-4 border border-border bg-background hover:bg-muted/20 text-foreground text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            {(dealerType === "ferrari-approved" || dealerType === "Ferrari Approved" || dealerType === "franchise") ? "View on Ferrari Approved" : "View Dealer Listing"}
          </a>
        )}
      </div>
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={closeLightbox}>
          <button className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center z-10" onClick={closeLightbox}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {displayImages.length > 1 && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center z-10" onClick={(e) => { e.stopPropagation(); prevImg(); }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center z-10" onClick={(e) => { e.stopPropagation(); nextImg(); }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
          <div className="max-w-5xl max-h-screen w-full px-4 sm:px-16" onClick={(e) => e.stopPropagation()}>
            <img src={displayImages[lightboxIdx]} alt={`${alt} — photo ${lightboxIdx + 1}`} className="w-full max-h-[80vh] object-contain" />
            <p className="text-center text-white/60 text-sm mt-3">{lightboxIdx + 1} / {displayImages.length} — {alt}</p>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Watchlist Button ────────────────────────────────────────────────────────
function WatchlistButton({ car }: { car: CarDetailData }) {
  const { isWatched, toggle } = useLocalWatchlist();
  const watching = isWatched(car.id, car.modelName);
  return (
    <button
      onClick={() => {
        const nowWatching = toggle(car.id, car.modelName, car.askingPrice);
        toast.success(nowWatching ? "Added to watchlist" : "Removed from watchlist");
      }}
      className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 border text-sm font-medium transition-colors ${
        watching ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {watching ? "♥ Watching" : "♡ Add to Watchlist"}
    </button>
  );
}

// ─── Negotiation Brief Button ─────────────────────────────────────────────────
function NegotiationBriefButton({ car }: { car: CarDetailData }) {
  const [generating, setGenerating] = React.useState(false);
  const generateMutation = trpc.negotiation.generate.useMutation({
    onSuccess: (data) => {
      setGenerating(false);
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Negotiation brief generated", { description: "Opening in new tab…" });
      }
    },
    onError: () => {
      setGenerating(false);
      toast.error("Failed to generate brief — please try again");
    },
  });
  const discountPct = car.negotiationDiscountPct ?? 3;
  const openingOffer = Math.round((car.askingPrice * (1 - discountPct / 100)) / 500) * 500;
  return (
    <button
      onClick={() => {
        if (generating) return;
        setGenerating(true);
        generateMutation.mutate({
          carId: car.id,
          carModel: car.modelName,
          colour: car.colour,
          year: car.year,
          mileage: car.mileage,
          dealer: car.dealer,
          dealerType: car.dealerType,
          askingPrice: car.askingPrice,
          iiv: car.iiv,
          priceVariance: car.priceVariance,
          targetPrice: openingOffer,
          negotiationDiscountPct: discountPct,
          investmentVerdict: car.investmentVerdict,
          verdictReason: car.verdictReason,
          keyStrengths: car.keyStrengths ?? [],
          keyWeaknesses: car.keyWeaknesses ?? [],
          checklist: car.checklist as Record<string, boolean | string>,
        });
      }}
      disabled={generating}
      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
    >
      {generating ? (
        <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Generating Brief…</>
      ) : (
        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Generate Negotiation Brief</>
      )}
    </button>
  );
}

// ─── Price History Chart ──────────────────────────────────────────────────────
function PriceHistoryChart({ car }: { car: CarDetailData }) {
  const { data: history } = trpc.priceHistory.get.useQuery({ carId: car.id, carModel: car.modelName });
  if (!history || history.length < 2) {
    return (
      <div className="bg-card border border-border p-4 text-center">
        <div className="data-label mb-2">Price History</div>
        <p className="text-xs text-muted-foreground">Price history will appear here as data is collected over time. Current asking price: <span className="font-mono font-bold text-foreground">{fmt(car.askingPrice)}</span></p>
      </div>
    );
  }
  const chartData = [...history].reverse().map(h => ({
    date: new Date(h.snapshotDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    asking: h.askingPrice,
    iiv: h.iiv,
  }));
  return (
    <div className="bg-card border border-border p-4">
      <div className="data-label mb-3">Price History</div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="askGradGeneric" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.008 60)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "oklch(0.65 0.015 65)", fontSize: 10 }} />
          <YAxis tick={{ fill: "oklch(0.55 0.015 65)", fontSize: 10 }} tickFormatter={fmtK} width={42} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ background: "oklch(0.11 0.006 60)", border: "1px solid oklch(0.22 0.008 60)", fontSize: 12 }} formatter={(v: number, name: string) => [fmt(v), name === "asking" ? "Asking Price" : "IIV"]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="asking" name="Asking" stroke="oklch(0.72 0.12 75)" fill="url(#askGradGeneric)" strokeWidth={2} dot={{ r: 3 }} />
          <Area type="monotone" dataKey="iiv" name="IIV" stroke="oklch(0.65 0.15 145)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────
// ─── Inline Email Gate for General Dealer Car Detail Pages ──────────────────
function CarDetailGate({ modelKey, modelLabel, reportRoute, reportLabel, onUnlock }: {
  modelKey: string;
  modelLabel: string;
  reportRoute: string;
  reportLabel: string;
  onUnlock: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const submitMutation = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setUnlockedReport(modelKey);
      onUnlock();
      toast.success("Access granted!", {
        description: `You now have full access to all ${modelLabel} listings.`,
      });
    },
    onError: (err) => {
      toast.error("Something went wrong", { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    submitMutation.mutate({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, modelKey, modelLabel });
  };

  return (
    <div className="min-h-screen bg-background">
      <GlobalNav />
      <div className="container py-16 max-w-xl">
        {/* Back link */}
        <Link href={reportRoute} className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-flex items-center gap-1.5">
          ← Back to {reportLabel}
        </Link>
        <div className="mt-6 bg-card border border-border p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-foreground">Full listing details</div>
              <div className="text-xs text-muted-foreground mt-0.5">Free access — no subscription, no spam</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            This listing is from an independent dealer. Enter your details to unlock the full spec, investment score, negotiation brief, and price analysis — free.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="James Wilson"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="james@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-1.5">
                Phone <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="tel"
                placeholder="+44 7700 900000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={submitMutation.isPending || !name.trim() || !email.trim()}
              className="w-full py-2.5 px-6 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitMutation.isPending ? "Unlocking…" : "Unlock Full Details →"}
            </button>
            <p className="text-xs text-muted-foreground text-center">Free access · No subscription · Never shared</p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function GenericCarDetail({ cars, modelName, reportRoute, reportLabel, weights, weightLabels, weightEvidence, checklistLabels, expectedModelKey }: Props) {
  const params = useParams<{ id: string }>();
  const car = cars.find(c => String(c.id) === String(params.id));
  const [gateUnlocked, setGateUnlocked] = useState(() => {
    const key = car?.modelKey ?? expectedModelKey ?? "";
    return !key || isReportUnlocked(key);
  });

  // Re-check localStorage when car changes (e.g. navigation)
  useEffect(() => {
    const key = car?.modelKey ?? expectedModelKey ?? "";
    if (key) setGateUnlocked(isReportUnlocked(key));
  }, [car?.modelKey, expectedModelKey]);

  if (!car) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="font-serif text-4xl font-bold text-primary mb-4">404</div>
          <p className="text-muted-foreground mb-6">Car not found</p>
          <Link href={reportRoute} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">← Back to {reportLabel}</Link>
        </div>
      </div>
    );
  }

  // Cross-model contamination guard: if car has a modelKey and it doesn't match, show 404
  if (expectedModelKey && car.modelKey && car.modelKey !== expectedModelKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="font-serif text-4xl font-bold text-primary mb-4">404</div>
          <p className="text-muted-foreground mb-2">This car belongs to a different model page.</p>
          <p className="text-xs text-muted-foreground mb-6">Expected: {expectedModelKey} · Found: {car.modelKey}</p>
          <Link href={reportRoute} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">← Back to {reportLabel}</Link>
        </div>
      </div>
    );
  }

  // Gate: if car is from a general dealer and report is not unlocked, show email capture
  const isGeneralDealer = !isFA(car.dealerType);
  const modelKey = car.modelKey ?? expectedModelKey ?? "";
  if (isGeneralDealer && !gateUnlocked) {
    return (
      <CarDetailGate
        modelKey={modelKey}
        modelLabel={modelName}
        reportRoute={reportRoute}
        reportLabel={reportLabel}
        onUnlock={() => setGateUnlocked(true)}
      />
    );
  }

  const allCars = [...cars].sort((a, b) => a.rank - b.rank);
  const activeCars = allCars.filter(c => !c.soldDate);
  const carIdx = activeCars.findIndex(c => c.id === car.id);
  const prevCar = carIdx > 0 ? activeCars[carIdx - 1] : null;
  const nextCar = carIdx < activeCars.length - 1 ? activeCars[carIdx + 1] : null;

  const discountPct = car.negotiationDiscountPct ?? 3;
  const openingOffer = Math.round((car.askingPrice * (1 - discountPct / 100)) / 500) * 500;
  const priceVariancePct = car.priceVariancePct ?? (car.iiv > 0 ? ((car.priceVariance / car.iiv) * 100) : 0);

  // Radar data — use scores if available, otherwise derive from weights
  const radarData = car.scores
    ? Object.entries(weights).slice(0, 6).map(([key]) => ({
        subject: weightLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
        value: Math.round((car.scores![key] ?? 0) * 10),
        fullMark: 100,
      }))
    : Object.entries(weights).slice(0, 6).map(([key, weight]) => ({
        subject: weightLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
        value: Math.round(weight * (car.totalScoreNorm / 100)),
        fullMark: weight,
      }));

  // Score bar data — use individual scores if available, else derive from checklist
  const scoreData = Object.entries(weights).map(([key, weight]) => {
    let score: number;
    if (car.scores && car.scores[key] !== undefined) {
      score = car.scores[key];
    } else {
      // Derive from checklist: find a matching checklist key (case-insensitive partial match)
      const checklistKey = Object.keys(car.checklist).find(k =>
        k.toLowerCase().includes(key.toLowerCase().replace(/([A-Z])/g, '').slice(0, 4)) ||
        key.toLowerCase().includes(k.toLowerCase().slice(0, 4))
      );
      const checklistVal = checklistKey !== undefined ? car.checklist[checklistKey] : undefined;
      score = checklistVal === true ? 10 : checklistVal === false ? 0 : Math.round((car.totalScoreNorm / 100) * 10);
    }
    return {
      name: weightLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
      score,
      weight,
    };
  }).sort((a, b) => b.weight - a.weight);

  // Prediction chart
  const predChartData = [
    { year: "2026", base: car.askingPrice, optimistic: car.askingPrice, pessimistic: car.askingPrice },
    { year: "2028", base: Math.round(car.askingPrice * (1 + (car.predictions.roi5yr / 100) * 0.4)), optimistic: Math.round(car.askingPrice * (1 + (car.predictions.roi5yr / 100) * 0.6)), pessimistic: Math.round(car.askingPrice * (1 + (car.predictions.roi5yr / 100) * 0.1)) },
    { year: "2031", base: car.predictions.base2031, optimistic: car.predictions.optimistic2031, pessimistic: car.predictions.pessimistic2031 },
    { year: "2036", base: car.predictions.base2036, optimistic: car.predictions.optimistic2036, pessimistic: car.predictions.pessimistic2036 },
  ];

  const checklistEntries = Object.entries(car.checklist);

  // Build nav link helper
  const navLink = (c: CarDetailData) => `${reportRoute}/${c.id}`.replace("//", "/");

  return (
    <div className="min-h-screen bg-background">
      <GlobalNav />
      {/* Car navigation strip */}
      <nav className="sticky top-14 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href={reportRoute} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                ← {reportLabel}
              </Link>
              <span className="text-border">|</span>
              <span className="text-xs text-muted-foreground hidden sm:block">#{car.rank} of {activeCars.length}</span>
            </div>
            <div className="flex items-center gap-2">
              {prevCar && <Link href={navLink(prevCar)} className="text-xs px-2 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors">← #{prevCar.rank}</Link>}
              {nextCar && <Link href={navLink(nextCar)} className="text-xs px-2 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors">#{nextCar.rank} →</Link>}
            </div>
          </div>
        </div>
      </nav>

      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-serif text-3xl font-bold text-primary">#{car.rank}</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-sm ${VERDICT_CLASS[car.investmentVerdict]}`}>{VERDICT_LABELS[car.investmentVerdict]}</span>
            {car.bodyStyle === "spider" && <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300 rounded-sm">SPIDER</span>}
            {car.variant && <span className="px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary border border-primary/30 rounded-sm">{car.variant.toUpperCase()}</span>}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-black text-foreground mb-1">
            {car.year} Ferrari {modelName.replace(/^Ferrari\s+/i, "")}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
            <span>{car.colour}{car.interior && car.interior !== 'Unknown' && car.interior !== 'unknown' ? ` · ${car.interior}` : ''} · {fmtMi(car.mileage)}</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              {isFA(car.dealerType) ? (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-sm">MAIN DEALER</span>
              ) : (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-900/30 text-blue-700 border border-blue-800/30 rounded-sm">INDEPENDENT</span>
              )}
              {car.dealerUrl ? (
                <a href={car.dealerCarUrl || car.dealerUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors underline underline-offset-2">
                  {car.dealer && car.dealer !== 'Unknown' ? car.dealer : 'View Listing'}
                </a>
              ) : (
                <span>{car.dealer && car.dealer !== 'Unknown' ? car.dealer : 'Independent Dealer'}</span>
              )}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="space-y-4">
            <PhotoGallery images={car.images} alt={`${car.year} Ferrari ${modelName.replace(/^Ferrari\s+/i, "")} ${car.colour}`} dealerUrl={car.dealerUrl} listingUrl={car.listingUrl} dealerType={car.dealerType} />

            {/* Price panel */}
            <div className="bg-card border border-border p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="data-label text-xs">Asking Price</div>
                  <div className="font-mono text-2xl font-bold text-foreground">{fmt(car.askingPrice)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">listed price</div>
                </div>
                <div className="text-right">
                  <div className="data-label text-xs flex items-center justify-end gap-1">
                    IIV
                    <span title="Intrinsic Investment Value — our model's fair value estimate based on spec, provenance, and comparable auction results" className="inline-flex items-center justify-center w-3 h-3 rounded-full border border-muted-foreground/40 text-muted-foreground/60 text-[7px] font-bold cursor-help">?</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-primary">{fmtK(car.iiv)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">fair value</div>
                </div>
              </div>
              <div className={`font-mono text-sm font-bold ${car.priceVariance >= 0 ? "variance-positive" : "variance-negative"}`}>
                {car.priceVariance >= 0 ? "+" : ""}{fmt(car.priceVariance)} vs IIV ({priceVariancePct >= 0 ? "+" : ""}{priceVariancePct.toFixed(1)}%)
              </div>
              <div className="text-[10px] text-muted-foreground">
                {car.priceVariance >= 0 ? "Priced below fair value — buying opportunity" : "Priced above fair value — negotiate down"}
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <WatchlistButton car={car} />
                <NegotiationBriefButton car={car} />
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-card border border-border p-4">
              <div className="data-label mb-3">Buyer's Checklist</div>
              <div className="space-y-1.5">
                {checklistEntries.map(([key, val]) => {
                  const pass = val === true;
                  const label = checklistLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
                  return (
                    <div key={key} className={`flex items-center gap-2 text-sm ${pass ? "check-pass" : "check-fail"}`}>
                      <span className="font-mono font-bold w-4 text-center shrink-0">{pass ? "✓" : "✗"}</span>
                      <span className="text-foreground/80 text-xs">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <PriceHistoryChart car={car} />
          </div>

          {/* ── Right columns (2-col span) ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Investment Verdict */}
            <div className="bg-card border border-border p-5">
              <div className="data-label text-primary mb-2">Investment Verdict</div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{car.verdictReason}</p>
              {((car.keyStrengths && car.keyStrengths.length > 0) || (car.keyWeaknesses && car.keyWeaknesses.length > 0)) && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {car.keyStrengths && car.keyStrengths.length > 0 && (
                    <div>
                      <div className="data-label text-xs mb-2 text-emerald-600">Key Strengths</div>
                      <ul className="space-y-1">
                        {car.keyStrengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {car.keyWeaknesses && car.keyWeaknesses.length > 0 && (
                    <div>
                      <div className="data-label text-xs mb-2 text-red-600">Key Weaknesses</div>
                      <ul className="space-y-1">
                        {car.keyWeaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                            <span className="text-red-500 mt-0.5 shrink-0">✗</span>{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Radar + Score bars */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-card border border-border p-4">
                <div className="data-label mb-3 flex items-center gap-1.5">
                  Score Profile
                  <ScoreBreakdown
                    score={car.totalScoreNorm}
                    scores={car.scores}
                    weights={weights}
                    weightLabels={weightLabels}
                    weightEvidence={weightEvidence ?? {}}
                    iiv={car.iiv}
                    askingPrice={car.askingPrice}
                  />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="oklch(0.22 0.008 60)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "oklch(0.65 0.015 65)", fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "oklch(0.45 0.01 65)", fontSize: 8 }} />
                    <Radar name="Score" dataKey="value" stroke="oklch(0.72 0.12 75)" fill="oklch(0.72 0.12 75)" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border p-4">
                <div className="data-label mb-3">Score Breakdown</div>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                  {scoreData.map(item => (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-muted-foreground truncate">{item.name}</span>
                        <span className="font-mono font-bold text-foreground ml-2 shrink-0">{item.score.toFixed(0)}/100</span>
                      </div>
                      <div className="h-1.5 bg-muted">
                        <div className={`h-full transition-all ${item.score >= 60 ? 'bg-primary/70' : item.score >= 50 ? 'bg-amber-500/60' : 'bg-red-500/50'}`} style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Predictions */}
            <div className="bg-card border border-border p-5">
              <div className="data-label text-primary mb-3">5 &amp; 10-Year Price Predictions</div>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                {[
                  { label: "5-Year (2031)", base: car.predictions.base2031, opt: car.predictions.optimistic2031, pess: car.predictions.pessimistic2031, roi: car.predictions.roi5yr },
                  { label: "10-Year (2036)", base: car.predictions.base2036, opt: car.predictions.optimistic2036, pess: car.predictions.pessimistic2036, roi: car.predictions.roi10yr },
                ].map(p => (
                  <div key={p.label} className="border border-border p-3">
                    <div className="data-label text-xs mb-2">{p.label}</div>
                    <div className="space-y-1">
                      {[{ l: "Optimistic", v: p.opt, cls: "variance-positive" }, { l: "Base Case", v: p.base, cls: "text-foreground" }, { l: "Pessimistic", v: p.pess, cls: "text-muted-foreground" }].map(r => (
                        <div key={r.l} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{r.l}</span>
                          <span className={`font-mono font-bold ${r.cls}`}>{fmt(r.v)}</span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">Base ROI</span>
                        <span className="font-mono font-bold variance-positive">+{p.roi}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={predChartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="optGradGeneric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.008 60)" />
                  <XAxis dataKey="year" tick={{ fill: "oklch(0.65 0.015 65)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "oklch(0.55 0.015 65)", fontSize: 10 }} tickFormatter={fmtK} width={44} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "oklch(0.11 0.006 60)", border: "1px solid oklch(0.22 0.008 60)", fontSize: 12 }} formatter={(v: number, name: string) => [fmt(v), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="optimistic" name="Optimistic" stroke="oklch(0.72 0.12 75)" strokeWidth={1.5} fill="url(#optGradGeneric)" strokeDasharray="5 3" />
                  <Area type="monotone" dataKey="base" name="Base Case" stroke="oklch(0.65 0.15 145)" strokeWidth={2} fill="none" />
                  <Area type="monotone" dataKey="pessimistic" name="Pessimistic" stroke="oklch(0.50 0.08 27)" strokeWidth={1.5} fill="none" strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Negotiation Room */}
            <div className="bg-card border border-border p-5">
              <div className="data-label text-primary mb-3">Negotiation Room</div>
              <div className="grid sm:grid-cols-3 gap-4 mb-3">
                {[
                  { label: "Opening Offer", value: fmt(openingOffer), sub: `${discountPct}% below asking`, cls: "text-amber-700" },
                  { label: "Saving vs Asking", value: fmt(car.askingPrice - openingOffer), sub: "estimated saving", cls: "variance-positive" },
                  { label: "Dealer Type", value: isFA(car.dealerType) ? "Main Dealer" : "Independent", sub: isFA(car.dealerType) ? "Less flexible" : "More flexible", cls: "text-foreground" },
                ].map(s => (
                  <div key={s.label} className="border border-border p-3">
                    <div className="data-label text-xs mb-1">{s.label}</div>
                    <div className={`font-mono font-bold text-base ${s.cls}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isFA(car.dealerType)
                  ? `Ferrari Approved dealers typically accept ${discountPct}% below asking. Lead with a PPI request and emphasise the spec gaps to justify your position.`
                  : `Independent specialists are typically more flexible. ${discountPct}% below asking is a realistic opening. Reference the IIV and comparable Ferrari Approved listings.`
                }
              </p>
            </div>

            {/* Finance Calculator */}
            <FinanceCalculator
              vehiclePrice={car.askingPrice}
              iivPrice={car.iiv}
              carTitle={`${car.year} ${car.modelName}`}
            />

            {/* Full Specification */}
            <div className="bg-card border border-border p-5">
              <div className="flex items-baseline gap-3 mb-4">
                <div className="data-label text-primary">Full Specification</div>
              </div>
              <FullSpecSheet
                equipment={car.equipment}
                dealerCarUrl={car.dealerCarUrl || car.dealerUrl}
                carData={{
                  colour: car.colour,
                  colourCategory: (car as any).colourCategory as "special" | "desirable" | "standard",
                  interior: car.interior,
                  interiorCategory: (car as any).interiorCategory as "desirable" | "standard",
                  gpfStatus: (car as any).gpfStatus,
                  gpfYear: (car as any).gpfYear,
                  atelierCar: (car as any).atelierCar,
                  carbonCeramicBrakes: (car as any).carbonCeramicBrakes,
                  magnetorheologicalSuspension: (car as any).magnetorheologicalSuspension,
                  rearWheelSteering: (car as any).rearWheelSteering,
                  trackPack: (car as any).trackPack,
                  telemetryKit: (car as any).telemetryKit,
                  serviceHistory: (car.serviceHistory === true ? "full-ferrari" : car.serviceHistory === false ? "partial" : (car as any).serviceHistory) as "full-ferrari" | "partial" | "unknown",
                  accidentHistory: (car as any).accidentHistory,
                  ownerCount: car.ownerCount,
                  storageHistory: (car as any).storageHistory as "climate-controlled" | "standard" | "unknown",
                  warrantyType: (car as any).warrantyType as "ferrari-approved" | "dealer-warranty" | "third-party" | "none",
                  warrantyExpiry: (car as any).warrantyExpiry,
                  mileage: car.mileage,
                  year: car.year,
                  checklist: car.checklist,
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-between items-center border-t border-border pt-6">
          <Link href={reportRoute} className="text-sm text-primary hover:underline">← Back to {reportLabel}</Link>
          <div className="flex gap-2">
            {prevCar && <Link href={navLink(prevCar)} className="px-3 py-1.5 text-xs border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">← #{prevCar.rank} {prevCar.colour.split(" ")[0]}</Link>}
            {nextCar && <Link href={navLink(nextCar)} className="px-3 py-1.5 text-xs border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">#{nextCar.rank} {nextCar.colour.split(" ")[0]} →</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Named export alias for backward compatibility with adapter pages
export { GenericCarDetail };

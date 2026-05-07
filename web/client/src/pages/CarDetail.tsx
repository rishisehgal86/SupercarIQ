// @ts-nocheck
import React, { useState } from "react";
import { useParams, Link } from "wouter";
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from "recharts";
import { CARS, CARS_BY_RANK, WEIGHTS } from "@/data/cars";
import { WEIGHT_LABELS, WEIGHT_EVIDENCE } from "@/data/cars-weights";
import type { GenericCarSpec as CarSpec } from "@/data/genericCarSpec";
import { trpc } from "@/lib/trpc";
import { ListingPriceHistoryChart } from "@/components/ListingPriceHistoryChart";
import { isReportUnlocked, setUnlockedReport } from "@/components/DealerGate";
import { toast } from "sonner";
import { useLocalWatchlist } from "@/hooks/useLocalWatchlist";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { FullSpecSheet } from "@/components/FullSpecSheet";
import FinanceCalculator from "@/components/FinanceCalculator";

const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
const fmtK = (n: number) => `£${(n / 1000).toFixed(0)}k`;
const fmtMi = (n: number) => `${n.toLocaleString("en-GB")} mi`;

const VERDICT_LABELS: Record<CarSpec["investmentVerdict"], string> = {
  "strong-buy": "STRONG BUY",
  "buy": "BUY",
  "consider": "CONSIDER",
  "avoid": "AVOID",
};
const VERDICT_CLASS: Record<CarSpec["investmentVerdict"], string> = {
  "strong-buy": "verdict-strong-buy",
  "buy": "verdict-buy",
  "consider": "verdict-consider",
  "avoid": "verdict-avoid",
};

// ─── Car Photo Gallery with Lightbox ───────────────────────────────────────
function CarPhotoGallery({ images, alt, dealerUrl, dealerType }: { images: string[]; alt: string; dealerUrl?: string; dealerType?: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const openLightbox = (idx: number) => { setLightboxIdx(idx); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);
  const prevImg = () => setLightboxIdx(i => (i - 1 + images.length) % images.length);
  const nextImg = () => setLightboxIdx(i => (i + 1) % images.length);

  React.useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImg();
      if (e.key === 'ArrowRight') nextImg();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen]);

  return (
    <>
      <div className="space-y-2">
        <div className="rounded-md overflow-hidden bg-muted cursor-zoom-in relative group" style={{ height: '280px' }} onClick={() => openLightbox(activeIdx)}>
          <img src={images[activeIdx]} alt={alt} className="w-full h-full object-cover transition-opacity duration-300" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-2 py-1 rounded">Click to expand</span>
          </div>
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} className={`shrink-0 rounded overflow-hidden border-2 transition-all ${i === activeIdx ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ width: 72, height: 48 }}>
                <img src={src} alt={`View ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {dealerUrl && (
          <a href={dealerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full mt-1 py-2 px-4 border border-border bg-background hover:bg-muted/20 text-foreground text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            {dealerType === "ferrari-approved" ? "View on Ferrari Approved" : "View Dealer Listing"}
          </a>
        )}
      </div>
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={closeLightbox}>
          <button className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center transition-colors z-10" onClick={closeLightbox}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {images.length > 1 && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center transition-colors z-10" onClick={e => { e.stopPropagation(); prevImg(); }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center transition-colors z-10" onClick={e => { e.stopPropagation(); nextImg(); }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
          <div className="max-w-5xl max-h-screen w-full px-4 sm:px-16" onClick={e => e.stopPropagation()}>
            <img src={images[lightboxIdx]} alt={`${alt} — photo ${lightboxIdx + 1}`} className="w-full max-h-[80vh] object-contain" />
            <p className="text-center text-white/60 text-sm mt-3">{lightboxIdx + 1} / {images.length} — {alt}</p>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Watchlist Button ────────────────────────────────────────────────────────
function WatchlistButton({ car }: { car: CarSpec }) {
  const { isWatched, toggle } = useLocalWatchlist();
  const watched = isWatched(car.id, "812 Superfast");
  return (
    <button
      onClick={() => {
        const nowWatched = toggle(car.id, "812 Superfast", car.askingPrice);
        toast.success(nowWatched ? "Added to watchlist" : "Removed from watchlist");
      }}
      className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 border text-sm font-medium transition-colors ${
        watched ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {watched ? "♥ Watching" : "♡ Add to Watchlist"}
    </button>
  );
}

// ─── Negotiation Brief Button ────────────────────────────────────────────────
function NegotiationBriefButton({ car }: { car: CarSpec }) {
  const [generating, setGenerating] = useState(false);
  const generateBrief = trpc.negotiation.generate.useMutation({
    onSuccess: (data) => {
      setGenerating(false);
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Negotiation brief generated", { description: "Opening in new tab" });
      }
    },
    onError: () => { setGenerating(false); toast.error("Failed to generate brief"); },
  });

  const discountPct = car.negotiationDiscountPct ?? 3;
  const targetPrice = Math.round(Math.min(car.iiv, car.askingPrice) / 500) * 500;

  return (
    <button
      onClick={() => {
        if (generating) return;
        setGenerating(true);
        generateBrief.mutate({
          carId: car.id,
          carModel: "812 Superfast",
          colour: car.colour,
          year: car.year,
          mileage: car.mileage,
          dealer: car.dealer,
          dealerType: car.dealerType,
          askingPrice: car.askingPrice,
          iiv: car.iiv,
          priceVariance: car.priceVariance,
          targetPrice,
          negotiationDiscountPct: discountPct,
          investmentVerdict: car.investmentVerdict,
          verdictReason: car.verdictReason,
          keyStrengths: car.keyStrengths,
          keyWeaknesses: car.keyWeaknesses,
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

// ─── Price History Chart ────────────────────────────────────────────────────
function PriceHistoryChart({ carId, currentPrice }: { carId: number; currentPrice: number }) {
  const { data: history, isLoading } = trpc.priceHistory.get.useQuery({ carId, carModel: "812 Superfast" });

  if (isLoading) return (
    <div className="bg-card border border-border p-4 text-center">
      <div className="data-label mb-2">Price History</div>
      <div className="text-xs text-muted-foreground">Loading…</div>
    </div>
  );

  if (!history || history.length === 0) return (
    <div className="bg-card border border-border p-4 text-center">
      <div className="data-label mb-2">Price History</div>
      <p className="text-xs text-muted-foreground">No price changes recorded. Current asking price: <span className="font-mono font-bold text-foreground">{fmt(currentPrice)}</span></p>
    </div>
  );

  const chartData = history.map(h => ({
    date: new Date(h.snapshotDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    asking: h.askingPrice,
    iiv: h.iiv,
  }));
  const priceChange = history[history.length - 1].askingPrice - history[0].askingPrice;

  return (
    <div className="bg-card border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="data-label">Price History</div>
        <div className={`text-xs font-mono font-bold ${priceChange < 0 ? "text-green-600" : priceChange > 0 ? "text-red-600" : "text-muted-foreground"}`}>
          {priceChange === 0 ? "No change" : `${priceChange < 0 ? "▼" : "▲"} ${fmt(Math.abs(priceChange))}`}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.008 60)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "oklch(0.65 0.015 65)", fontSize: 10 }} />
          <YAxis tick={{ fill: "oklch(0.55 0.015 65)", fontSize: 10 }} tickFormatter={fmtK} width={42} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ background: "oklch(0.11 0.006 60)", border: "1px solid oklch(0.22 0.008 60)", fontSize: 12 }} formatter={(v: number, name: string) => [fmt(v), name === "asking" ? "Asking Price" : "IIV"]} />
          <Line type="monotone" dataKey="asking" stroke="oklch(0.72 0.12 75)" strokeWidth={2} dot={{ r: 3 }} name="asking" />
          <Line type="monotone" dataKey="iiv" stroke="oklch(0.65 0.15 145)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="iiv" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Negotiation Room ──────────────────────────────────────────────────────
function NegotiationRoom({ car }: { car: CarSpec }) {
  const discountPct = car.negotiationDiscountPct ?? 3;
  const openingOffer = Math.round((car.askingPrice * (1 - discountPct / 100)) / 500) * 500;
  const targetPrice = Math.round(Math.min(car.iiv, car.askingPrice) / 500) * 500;
  const walkAway = car.priceVariance >= 0
    ? Math.round((car.askingPrice * 1.01) / 500) * 500
    : Math.round(Math.min(car.iivHigh, car.askingPrice) / 500) * 500;

  // Use LLM-generated negotiation points if available, otherwise fall back to template logic
  const llmNeg = car.llmAnalysis?.negotiationPoints;

  const leveragePoints: { point: string }[] = llmNeg?.leverage?.length
    ? llmNeg.leverage.map(p => ({ point: p }))
    : (() => {
        const pts: { point: string }[] = [];
        if (car.priceVariance < 0) {
          pts.push({ point: `Say: "I've had this car independently valued against 47 comparable auction results and the fair market value comes out at ${fmt(car.iiv)}. Your asking price of ${fmt(car.askingPrice)} is ${Math.abs(Math.round(car.priceVariancePct))}% above that. I'm prepared to move quickly at ${fmt(targetPrice)} — can you meet me there?"` });
        }
        if (car.checklist.preGPF === false) {
          pts.push({ point: `Say: "This is a post-GPF car, which is a material negative for a collector purchase. Pre-GPF examples consistently achieve 8–12% more at specialist auction. I need to factor that into my offer."` });
        } else if (car.checklist.preGPF === "borderline") {
          pts.push({ point: `Say: "Can you confirm the exact build date? Cars built before September 2019 are pre-GPF, which is a significant factor in long-term value. If you can't confirm pre-GPF status in writing, I'd need a 5–8% reduction."` });
        }
        if (!car.checklist.lowMileage) {
          const milesOver = car.mileage - 10000;
          pts.push({ point: `Say: "At ${car.mileage.toLocaleString("en-GB")} miles this is ${milesOver.toLocaleString("en-GB")} miles above the low-mileage threshold. Hagerty data shows a 5–10% discount for cars in this mileage bracket."` });
        }
        if (car.ownerCount > 1) {
          pts.push({ point: `Say: "With ${car.ownerCount} previous owners, this car will always trade at a discount to single-owner examples at specialist auction. Single-owner provenance commands an 8–12% premium."` });
        }
        if (!car.checklist.fullFerrariServiceHistory) {
          pts.push({ point: `Say: "The service history isn't fully documented through the Ferrari dealer network. Full Ferrari service history commands a 5–8% premium. Without it, I can't justify the full asking price."` });
        }
        return pts;
      })();

  const strengthPoints: { point: string }[] = llmNeg?.dealerStrengths?.length
    ? llmNeg.dealerStrengths.map(p => ({ point: p }))
    : (() => {
        const pts: { point: string }[] = [];
        if (car.checklist.specialColour) pts.push({ point: `Be aware: ${car.colour} is a special or historic Ferrari colour commanding a documented 7–15% premium at auction. Focus your leverage on spec gaps instead.` });
        if (car.checklist.atelierCommission) pts.push({ point: `Be aware: this is a factory Atelier commission. Atelier cars command a 10–20% premium and are among the most sought-after 812s. The dealer has strong grounds to hold price.` });
        if (car.checklist.ferrariApproved) pts.push({ point: `Be aware: Ferrari Approved warranty adds genuine value — approximately 3–5% vs non-warranted examples. Ask exactly what the warranty covers, its expiry date, and whether it's transferable.` });
        return pts;
      })();

  const neutralPoints: { point: string }[] = llmNeg?.dueDiligence?.length
    ? llmNeg.dueDiligence.map(p => ({ point: p }))
    : [
        { point: `Before visiting: order a full HPI check. Confirm no outstanding finance, no write-off category, and no mileage discrepancy. Bring the printout to the viewing.` },
        { point: `Ask the dealer: "Do you have the original Certificato di Origine (build sheet)?" This document confirms the factory-ordered specification and is essential for future provenance.` },
        { point: `Insist on a pre-purchase inspection (PPI) by an independent Ferrari specialist before exchange — even on Ferrari Approved cars. Budget £400–£600. Any resistance from the dealer is a walk-away trigger.` },
        { point: `Walk-away triggers: (1) dealer refuses PPI access, (2) HPI flags outstanding finance or accident history, (3) build sheet unavailable, (4) dealer will not move below ${fmt(walkAway)} after all leverage points raised.` },
      ];

  return (
    <div className="bg-card border border-border p-5">
      <div className="data-label text-primary mb-3">Negotiation Room</div>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        {[
          { label: "Opening Offer", value: fmt(openingOffer), sub: `${discountPct}% below asking`, cls: "text-amber-700" },
          { label: "Target Price", value: fmt(targetPrice), sub: "IIV fair value", cls: "variance-positive" },
          { label: "Walk Away Above", value: fmt(walkAway), sub: "absolute maximum", cls: "text-red-700" },
        ].map(s => (
          <div key={s.label} className="border border-border p-3">
            <div className="data-label text-xs mb-1">{s.label}</div>
            <div className={`font-mono font-bold text-base ${s.cls}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
      {leveragePoints.length > 0 && (
        <div className="mb-4">
          <div className="data-label text-xs mb-2 text-red-700">Talking Points — Negotiate the Price Down</div>
          <div className="space-y-2">
            {leveragePoints.map((p, i) => (
              <div key={i} className="flex gap-3 p-3 border border-red-800/30 bg-red-950/20">
                <span className="font-mono font-bold text-red-500 text-sm shrink-0 mt-0.5">{i + 1}.</span>
                <p className="text-xs text-foreground/80 leading-relaxed">{p.point}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {strengthPoints.length > 0 && (
        <div className="mb-4">
          <div className="data-label text-xs mb-2 text-emerald-600">Dealer Strengths — Be Prepared</div>
          <div className="space-y-2">
            {strengthPoints.map((p, i) => (
              <div key={i} className="flex gap-3 p-3 border border-emerald-800/30 bg-emerald-950/20">
                <span className="font-mono font-bold text-emerald-500 text-sm shrink-0 mt-0.5">{i + 1}.</span>
                <p className="text-xs text-foreground/80 leading-relaxed">{p.point}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="data-label text-xs mb-2">Due Diligence &amp; Walk-Away Triggers</div>
        <div className="space-y-2">
          {neutralPoints.map((p, i) => (
            <div key={i} className="flex gap-3 p-3 border border-border bg-muted/20">
              <span className="font-mono font-bold text-muted-foreground text-sm shrink-0 mt-0.5">{i + 1}.</span>
              <p className="text-xs text-foreground/80 leading-relaxed">{p.point}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckItem({ pass, label }: { pass: boolean | "borderline" | "standard"; label: string }) {
  const cls = pass === true ? "check-pass" : pass === "borderline" ? "check-borderline" : pass === "standard" ? "" : "check-fail";
  const icon = pass === true ? "✓" : pass === "borderline" ? "~" : pass === "standard" ? "●" : "✗";
  return (
    <div className={`flex items-center gap-2 text-sm ${cls}`}>
      <span className={`font-mono font-bold w-4 text-center shrink-0 ${pass === "standard" ? "text-muted-foreground/40" : ""}`}>{icon}</span>
      <span className={`text-xs ${pass === "standard" ? "text-muted-foreground/50" : "text-foreground/80"}`}>{label}</span>
      {pass === "standard" && <span className="text-[9px] text-muted-foreground/35 font-mono tracking-wider ml-auto">STD</span>}
    </div>
  );
}

// ─── Inline Email Gate for 812 Superfast General Dealer Listings ─────────────
function CarDetailGate812({ carId, onUnlock }: { carId: string; onUnlock: () => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const submitMutation = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setUnlockedReport("812-superfast");
      onUnlock();
      toast.success("Access granted!", {
        description: "You now have full access to all 812 Superfast listings.",
      });
    },
    onError: (err) => {
      toast.error("Something went wrong", { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    submitMutation.mutate({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, modelKey: "812-superfast", modelLabel: "Ferrari 812 Superfast" });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container">
          <div className="flex items-center h-14">
            <Link href="/812-superfast" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to 812 Superfast
            </Link>
          </div>
        </div>
      </nav>
      <div className="container py-16 max-w-xl">
        <div className="bg-card border border-border p-8">
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
              <input type="text" placeholder="James Wilson" value={name} onChange={e => setName(e.target.value)} required
                className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input type="email" placeholder="james@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-1.5">
                Phone <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
              </label>
              <input type="tel" placeholder="+44 7700 900000" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <button type="submit" disabled={submitMutation.isPending || !name.trim() || !email.trim()}
              className="w-full py-2.5 px-6 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
              {submitMutation.isPending ? "Unlocking…" : "Unlock Full Details →"}
            </button>
            <p className="text-xs text-muted-foreground text-center">Free access · No subscription · Never shared</p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CarDetail() {
  const params = useParams<{ id: string }>();
  const car = CARS.find((c) => String(c.id) === String(params.id));
  const [gateUnlocked, setGateUnlocked] = useState(() => isReportUnlocked("812-superfast"));

  if (!car) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="font-serif text-4xl font-bold text-primary mb-4">404</div>
          <p className="text-muted-foreground mb-6">Car not found</p>
          <Link href="/812-superfast" className="text-primary hover:underline">← Back to analysis</Link>
        </div>
      </div>
    );
  }

  // Cross-model contamination guard
  if ((car as any).modelKey && (car as any).modelKey !== '812-superfast') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="font-serif text-4xl font-bold text-primary mb-4">404</div>
          <p className="text-muted-foreground mb-2">This car belongs to a different model page.</p>
          <p className="text-xs text-muted-foreground mb-6">Model: {(car as any).modelKey}</p>
          <Link href="/812-superfast" className="text-primary hover:underline">← Back to 812 Superfast</Link>
        </div>
      </div>
    );
  }

  // Gate: if car is from a general dealer and report is not unlocked, show email capture
  const isGeneralDealer = !car.dealerType || !["ferrari-approved", "ferrari approved", "franchise"].includes(car.dealerType.toLowerCase());
  if (isGeneralDealer && !gateUnlocked) {
    return <CarDetailGate812 carId={String(car.id)} onUnlock={() => setGateUnlocked(true)} />;
  }

  const activeCars = CARS_BY_RANK.filter(c => !c.soldDate);
  const carIdx = activeCars.findIndex(c => c.id === car.id);
  const prevCar = carIdx > 0 ? activeCars[carIdx - 1] : null;
  const nextCar = carIdx < activeCars.length - 1 ? activeCars[carIdx + 1] : null;

  const discountPct = car.negotiationDiscountPct ?? 3;
  const openingOffer = Math.round((car.askingPrice * (1 - discountPct / 100)) / 500) * 500;

  // Radar chart data
  const radarData = [
    { subject: "Engine", value: car.scores.engineCondition * 10 },
    { subject: "Provenance", value: Math.round(((car.scores.ownerHistory + car.scores.serviceHistory + car.scores.accidentFree) / 3) * 10) },
    { subject: "Spec", value: Math.round(((car.scores.colour + car.scores.carbonPack + car.scores.seats + car.scores.interior) / 4) * 10) },
    { subject: "Options", value: Math.round(((car.scores.suspensionLift + car.scores.carbonCeramicBrakes + car.scores.magnetorheological) / 3) * 10) },
    { subject: "Exclusivity", value: car.scores.atelier * 10 },
    { subject: "Condition", value: Math.round(((car.scores.mileage + car.scores.warranty + car.scores.storageQuality) / 3) * 10) },
  ];

  // Score bar data
  const scoreData = Object.entries(car.scores).map(([key, val]) => ({
    name: WEIGHT_LABELS[key as keyof typeof WEIGHTS] || key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
    score: val,
    weight: WEIGHTS[key as keyof typeof WEIGHTS] ?? 0,
  })).sort((a, b) => b.weight - a.weight);

  // Prediction chart
  const predChartData = [
    { year: "2026", base: car.askingPrice, optimistic: car.askingPrice, pessimistic: car.askingPrice },
    { year: "2028", base: Math.round(car.askingPrice * 1.08), optimistic: Math.round(car.askingPrice * 1.14), pessimistic: Math.round(car.askingPrice * 1.02) },
    { year: "2031", base: car.predictions.base2031, optimistic: car.predictions.optimistic2031, pessimistic: car.predictions.pessimistic2031 },
    { year: "2036", base: car.predictions.base2036, optimistic: car.predictions.optimistic2036, pessimistic: car.predictions.pessimistic2036 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/812-superfast" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                ← 812 Superfast Report
              </Link>
              <span className="text-border">|</span>
              <span className="text-xs text-muted-foreground hidden sm:block">#{car.rank} of {activeCars.length}</span>
            </div>
            <div className="flex items-center gap-2">
              {prevCar && <Link href={`/car/${prevCar.id}`} className="text-xs px-2 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors">← #{prevCar.rank}</Link>}
              {nextCar && <Link href={`/car/${nextCar.id}`} className="text-xs px-2 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors">#{nextCar.rank} →</Link>}
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
            {car.atelierCar && <span className="px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary border border-primary/30 rounded-sm">ATELIER</span>}
            {car.motExpired && <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-300 border border-red-700/60 rounded-sm">⚠ MOT EXPIRED</span>}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-black text-foreground mb-1">
            {car.year} Ferrari 812 Superfast
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
            <span>{car.colour}{car.interior && car.interior !== 'Unknown' && car.interior !== 'unknown' ? ` · ${car.interior}` : ''} · {fmtMi(car.mileage)}</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              {car.dealerType === "ferrari-approved" ? (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-sm">MAIN DEALER</span>
              ) : (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-900/30 text-blue-700 border border-blue-800/30 rounded-sm">INDEPENDENT</span>
              )}
              {car.dealerUrl ? (
                <a href={car.dealerCarUrl || car.dealerUrl} target="_blank" rel="noopener noreferrer"
                  className="hover:text-primary transition-colors underline underline-offset-2">
                  {car.dealer && car.dealer !== 'Unknown' ? car.dealer : 'View Listing'}
                </a>
              ) : (
                <span>{car.dealer && car.dealer !== 'Unknown' ? car.dealer : 'Independent Dealer'}</span>
              )}
              {car.dealerCity && <span className="text-muted-foreground/60">· {car.dealerCity}</span>}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="space-y-4">
            {car.images && car.images.length > 0 && (
              <CarPhotoGallery images={car.images} alt={`${car.year} Ferrari 812 Superfast ${car.colour}`} dealerUrl={car.dealerUrl} dealerType={car.dealerType} />
            )}

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
                {car.priceVariance >= 0 ? "+" : ""}{fmt(car.priceVariance)} vs IIV ({car.priceVariancePct >= 0 ? "+" : ""}{car.priceVariancePct.toFixed(1)}%)
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
                <CheckItem pass={car.checklist.preGPF} label="Pre-GPF (no particulate filter)" />
                <CheckItem pass={car.checklist.lowMileage} label="Low mileage (under 10,000 mi)" />
                <CheckItem pass={car.checklist.fullFerrariServiceHistory} label="Full Ferrari service history" />
                <CheckItem pass={car.checklist.cleanHpiAccidentFree} label="Accident-free record" />
                <CheckItem pass={car.checklist.carbonPack} label="Carbon pack fitted" />
                <CheckItem pass={car.checklist.daytonaSeats} label="Daytona / racing seats" />
                <CheckItem pass={car.checklist.suspensionLift} label="Front suspension lift" />
                {/* Standard equipment — always fitted on all 812 Superfasts */}
                <CheckItem pass="standard" label="Carbon ceramic brakes (CCB)" />
                <CheckItem pass="standard" label="MagneRide adaptive suspension" />
                <CheckItem pass="standard" label="Rear-wheel steering" />
                <CheckItem pass={car.checklist.specialColour} label="Desirable / special-order colour" />
                <CheckItem pass={car.checklist.ferrariApproved} label="Ferrari Approved warranty" />
                <CheckItem pass={car.checklist.atelierCommission} label="Atelier bespoke commission" />
              </div>
              {/* LLM-generated checklist notes */}
              {car.llmAnalysis?.checklistNotes && (
                <div className="mt-4 space-y-2">
                  {[
                    { key: 'gpfNote', label: 'GPF Status' },
                    { key: 'mileageNote', label: 'Mileage' },
                    { key: 'serviceHistoryNote', label: 'Service History' },
                    { key: 'colourNote', label: 'Colour' },
                    { key: 'optionsNote', label: 'Options' },
                  ].map(({ key, label }) => {
                    const note = car.llmAnalysis!.checklistNotes[key as keyof typeof car.llmAnalysis.checklistNotes];
                    if (!note) return null;
                    return (
                      <details key={key} className="border border-border/50 rounded">
                        <summary className="px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1.5">
                          <span className="text-primary text-[10px]">▸</span>{label}
                        </summary>
                        <p className="px-3 pb-3 text-xs text-foreground/70 leading-relaxed">{note}</p>
                      </details>
                    );
                  })}
                </div>
              )}
              {/* Must-verify items from LLM */}
              {car.llmAnalysis?.buyersBrief?.mustVerify?.length ? (
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="data-label text-xs mb-2 text-amber-600">Must Verify Before Purchase</div>
                  <ul className="space-y-1.5">
                    {car.llmAnalysis.buyersBrief.mustVerify.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <span className="text-amber-500 mt-0.5 shrink-0 font-bold">{i + 1}.</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : car.checklist.preGPF === "borderline" ? (
                <div className="mt-3 p-3 border border-amber-500/30 bg-amber-500/10">
                  <p className="text-xs text-amber-700"><strong>GPF Note:</strong> 2019-registered car. Build date must be confirmed with the dealer — cars built before September 2019 are pre-GPF.</p>
                </div>
              ) : null}
              {/* Inspection focus from LLM */}
              {car.llmAnalysis?.buyersBrief?.inspectionFocus?.length ? (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="data-label text-xs mb-2 text-blue-600">Inspection Focus Areas</div>
                  <ul className="space-y-1.5">
                    {car.llmAnalysis.buyersBrief.inspectionFocus.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <span className="text-blue-500 mt-0.5 shrink-0">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <PriceHistoryChart carId={car.id} currentPrice={car.askingPrice} />
            {/* DB-driven live price tracking */}
            <div className="bg-card border border-border p-4 mt-4">
              <div className="data-label text-primary mb-3">Live Price Tracking</div>
              <ListingPriceHistoryChart
                listingId={String(car.id)}
                iiv={car.iiv}
                currentPrice={car.askingPrice}
              />
            </div>
          </div>

          {/* ── Right columns (2-col span) ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Investment Verdict */}
            <div className="bg-card border border-border p-5">
              <div className="data-label text-primary mb-2">Investment Verdict</div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {car.llmAnalysis?.verdictNarrative || car.verdictReason}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
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
                <div>
                  <div className="data-label text-xs mb-2 text-red-600">Key Weaknesses</div>
                  <ul className="space-y-1">
                    {(car.keyWeaknesses.length > 0
                      ? car.keyWeaknesses
                      : car.llmAnalysis?.negotiationPoints?.leverage?.slice(0, 3) ?? []
                    ).map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <span className="text-red-500 mt-0.5 shrink-0">✗</span>{w}
                      </li>
                    ))}
                    {car.keyWeaknesses.length === 0 && !car.llmAnalysis?.negotiationPoints?.leverage?.length && (
                      <li className="text-xs text-muted-foreground italic">No significant weaknesses identified</li>
                    )}
                  </ul>
                </div>
              </div>
              {/* LLM-generated market comparison */}
              {car.llmAnalysis?.buyersBrief?.marketComparison && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="data-label text-xs mb-2 text-primary">Market Position</div>
                  <p className="text-xs text-foreground/70 leading-relaxed">{car.llmAnalysis.buyersBrief.marketComparison}</p>
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
                    weights={WEIGHTS}
                    weightLabels={WEIGHT_LABELS}
                    weightEvidence={WEIGHT_EVIDENCE}
                    iiv={car.iiv}
                    iivLow={car.iivLow}
                    iivHigh={car.iivHigh}
                    iivConfidence={car.iivConfidence as "high" | "medium" | "low"}
                    askingPrice={car.askingPrice}
                    modelKey="812-superfast"
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
                    <linearGradient id="optGrad812" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="oklch(0.72 0.12 75)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.008 60)" />
                  <XAxis dataKey="year" tick={{ fill: "oklch(0.65 0.015 65)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "oklch(0.55 0.015 65)", fontSize: 10 }} tickFormatter={fmtK} width={44} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "oklch(0.11 0.006 60)", border: "1px solid oklch(0.22 0.008 60)", fontSize: 12 }} formatter={(v: number, name: string) => [fmt(v), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="optimistic" name="Optimistic" stroke="oklch(0.72 0.12 75)" strokeWidth={1.5} fill="url(#optGrad812)" strokeDasharray="5 3" />
                  <Area type="monotone" dataKey="base" name="Base Case" stroke="oklch(0.65 0.15 145)" strokeWidth={2} fill="none" />
                  <Area type="monotone" dataKey="pessimistic" name="Pessimistic" stroke="oklch(0.50 0.08 27)" strokeWidth={1.5} fill="none" strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Negotiation Room */}
            <NegotiationRoom car={car} />

            {/* Finance Calculator */}
            <FinanceCalculator
              vehiclePrice={car.askingPrice}
              iivPrice={car.iiv}
              carTitle={`${car.year} Ferrari 812 Superfast`}
            />

            {/* Full Specification */}
            <div className="bg-card border border-border p-5">
              <div className="flex items-baseline gap-3 mb-4">
                <div className="data-label text-primary">Full Specification</div>
              </div>
              <FullSpecSheet
                equipment={car.equipment}
                dealerCarUrl={car.dealerCarUrl}
                carData={{
                  colour: car.colour,
                  colourCategory: car.colourCategory as "special" | "desirable" | "standard",
                  interior: car.interior,
                  interiorCategory: car.interiorCategory as "desirable" | "standard",
                  gpfStatus: car.gpfStatus,
                  gpfYear: car.gpfYear,
                  atelierCar: car.atelierCar,
                  carbonCeramicBrakes: car.carbonCeramicBrakes,
                  magnetorheologicalSuspension: car.magnetorheologicalSuspension,
                  rearWheelSteering: car.rearWheelSteering,
                  trackPack: car.trackPack,
                  telemetryKit: car.telemetryKit,
                  serviceHistory: car.serviceHistory as "full-ferrari" | "partial" | "unknown",
                  accidentHistory: car.accidentHistory,
                  ownerCount: car.ownerCount,
                  storageHistory: car.storageHistory as "climate-controlled" | "standard" | "unknown",
                  warrantyType: car.warrantyType as "ferrari-approved" | "dealer-warranty" | "third-party" | "none",
                  warrantyExpiry: car.warrantyExpiry,
                  mileage: car.mileage,
                  year: car.year,
                  checklist: car.checklist,
                }}
                dealerOptions={car.dealerOptions}
                llmSpec={car.llmSpec}
              />
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-between items-center border-t border-border pt-6">
          <Link href="/812-superfast" className="text-sm text-primary hover:underline">← Back to 812 Superfast Report</Link>
          <div className="flex gap-2">
            {prevCar && <Link href={`/car/${prevCar.id}`} className="px-3 py-1.5 text-xs border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">← #{prevCar.rank} {prevCar.colour.split(" ")[0]}</Link>}
            {nextCar && <Link href={`/car/${nextCar.id}`} className="px-3 py-1.5 text-xs border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">#{nextCar.rank} {nextCar.colour.split(" ")[0]} →</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}

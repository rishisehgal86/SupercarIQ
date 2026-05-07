import { GlobalNav } from "@/components/GlobalNav";
import React from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { CARS } from "@/data/cars";
import { CARS_F8 } from "@/data/f8tributo";
import { useLocalWatchlist } from "@/hooks/useLocalWatchlist";
import type { WatchlistEntry } from "@/hooks/useLocalWatchlist";

const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
const fmtMi = (n: number) => `${n.toLocaleString("en-GB")} mi`;

// ─── Helpers to look up car data by id + model ───────────────────────────────
function getCarData(carId: number | string, carModel: string) {
  if (carModel === "812 Superfast") {
    const car = CARS.find(c => c.id === carId);
    if (!car) return null;
    return {
      id: car.id,
      model: "812 Superfast",
      year: car.year,
      colour: car.colour,
      mileage: car.mileage,
      dealer: car.dealer,
      askingPrice: car.askingPrice,
      iiv: car.iiv,
      priceVariance: car.priceVariance,
      investmentVerdict: car.investmentVerdict,
      soldDate: car.soldDate,
      detailUrl: `/car/${car.id}`,
      images: car.images,
    };
  }
  if (carModel === "F8 Tributo" || carModel === "F8 Spider") {
    const car = CARS_F8.find(c => c.id === carId);
    if (!car) return null;
    return {
      id: car.id,
      model: car.model,
      year: car.year,
      colour: car.colour,
      mileage: car.mileage,
      dealer: car.dealer,
      askingPrice: car.askingPrice,
      iiv: car.iiv,
      priceVariance: car.priceVariance,
      investmentVerdict: car.investmentVerdict,
      soldDate: car.soldDate,
      detailUrl: `/f8/${car.id}`,
      images: car.images,
    };
  }
  return null;
}

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

// ─── Watchlist Card ───────────────────────────────────────────────────────────
function WatchlistCard({ item, onRemove }: {
  item: WatchlistEntry;
  onRemove: () => void;
}) {
  const car = getCarData(item.carId, item.carModel);
  const priceChange = car ? car.askingPrice - item.askingPriceAtAdd : 0;

  return (
    <div className={`bg-card border border-border overflow-hidden ${car?.soldDate ? 'opacity-60' : ''}`}>
      {/* Car image */}
      {car?.images && car.images.length > 0 && (
        <div className="h-36 overflow-hidden bg-muted">
          <img
            src={car.images[0]}
            alt={`${car.year} Ferrari ${car.model}`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-4">
        {car ? (
          <>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm ${VERDICT_CLASS[car.investmentVerdict] ?? ""}`}>
                    {VERDICT_LABELS[car.investmentVerdict] ?? car.investmentVerdict}
                  </span>
                  {car.soldDate && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 rounded-sm">SOLD</span>}
                </div>
                <h3 className="font-serif font-bold text-foreground">{car.year} Ferrari {car.model}</h3>
                <p className="text-xs text-muted-foreground">{car.colour} · {fmtMi(car.mileage)}</p>
                <p className="text-xs text-muted-foreground">{car.dealer}</p>
              </div>
              <button
                onClick={onRemove}
                className="text-muted-foreground hover:text-red-700 transition-colors p-1 shrink-0"
                title="Remove from watchlist"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Price info */}
            <div className="grid grid-cols-2 gap-px bg-border mb-3">
              <div className="bg-card/80 p-2">
                <div className="data-label text-[10px]">Current Ask</div>
                <div className="font-mono text-sm font-bold text-foreground">{fmt(car.askingPrice)}</div>
              </div>
              <div className="bg-card/80 p-2">
                <div className="data-label text-[10px]">IIV</div>
                <div className="font-mono text-sm font-bold text-primary">{fmt(car.iiv)}</div>
              </div>
              <div className="bg-card/80 p-2">
                <div className="data-label text-[10px]">When Added</div>
                <div className="font-mono text-sm font-bold text-muted-foreground">{fmt(item.askingPriceAtAdd)}</div>
              </div>
              <div className="bg-card/80 p-2">
                <div className="data-label text-[10px]">Price Change</div>
                <div className={`font-mono text-sm font-bold ${priceChange > 0 ? "variance-negative" : priceChange < 0 ? "variance-positive" : "text-muted-foreground"}`}>
                  {priceChange === 0 ? "No change" : `${priceChange > 0 ? "+" : ""}${fmt(priceChange)}`}
                </div>
              </div>
            </div>

            {/* vs IIV */}
            <div className={`text-xs font-mono font-medium mb-3 ${car.priceVariance >= 0 ? "variance-positive" : "variance-negative"}`}>
              {car.priceVariance >= 0 ? "+" : ""}{fmt(car.priceVariance)} vs IIV
            </div>

            <Link href={car.detailUrl} className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              View Full Analysis →
            </Link>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Car data unavailable</p>
            <p className="text-xs text-muted-foreground mt-1">{item.carModel} #{item.carId}</p>
          </div>
        )}
      </div>
      <div className="px-4 pb-3">
        <div className="data-label text-[10px]">Added {new Date(item.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Watchlist() {
  const { entries, remove } = useLocalWatchlist();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <GlobalNav />

      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="data-label text-primary mb-2">SupercarIQ · Personal Watchlist</div>
          <h1 className="font-serif text-3xl md:text-4xl font-black text-foreground mb-2">My Watchlist</h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Track cars you're interested in. We show you how the asking price has moved since you added each car, and how it compares to the IIV at any time. Your watchlist is saved in your browser.
          </p>
        </div>

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="font-serif text-5xl mb-4 text-muted-foreground">♡</div>
            <h2 className="font-serif text-xl font-bold text-foreground mb-2">Your watchlist is empty</h2>
            <p className="text-sm text-muted-foreground mb-6">Browse the reports and click "Add to Watchlist" on any car you want to track.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/812-superfast" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Browse 812 Superfast →
              </Link>
              <Link href="/f8-tributo" className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-sm font-medium text-foreground hover:border-primary transition-colors">
                Browse F8 Tributo →
              </Link>
            </div>
          </div>
        )}

        {/* Watchlist grid */}
        {entries.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="data-label text-xs">{entries.length} car{entries.length !== 1 ? "s" : ""} watched</div>
              <div className="flex gap-2">
                <Link href="/812-superfast" className="text-xs px-2 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors">+ 812 Superfast</Link>
                <Link href="/f8-tributo" className="text-xs px-2 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors">+ F8 Tributo</Link>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {entries.map(item => (
                <WatchlistCard
                  key={`${item.carModel}-${item.carId}`}
                  item={item}
                  onRemove={() => {
                    remove(item.carId, item.carModel);
                    toast.success("Removed from watchlist");
                  }}
                />
              ))}
            </div>

            {/* Summary stats */}
            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {(() => {
                const cars = entries.map(w => getCarData(w.carId, w.carModel)).filter(Boolean);
                const underpriced = cars.filter(c => c && c.priceVariance >= 0).length;
                const totalVariance = cars.reduce((s, c) => s + (c?.priceVariance ?? 0), 0);
                return [
                  { label: "Cars Watched", value: String(entries.length) },
                  { label: "Underpriced vs IIV", value: `${underpriced} of ${cars.length}` },
                  { label: "Total Value Gap", value: totalVariance >= 0 ? `+${fmt(totalVariance)}` : fmt(totalVariance) },
                ].map(s => (
                  <div key={s.label} className="bg-card border border-border p-4 text-center">
                    <div className="data-label text-xs mb-1">{s.label}</div>
                    <div className="font-serif text-xl font-bold text-primary">{s.value}</div>
                  </div>
                ));
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

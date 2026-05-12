import { GlobalNav } from "@/components/GlobalNav";
import React from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocalWatchlist } from "@/hooks/useLocalWatchlist";
import type { WatchlistEntry } from "@/hooks/useLocalWatchlist";
const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
const fmtMi = (n: number) => `${n.toLocaleString("en-GB")} mi`;

// Stable string-to-number hash matching useLiveListings.ts
function hashId(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Model key → detail URL prefix mapping
const MODEL_DETAIL_PREFIX: Record<string, string> = {
  "812-superfast": "/car",
  "f8-tributo": "/f8",
  "458-italia": "/458",
  "488-gtb": "/488",
  "california-t": "/california-t-car",
  "portofino": "/portofino-car",
  "roma": "/roma-car",
  "812-gts": "/812-gts-car",
  "488-pista": "/488-pista-car",
  "sf90-stradale": "/sf90-car",
  "huracan-sto": "/huracan-sto-car",
};

// Model key → display label
const MODEL_LABELS: Record<string, string> = {
  "812-superfast": "812 Superfast",
  "f8-tributo": "F8 Tributo",
  "458-italia": "458 Italia",
  "488-gtb": "488 GTB",
  "california-t": "California T",
  "portofino": "Portofino",
  "roma": "Roma",
  "812-gts": "812 GTS",
  "488-pista": "488 Pista",
  "sf90-stradale": "SF90 Stradale",
  "huracan-sto": "Huracán STO",
};

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LiveListing = Record<string, any>;

function WatchlistCard({ item, liveData, onRemove }: {
  item: WatchlistEntry;
  liveData: LiveListing[];
  onRemove: () => void;
}) {
  // Find matching live listing by hashed ID and modelKey
  const liveCar = liveData.find(r => {
    const modelMatch = r.modelKey === item.carModel ||
      MODEL_LABELS[r.modelKey] === item.carModel;
    return modelMatch && hashId(r.id) === item.carId;
  });

  const askingPrice = liveCar?.askingPrice ?? item.askingPriceAtAdd;
  const iiv = liveCar?.details?.iiv ?? null;
  const priceVariance = iiv != null ? (iiv - askingPrice) : null;
  const priceChange = askingPrice - item.askingPriceAtAdd;
  const soldDate = liveCar?.soldDate ?? null;
  const images = (liveCar?.details?.imagesJson as string[] | null) ?? [];
  const dealer = liveCar?.details?.dealer ?? "Unknown Dealer";
  const year = liveCar?.year ?? null;
  const colour = liveCar?.colour ?? "Unknown";
  const mileage = liveCar?.mileage ?? null;
  const modelKey = liveCar?.modelKey ?? "";
  const modelLabel = MODEL_LABELS[modelKey] ?? item.carModel;
  const detailPrefix = MODEL_DETAIL_PREFIX[modelKey] ?? "/car";
  const detailUrl = liveCar ? `${detailPrefix}/${item.carId}` : null;

  // Derive verdict from priceVariance
  const verdict = priceVariance != null
    ? priceVariance >= 20000 ? "strong-buy"
    : priceVariance >= 5000 ? "buy"
    : priceVariance >= -5000 ? "consider"
    : "avoid"
    : "consider";

  return (
    <div className={`bg-card border border-border overflow-hidden ${soldDate ? 'opacity-60' : ''}`}>
      {/* Car image */}
      {images.length > 0 && (
        <div className="h-36 overflow-hidden bg-muted">
          <img
            src={images[0]}
            alt={`${year} Ferrari ${modelLabel}`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-4">
        {liveCar ? (
          <>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm ${VERDICT_CLASS[verdict] ?? ""}`}>
                    {VERDICT_LABELS[verdict] ?? verdict}
                  </span>
                  {soldDate && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 rounded-sm">SOLD</span>}
                </div>
                <h3 className="font-serif font-bold text-foreground">{year} Ferrari {modelLabel}</h3>
                <p className="text-xs text-muted-foreground">{colour}{mileage != null ? ` · ${fmtMi(mileage)}` : ""}</p>
                <p className="text-xs text-muted-foreground">{dealer}</p>
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
                <div className="font-mono text-sm font-bold text-foreground">{fmt(askingPrice)}</div>
              </div>
              <div className="bg-card/80 p-2">
                <div className="data-label text-[10px]">IIV</div>
                <div className="font-mono text-sm font-bold text-primary">{iiv != null ? fmt(iiv) : "—"}</div>
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
            {priceVariance != null && (
              <div className={`text-xs font-mono font-medium mb-3 ${priceVariance >= 0 ? "variance-positive" : "variance-negative"}`}>
                {priceVariance >= 0 ? "+" : ""}{fmt(priceVariance)} vs IIV
              </div>
            )}

            {detailUrl && (
              <Link href={detailUrl} className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                View Full Analysis →
              </Link>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Car data unavailable</p>
            <p className="text-xs text-muted-foreground mt-1">{item.carModel} #{item.carId}</p>
            <button
              onClick={onRemove}
              className="mt-2 text-xs text-red-600 hover:text-red-800 transition-colors"
            >
              Remove from watchlist
            </button>
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
  const { data: allListings = [], isLoading } = trpc.listings.allActive.useQuery();

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

        {/* Loading state */}
        {isLoading && entries.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <div className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading live prices…
          </div>
        )}

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
                  liveData={allListings}
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
                const resolvedCars = entries.map(w => {
                  const liveCar = allListings.find(r => {
                    const modelMatch = r.modelKey === w.carModel || MODEL_LABELS[r.modelKey] === w.carModel;
                    return modelMatch && hashId(r.id) === w.carId;
                  });
                  if (!liveCar) return null;
                  const iiv = liveCar.details?.iiv ?? null;
                  const askingPrice = liveCar.askingPrice ?? w.askingPriceAtAdd;
                  const priceVariance = iiv != null ? (iiv - askingPrice) : 0;
                  return { priceVariance };
                }).filter(Boolean) as Array<{ priceVariance: number }>;

                const underpriced = resolvedCars.filter(c => c.priceVariance >= 0).length;
                const totalVariance = resolvedCars.reduce((s, c) => s + c.priceVariance, 0);
                return [
                  { label: "Cars Watched", value: String(entries.length) },
                  { label: "Underpriced vs IIV", value: `${underpriced} of ${resolvedCars.length}` },
                  { label: "Total Value Gap", value: resolvedCars.length > 0 ? (totalVariance >= 0 ? `+${fmt(totalVariance)}` : fmt(totalVariance)) : "—" },
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

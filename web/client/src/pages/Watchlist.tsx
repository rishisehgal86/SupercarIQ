/**
 * Watchlist.tsx — Saved cars watchlist
 * DB-driven via trpc.watchlist.list + trpc.listings.byId
 * Design: Direction B editorial — warm cream, Playfair Display, Ferrari red accent
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { GlobalNav } from "@/components/GlobalNav";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowLeft, Bookmark, Loader2, Trash2, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;

const VERDICT_LABEL: Record<string, string> = {
  "strong-buy": "STRONG BUY", buy: "BUY", consider: "CONSIDER", avoid: "AVOID",
};
const VERDICT_CLASS: Record<string, string> = {
  "strong-buy": "text-emerald-700 bg-emerald-50 border-emerald-200",
  buy: "text-blue-700 bg-blue-50 border-blue-200",
  consider: "text-amber-700 bg-amber-50 border-amber-200",
  avoid: "text-red-700 bg-red-50 border-red-200",
};

function WatchlistCard({ entry, onRemove }: { entry: any; onRemove: () => void }) {
  const { data: listing, isLoading } = trpc.listings.byId.useQuery(
    { id: String(entry.carId) },
    { enabled: !!entry.carId }
  );

  const priceDelta = listing && entry.askingPriceAtAdd
    ? listing.askingPrice - entry.askingPriceAtAdd
    : null;

  const verdict = listing?.details?.investmentVerdict;

  return (
    <div className="bg-white border border-[#E8E4DC] overflow-hidden">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : listing ? (
        <>
          {/* Image */}
          <div className="relative h-40 overflow-hidden bg-[#F5F2EC]">
            {listing.details?.imagesJson ? (() => {
              try {
                const imgs = JSON.parse(listing.details.imagesJson);
                if (imgs?.[0]) return (
                  <img src={imgs[0]} alt={`${listing.year} ${listing.colour}`}
                    className="w-full h-full object-cover" />
                );
              } catch {}
              return null;
            })() : null}
            {verdict && (
              <div className="absolute top-2 left-2">
                <span className={`data-label px-1.5 py-0.5 text-[9px] font-bold border ${VERDICT_CLASS[verdict] ?? VERDICT_CLASS.consider}`}>
                  {VERDICT_LABEL[verdict] ?? verdict.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="data-label text-[10px] text-muted-foreground mb-0.5">
                  {entry.carModel?.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </div>
                <h3 className="font-serif text-base font-bold text-foreground">
                  {listing.year} {listing.colour}
                </h3>
                <div className="data-label text-[10px] text-muted-foreground mt-0.5">
                  {listing.mileage?.toLocaleString("en-GB")} mi · {listing.details?.dealer ?? ""}
                </div>
              </div>
              <button
                onClick={onRemove}
                className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                title="Remove from watchlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Price row */}
            <div className="grid grid-cols-3 gap-px bg-[#E8E4DC] border border-[#E8E4DC] mb-3">
              <div className="bg-[#FAFAF7] px-2 py-1.5">
                <div className="data-label text-[9px] text-muted-foreground">CURRENT</div>
                <div className="font-mono text-sm font-bold text-foreground">{fmt(listing.askingPrice)}</div>
              </div>
              <div className="bg-[#FAFAF7] px-2 py-1.5">
                <div className="data-label text-[9px] text-muted-foreground">ADDED AT</div>
                <div className="font-mono text-sm font-bold text-foreground">{fmt(entry.askingPriceAtAdd)}</div>
              </div>
              <div className="bg-[#FAFAF7] px-2 py-1.5">
                <div className="data-label text-[9px] text-muted-foreground">CHANGE</div>
                <div className={`font-mono text-sm font-bold flex items-center gap-0.5 ${
                  priceDelta === null ? "text-muted-foreground"
                    : priceDelta > 0 ? "text-red-600" : priceDelta < 0 ? "text-emerald-600" : "text-foreground"
                }`}>
                  {priceDelta === null ? "—"
                    : priceDelta > 0 ? <><TrendingUp className="w-3 h-3" />+{fmt(priceDelta)}</>
                    : priceDelta < 0 ? <><TrendingDown className="w-3 h-3" />{fmt(priceDelta)}</>
                    : <><Minus className="w-3 h-3" />No change</>}
                </div>
              </div>
            </div>

            {/* IIV row */}
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-muted-foreground">IIV: <span className="font-medium text-foreground">{listing.details?.iiv ? fmt(listing.details.iiv) : "—"}</span></span>
              <span className="text-muted-foreground">Score: <span className="font-medium text-primary">{listing.details?.totalScore?.toFixed(1) ?? "—"}/100</span></span>
            </div>

            {/* Notes */}
            {entry.notes && (
              <div className="text-xs text-muted-foreground italic border-t border-[#E8E4DC] pt-2 mb-3">
                "{entry.notes}"
              </div>
            )}

            {/* CTA */}
            <div className="flex gap-2">
              <Link href={`/${entry.carModel}/car/${entry.carId}`}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                View Full Report
              </Link>
              {listing.sourceUrl && (
                <a href={listing.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2 border border-[#E8E4DC] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="p-4">
          <div className="data-label text-[10px] text-muted-foreground mb-1">{entry.carModel}</div>
          <p className="text-sm text-muted-foreground">This listing is no longer available.</p>
          <button onClick={onRemove} className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}

export default function Watchlist() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const { data: watchlist, isLoading: watchlistLoading } = trpc.watchlist.list.useQuery(
    undefined, { enabled: isAuthenticated }
  );

  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      utils.watchlist.list.invalidate();
      toast.success("Removed from watchlist");
    },
    onError: () => toast.error("Failed to remove"),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7]">
        <GlobalNav />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAF7]">
        <GlobalNav />
        <div className="container py-16 text-center">
          <Bookmark className="w-12 h-12 mx-auto mb-4 text-primary/30" />
          <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Sign in to view your watchlist</h2>
          <p className="text-sm text-muted-foreground mb-6">Save cars you are tracking and monitor price changes over time.</p>
          <a href={getLoginUrl()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <GlobalNav />

      <div className="border-b border-[#E8E4DC] bg-white">
        <div className="container py-6 md:py-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </Link>
          <div className="data-label text-primary text-xs mb-1">SupercarIQ · My Watchlist</div>
          <h1 className="font-serif text-2xl md:text-3xl font-black text-foreground">Saved Cars</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {watchlist ? `${watchlist.length} car${watchlist.length !== 1 ? "s" : ""} saved` : "Loading..."}
          </p>
        </div>
      </div>

      <div className="container py-6 md:py-8">
        {watchlistLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !watchlist || watchlist.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-[#E8E4DC] bg-white">
            <Bookmark className="w-10 h-10 mx-auto mb-3 text-primary/30" />
            <p className="font-serif text-lg text-foreground mb-1">Your watchlist is empty</p>
            <p className="text-sm text-muted-foreground mb-4">Save cars from any report page to track their prices and scores here.</p>
            <Link href="/research" className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Browse Models
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(watchlist as any[]).map((entry) => (
              <WatchlistCard
                key={`${entry.carId}-${entry.carModel}`}
                entry={entry}
                onRemove={() => removeMutation.mutate({ carId: entry.carId, carModel: entry.carModel })}
              />
            ))}
          </div>
        )}

        {/* Tip */}
        {watchlist && watchlist.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#E8E4DC]">
            <div className="flex gap-3 items-start max-w-xl">
              <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Price changes are tracked from the moment you add a car to your watchlist. Green indicates the price has dropped (buying opportunity); red indicates it has risen.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

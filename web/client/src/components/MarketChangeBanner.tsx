import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Plus, X, RefreshCw } from "lucide-react";

/**
 * MarketChangeBanner — shows what changed since the previous data refresh.
 *
 * Works from the priceHistory array on each car:
 *   - Price drop: priceHistory length >= 2 and latest price < previous price
 *   - Price rise: priceHistory length >= 2 and latest price > previous price
 *   - New listing: priceHistory length === 1 (first seen today / in last refresh)
 *   - Removed: soldDate is set and matches lastVerified date (sold since last run)
 *
 * When no history exists yet (first run), shows a "Data refreshed today" state.
 */

interface CarSummary {
  id: number;
  colour: string;
  year: number;
  askingPrice: number;
  priceHistory?: { date: string; price: number }[];
  lastVerified?: string;
  soldDate?: string;
  priceDropDate?: string;
  priceDropAmount?: number;
  dealer: string;
  dealerType: string;
}

interface Change {
  type: "price-drop" | "price-rise" | "new" | "sold";
  carId: number;
  label: string;
  amount?: number;
  pct?: number;
  colour: string;
  year: number;
}

function detectChanges(cars: CarSummary[]): Change[] {
  const changes: Change[] = [];

  for (const car of cars) {
    const history = car.priceHistory ?? [];

    // Price change: need at least 2 history entries
    if (history.length >= 2) {
      const latest = history[history.length - 1].price;
      const previous = history[history.length - 2].price;
      const delta = latest - previous;
      const pct = Math.round(Math.abs(delta / previous) * 100);

      if (delta < 0) {
        changes.push({
          type: "price-drop",
          carId: car.id,
          label: `${car.year} ${car.colour}`,
          amount: Math.abs(delta),
          pct,
          colour: car.colour,
          year: car.year,
        });
      } else if (delta > 0) {
        changes.push({
          type: "price-rise",
          carId: car.id,
          label: `${car.year} ${car.colour}`,
          amount: delta,
          pct,
          colour: car.colour,
          year: car.year,
        });
      }
    }

    // New listing: only one history entry (first seen)
    if (history.length === 1 && !car.soldDate) {
      // Only flag as "new" if the single history entry is today or very recent
      const entryDate = history[0]?.date ?? "";
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      if (entryDate === today || entryDate === yesterday) {
        changes.push({
          type: "new",
          carId: car.id,
          label: `${car.year} ${car.colour}`,
          colour: car.colour,
          year: car.year,
        });
      }
    }

    // Sold: soldDate is set
    if (car.soldDate) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      if (car.soldDate === today || car.soldDate === yesterday) {
        changes.push({
          type: "sold",
          carId: car.id,
          label: `${car.year} ${car.colour}`,
          colour: car.colour,
          year: car.year,
        });
      }
    }
  }

  return changes;
}

const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;

interface MarketChangeBannerProps {
  cars: CarSummary[];
  lastUpdated: string;
  modelName: string;
  onCarClick?: (id: number) => void;
}

export function MarketChangeBanner({ cars, lastUpdated, modelName, onCarClick }: MarketChangeBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const changes = detectChanges(cars);

  const priceDrops = changes.filter(c => c.type === "price-drop");
  const priceRises = changes.filter(c => c.type === "price-rise");
  const newListings = changes.filter(c => c.type === "new");
  const soldListings = changes.filter(c => c.type === "sold");

  const totalChanges = changes.length;

  // Format the last updated date for display
  const updatedDate = new Date(lastUpdated + "T00:00:00");
  const isToday = updatedDate.toDateString() === new Date().toDateString();
  const dateLabel = isToday
    ? "today"
    : updatedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div className="border border-border bg-card mb-4 text-xs">
      {/* Header row — always visible */}
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <RefreshCw className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            {modelName} data refreshed <span className="text-foreground font-medium">{dateLabel}</span>
          </span>

          {totalChanges === 0 ? (
            <span className="text-muted-foreground italic">— no changes since last refresh</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {priceDrops.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 rounded-sm font-medium">
                  <TrendingDown className="w-3 h-3" />
                  {priceDrops.length} price drop{priceDrops.length > 1 ? "s" : ""}
                </span>
              )}
              {priceRises.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 text-red-700 rounded-sm font-medium">
                  <TrendingUp className="w-3 h-3" />
                  {priceRises.length} price rise{priceRises.length > 1 ? "s" : ""}
                </span>
              )}
              {newListings.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm font-medium">
                  <Plus className="w-3 h-3" />
                  {newListings.length} new listing{newListings.length > 1 ? "s" : ""}
                </span>
              )}
              {soldListings.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted text-muted-foreground rounded-sm font-medium">
                  <X className="w-3 h-3" />
                  {soldListings.length} sold
                </span>
              )}
            </div>
          )}
        </div>

        {totalChanges > 0 && (
          <span className="text-muted-foreground ml-2 shrink-0">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        )}
      </button>

      {/* Expanded detail */}
      {expanded && totalChanges > 0 && (
        <div className="border-t border-border px-3 py-2 space-y-1">
          {priceDrops.map(c => (
            <div
              key={`drop-${c.carId}`}
              className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors py-0.5"
              onClick={() => onCarClick?.(c.carId)}
            >
              <TrendingDown className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="text-foreground font-medium">{c.label}</span>
              <span className="text-emerald-700 font-mono">
                −{fmt(c.amount!)} ({c.pct}%)
              </span>
              <span className="text-muted-foreground ml-auto">→ view</span>
            </div>
          ))}
          {priceRises.map(c => (
            <div
              key={`rise-${c.carId}`}
              className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors py-0.5"
              onClick={() => onCarClick?.(c.carId)}
            >
              <TrendingUp className="w-3 h-3 text-red-600 shrink-0" />
              <span className="text-foreground font-medium">{c.label}</span>
              <span className="text-red-700 font-mono">
                +{fmt(c.amount!)} ({c.pct}%)
              </span>
              <span className="text-muted-foreground ml-auto">→ view</span>
            </div>
          ))}
          {newListings.map(c => (
            <div
              key={`new-${c.carId}`}
              className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors py-0.5"
              onClick={() => onCarClick?.(c.carId)}
            >
              <Plus className="w-3 h-3 text-primary shrink-0" />
              <span className="text-foreground font-medium">{c.label}</span>
              <span className="text-primary font-medium">New listing</span>
              <span className="text-muted-foreground ml-auto">→ view</span>
            </div>
          ))}
          {soldListings.map(c => (
            <div
              key={`sold-${c.carId}`}
              className="flex items-center gap-2 py-0.5"
            >
              <X className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground line-through">{c.label}</span>
              <span className="text-muted-foreground">Sold</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

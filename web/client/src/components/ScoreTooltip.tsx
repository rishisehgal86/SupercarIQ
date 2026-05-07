import React, { useState, useRef, useEffect } from "react";

/**
 * ScoreTooltip — a hover/click popover that explains the IIQ investment score.
 * Shows scoring categories, weights, and score range interpretation.
 * Usage: <ScoreTooltip score={car.totalScoreNorm} />
 */

const SCORE_CATEGORIES = [
  { group: "Powertrain & Emissions", items: [
    { label: "GPF / OPF Status", weight: 20, note: "Pre-GPF = full exhaust note, highest collector demand" },
    { label: "Engine Condition", weight: 10, note: "Compression, oil analysis, cold-start behaviour" },
  ]},
  { group: "Provenance & History", items: [
    { label: "Owner History", weight: 12, note: "Single owner = 8–12% auction premium" },
    { label: "Service History", weight: 10, note: "Full Ferrari dealer history = 5–8% premium" },
    { label: "Accident Free", weight: 8, note: "Any accident = 15–25% value penalty" },
  ]},
  { group: "Specification", items: [
    { label: "Colour", weight: 15, note: "Special/historic colours = 7–15% premium" },
    { label: "Carbon Pack", weight: 12, note: "Full carbon pack = £10–20k premium" },
    { label: "Seats", weight: 7, note: "Daytona / racing seats = 4–6% premium" },
    { label: "Interior", weight: 6, note: "Contrast interior = 3–5% premium" },
  ]},
  { group: "Mechanical Upgrades", items: [
    { label: "Suspension Lift", weight: 7, note: "Front & rear lift — practical for UK roads" },
    { label: "Carbon Ceramic Brakes", weight: 5, note: "CCB = £8–12k option, strong resale signal" },
    { label: "MagneRide", weight: 4, note: "Magnetorheological suspension = £4k option" },
    { label: "Rear-Wheel Steering", weight: 4, note: "4WS = £5k option, desirable" },
  ]},
  { group: "Exclusivity", items: [
    { label: "Atelier Commission", weight: 7, note: "Bespoke Atelier = 10–15% premium" },
    { label: "Track Pack", weight: 4, note: "Track pack / telemetry = collector signal" },
    { label: "Limited Edition", weight: 4, note: "Special series = significant premium" },
  ]},
  { group: "Condition & Value", items: [
    { label: "Mileage", weight: 6, note: "Lower mileage = higher score" },
    { label: "Warranty", weight: 8, note: "Ferrari Approved = 10, dealer = 6, none = 0" },
    { label: "Price vs IIV", weight: 3, note: "Relative value vs implied investment value" },
    { label: "Storage Quality", weight: 2, note: "Climate-controlled history" },
  ]},
];

const MAX_SCORE = 154; // Sum of all weights

function getScoreLabel(score: number): { label: string; colour: string } {
  if (score >= 80) return { label: "Top Tier", colour: "text-emerald-600" };
  if (score >= 70) return { label: "Above Average", colour: "text-amber-600" };
  if (score >= 60) return { label: "Average", colour: "text-foreground" };
  return { label: "Below Average", colour: "text-red-600" };
}

interface ScoreTooltipProps {
  score?: number;
  /** If true, renders a full inline breakdown panel instead of a popover trigger */
  inline?: boolean;
}

export function ScoreTooltip({ score, inline = false }: ScoreTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { label, colour } = getScoreLabel(score ?? 0);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const content = (
    <div className="w-72 sm:w-80 bg-card border border-border shadow-lg p-4 text-left">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-serif font-bold text-base text-foreground">IIQ Score Explained</div>
          <div className="text-[10px] text-muted-foreground">18 categories · {MAX_SCORE} points max</div>
        </div>
        {score !== undefined && (
          <div className="text-right">
            <div className={`font-mono text-xl font-bold ${colour}`}>{score}/100</div>
            <div className={`text-[10px] font-medium ${colour}`}>{label}</div>
          </div>
        )}
      </div>

      {/* Score ranges */}
      <div className="grid grid-cols-4 gap-px bg-border mb-3 text-center text-[9px]">
        {[
          { range: "80–100", label: "Top Tier", cls: "text-emerald-600" },
          { range: "70–79", label: "Above Avg", cls: "text-amber-600" },
          { range: "60–69", label: "Average", cls: "text-foreground" },
          { range: "0–59", label: "Below Avg", cls: "text-red-600" },
        ].map(r => (
          <div key={r.range} className={`bg-card py-1.5 ${score !== undefined && score >= parseInt(r.range) ? "ring-1 ring-primary/30" : ""}`}>
            <div className={`font-mono font-bold ${r.cls}`}>{r.range}</div>
            <div className="text-muted-foreground">{r.label}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
        {SCORE_CATEGORIES.map(group => (
          <div key={group.group}>
            <div className="data-label text-[9px] text-primary mb-1">{group.group}</div>
            {group.items.map(item => (
              <div key={item.label} className="flex items-start gap-2 mb-1">
                <div className="shrink-0 font-mono text-[9px] font-bold text-foreground/60 w-5 text-right mt-0.5">{item.weight}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-medium text-foreground leading-tight">{item.label}</div>
                  <div className="text-[9px] text-muted-foreground leading-tight">{item.note}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border mt-3 pt-2 text-[9px] text-muted-foreground">
        Score = Σ(category_score × weight) ÷ {MAX_SCORE} × 100. Calibrated against 47 UK auction results 2022–2026.
      </div>
    </div>
  );

  if (inline) {
    return <div>{content}</div>;
  }

  return (
    <div className="relative inline-flex" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-muted-foreground/40 text-muted-foreground/60 text-[7px] font-bold cursor-help hover:border-primary/60 hover:text-primary/80 transition-colors"
        aria-label="Score explanation"
      >
        ?
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-card border-b border-r border-border rotate-45 translate-y-1 relative z-10" />
          </div>
          {content}
        </div>
      )}
    </div>
  );
}

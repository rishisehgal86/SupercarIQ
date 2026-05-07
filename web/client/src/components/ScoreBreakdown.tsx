import React, { useState, useRef, useEffect } from "react";

/**
 * ScoreBreakdown — research-backed scoring framework visualisation.
 *
 * Features:
 * 1. Per-attribute score bars with earned vs max
 * 2. Hover justifications with source citations per attribute
 * 3. Weighted framework overview bar chart
 * 4. IIV methodology explanation
 * 5. Confidence interval display
 *
 * Usage:
 *   <ScoreBreakdown
 *     score={car.totalScoreNorm}
 *     scores={car.scores}
 *     weights={WEIGHTS}
 *     weightLabels={WEIGHT_LABELS}
 *     weightEvidence={WEIGHT_EVIDENCE}
 *     iiv={car.iiv}
 *     iivLow={car.iivLow}
 *     iivHigh={car.iivHigh}
 *     iivConfidence="high"
 *     askingPrice={car.askingPrice}
 *     modelKey="812-superfast"
 *   />
 */

export interface EvidenceItem {
  // New shape
  description?: string;
  sourceUrl?: string;
  // Legacy shape (cars.ts uses 'finding' and 'url')
  finding?: string;
  url?: string;
  // Common
  impact: string;
  source: string;
}

export interface ScoreBreakdownProps {
  score?: number;
  scores?: Record<string, number>;
  weights: Record<string, number>;
  weightLabels: Record<string, string>;
  weightEvidence: Record<string, EvidenceItem>;
  iiv?: number;
  iivLow?: number;
  iivHigh?: number;
  iivConfidence?: "high" | "medium" | "low";
  askingPrice?: number;
  modelKey?: string;
  /** If true, renders full inline panel instead of hover trigger */
  inline?: boolean;
  /** If true, shows only the framework overview (no per-car scores) */
  frameworkOnly?: boolean;
}

const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;

function getScoreColour(pct: number): string {
  if (pct >= 80) return "text-emerald-500";
  if (pct >= 65) return "text-amber-500";
  if (pct >= 50) return "text-orange-500";
  return "text-red-500";
}

function getScoreBarColour(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 65) return "bg-amber-500";
  if (pct >= 50) return "bg-orange-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Top Tier";
  if (score >= 65) return "Above Average";
  if (score >= 50) return "Average";
  return "Below Average";
}

function getConfidenceLabel(c?: string): { label: string; spread: string; colour: string } {
  if (c === "high") return { label: "High", spread: "±8%", colour: "text-emerald-500" };
  if (c === "medium") return { label: "Medium", spread: "±12%", colour: "text-amber-500" };
  return { label: "Low", spread: "±18%", colour: "text-red-500" };
}

interface AttributeRowProps {
  attrKey: string;
  label: string;
  earned: number;
  max: number;
  evidence?: EvidenceItem;
  showScore: boolean;
}

function AttributeRow({ attrKey, label, earned, max, evidence, showScore }: AttributeRowProps) {
  const [tipOpen, setTipOpen] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const pct = max > 0 ? (earned / max) * 100 : 0;

  useEffect(() => {
    if (!tipOpen) return;
    const handler = (e: MouseEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) {
        setTipOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tipOpen]);

  return (
    <div className="flex items-center gap-2 py-1 group">
      {/* Weight pill */}
      <div className="shrink-0 font-mono text-[9px] font-bold text-muted-foreground/70 w-5 text-right">
        {max}
      </div>

      {/* Label + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-medium text-foreground leading-tight truncate">{label}</span>
          {showScore && (
            <span className={`text-[9px] font-mono font-bold ml-2 shrink-0 ${getScoreColour(pct)}`}>
              {Math.round(earned)}/{max}
            </span>
          )}
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${showScore ? getScoreBarColour(pct) : "bg-primary/40"}`}
            style={{ width: `${showScore ? pct : (max / 22) * 100}%` }}
          />
        </div>
      </div>

      {/* Info button with tooltip */}
      {evidence && (
        <div className="relative shrink-0" ref={tipRef}>
          <button
            type="button"
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
            onClick={() => setTipOpen(v => !v)}
            className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 text-muted-foreground/50 text-[7px] font-bold hover:border-primary/60 hover:text-primary/80 transition-colors flex items-center justify-center"
            aria-label={`Evidence for ${label}`}
          >
            ?
          </button>
          {tipOpen && (
          <div
            className="absolute z-50 right-0 bottom-full mb-2 w-64 bg-card border border-border shadow-xl p-3 text-left"
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
          >
            <div className="text-[10px] font-semibold text-foreground mb-1">{label}</div>
            <p className="text-[9px] text-foreground/80 mb-1.5 leading-relaxed">
              {evidence.description ?? evidence.finding}
            </p>
            <div className="text-[9px] font-medium text-primary mb-1">
              Price Impact: {evidence.impact}
            </div>
            <div className="text-[9px] text-muted-foreground border-t border-border pt-1">
              Source:{" "}
              {(evidence.sourceUrl ?? evidence.url) ? (
                <a
                  href={evidence.sourceUrl ?? evidence.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary"
                >
                  {evidence.source}
                </a>
              ) : (
                evidence.source
              )}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

const CATEGORY_GROUPS: Array<{
  label: string;
  keys: string[];
  colour: string;
}> = [
  {
    label: "Powertrain & Emissions",
    keys: ["gpf", "engineCondition", "naV8Engine", "turboReliability"],
    colour: "text-red-500",
  },
  {
    label: "Provenance & History",
    keys: ["ownerHistory", "serviceHistory", "accidentFree"],
    colour: "text-amber-500",
  },
  {
    label: "Specification",
    keys: ["colour", "carbonPack", "seats", "racingSeats", "daytonaSeats", "interior", "bodyStyle"],
    colour: "text-blue-400",
  },
  {
    label: "Mechanical Upgrades",
    keys: ["suspensionLift", "frontLift", "carbonCeramicBrakes", "ccb", "magnetorheological", "rearWheelSteering", "handlingSpeciale", "assettoCorsaFiorano"],
    colour: "text-emerald-500",
  },
  {
    label: "Exclusivity",
    keys: ["atelier", "tailorMade", "trackPack", "limitedEdition", "portofinoM", "manettino", "raceExhaust", "sportExhaust", "passionato", "passionato_seats"],
    colour: "text-purple-400",
  },
  {
    label: "Condition & Value",
    keys: ["mileage", "modelYear", "warranty", "dealerType", "price", "storageQuality", "hardtopCondition", "interiorCondition"],
    colour: "text-slate-400",
  },
];

export function ScoreBreakdown({
  score,
  scores,
  weights,
  weightLabels,
  weightEvidence,
  iiv,
  iivLow,
  iivHigh,
  iivConfidence = "medium",
  askingPrice,
  modelKey,
  inline = false,
  frameworkOnly = false,
}: ScoreBreakdownProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"score" | "framework" | "iiv">("score");
  const ref = useRef<HTMLDivElement>(null);

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

  const totalMaxWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const { label: confLabel, spread: confSpread, colour: confColour } = getConfidenceLabel(iivConfidence);

  // Build ordered attribute list from category groups
  const orderedAttrs: Array<{ key: string; label: string; weight: number }> = [];
  for (const group of CATEGORY_GROUPS) {
    for (const key of group.keys) {
      if (weights[key] !== undefined) {
        orderedAttrs.push({ key, label: weightLabels[key] || key, weight: weights[key] });
      }
    }
  }
  // Add any remaining keys not in groups
  for (const key of Object.keys(weights)) {
    if (!orderedAttrs.find(a => a.key === key)) {
      orderedAttrs.push({ key, label: weightLabels[key] || key, weight: weights[key] });
    }
  }

  const priceVariance = iiv && askingPrice ? iiv - askingPrice : null;
  const priceVariancePct = iiv && askingPrice && askingPrice > 0
    ? ((iiv - askingPrice) / askingPrice) * 100
    : null;

  const content = (
    <div className="w-80 sm:w-96 bg-card border border-border shadow-xl text-left">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
        <div>
          <div className="font-serif font-bold text-sm text-foreground">Investment Score</div>
          <div className="text-[9px] text-muted-foreground">
            {Object.keys(weights).length} factors · {totalMaxWeight} pts max
          </div>
        </div>
        {score !== undefined && (
          <div className="text-right">
            <div className={`font-mono text-2xl font-black ${getScoreColour(score)}`}>
              {score.toFixed(0)}
            </div>
            <div className={`text-[9px] font-semibold ${getScoreColour(score)}`}>
              {getScoreLabel(score)}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["score", "framework", "iiv"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[9px] font-medium tracking-wide uppercase transition-colors ${
              activeTab === tab
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "score" ? "This Car" : tab === "framework" ? "Framework" : "IIV Method"}
          </button>
        ))}
      </div>

      {/* Tab: This Car */}
      {activeTab === "score" && (
        <div className="px-4 py-3 max-h-72 overflow-y-auto">
          {!scores || Object.keys(scores).length === 0 ? (
            <div className="text-[10px] text-muted-foreground text-center py-4">
              Detailed score breakdown not available for this listing.
            </div>
          ) : (
            <>
              {CATEGORY_GROUPS.map(group => {
                const groupAttrs = group.keys.filter(k => weights[k] !== undefined);
                if (groupAttrs.length === 0) return null;
                return (
                  <div key={group.label} className="mb-3">
                    <div className={`text-[8px] font-bold tracking-widest uppercase mb-1 ${group.colour}`}>
                      {group.label}
                    </div>
                    {groupAttrs.map(key => (
                      <AttributeRow
                        key={key}
                        attrKey={key}
                        label={weightLabels[key] || key}
                        earned={scores[key] ?? 0}
                        max={weights[key]}
                        evidence={weightEvidence[key]}
                        showScore={true}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Tab: Framework */}
      {activeTab === "framework" && (
        <div className="px-4 py-3 max-h-72 overflow-y-auto">
          <p className="text-[9px] text-muted-foreground mb-3 leading-relaxed">
            Weights are calibrated against UK auction data (2024–2026). Hover the{" "}
            <span className="font-bold">?</span> for research evidence per factor.
          </p>
          {CATEGORY_GROUPS.map(group => {
            const groupAttrs = group.keys.filter(k => weights[k] !== undefined);
            if (groupAttrs.length === 0) return null;
            return (
              <div key={group.label} className="mb-3">
                <div className={`text-[8px] font-bold tracking-widest uppercase mb-1 ${group.colour}`}>
                  {group.label}
                </div>
                {groupAttrs.map(key => (
                  <AttributeRow
                    key={key}
                    attrKey={key}
                    label={weightLabels[key] || key}
                    earned={0}
                    max={weights[key]}
                    evidence={weightEvidence[key]}
                    showScore={false}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: IIV Method */}
      {activeTab === "iiv" && (
        <div className="px-4 py-3 max-h-72 overflow-y-auto space-y-3">
          {/* IIV value */}
          {iiv && (
            <div className="bg-muted/30 border border-border p-3">
              <div className="text-[9px] text-muted-foreground mb-1">Indicative Investment Value</div>
              <div className="font-mono text-xl font-black text-primary">{fmt(iiv)}</div>
              {iivLow && iivHigh && (
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  Range: {fmt(iivLow)} – {fmt(iivHigh)}
                  <span className={`ml-2 font-medium ${confColour}`}>
                    {confLabel} confidence ({confSpread})
                  </span>
                </div>
              )}
              {priceVariance !== null && askingPrice && (
                <div className={`text-[10px] font-semibold mt-1 ${priceVariance >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {priceVariance >= 0
                    ? `Listed ${fmt(Math.abs(priceVariance))} below IIV (${priceVariancePct?.toFixed(1)}% undervalued)`
                    : `Listed ${fmt(Math.abs(priceVariance))} above IIV (${Math.abs(priceVariancePct ?? 0).toFixed(1)}% overvalued)`}
                </div>
              )}
            </div>
          )}

          {/* Methodology explanation */}
          <div>
            <div className="text-[9px] font-bold text-foreground mb-1">How IIV is Calculated</div>
            <p className="text-[9px] text-muted-foreground leading-relaxed mb-2">
              We use a <strong className="text-foreground">multiplicative hedonic pricing model</strong> — not
              anchored to the current market median. Each attribute contributes a percentage premium or
              discount to a research-calibrated base value.
            </p>
            <div className="bg-muted/20 border border-border p-2 font-mono text-[9px] text-foreground/80">
              IIV = BASE × Π(1 + premium_i)
            </div>
          </div>

          <div>
            <div className="text-[9px] font-bold text-foreground mb-1">Base Value Calibration</div>
            <p className="text-[9px] text-muted-foreground leading-relaxed">
              Base values are set from real UK auction results (BaT, Collecting Cars, Iconic Auctioneers,
              Bonhams) from 2024–2026, representing an average-spec, average-mileage example.
            </p>
          </div>

          <div>
            <div className="text-[9px] font-bold text-foreground mb-1">Confidence Levels</div>
            <div className="space-y-1">
              {[
                { level: "High", spread: "±8%", desc: "5+ recent UK comps within 12 months", colour: "text-emerald-500" },
                { level: "Medium", spread: "±12%", desc: "2–4 comps or data 12–24 months old", colour: "text-amber-500" },
                { level: "Low", spread: "±18%", desc: "Fewer than 2 comps or unusual config", colour: "text-red-500" },
              ].map(c => (
                <div key={c.level} className="flex items-start gap-2">
                  <span className={`text-[9px] font-bold w-12 shrink-0 ${c.colour}`}>{c.level} {c.spread}</span>
                  <span className="text-[9px] text-muted-foreground">{c.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-2">
            <div className="text-[8px] text-muted-foreground">
              Calibrated against 50+ UK auction results 2024–2026. Sources: BaT, Collecting Cars,
              Iconic Auctioneers, Bonhams, Hagerty UK, Ferrari Approved UK.
            </div>
          </div>
        </div>
      )}

      {/* Score range legend */}
      <div className="grid grid-cols-4 gap-px bg-border border-t border-border text-center text-[8px]">
        {[
          { range: "80–100", label: "Top Tier", cls: "text-emerald-500" },
          { range: "65–79", label: "Above Avg", cls: "text-amber-500" },
          { range: "50–64", label: "Average", cls: "text-orange-500" },
          { range: "0–49", label: "Below Avg", cls: "text-red-500" },
        ].map(r => (
          <div key={r.range} className="bg-card py-1.5">
            <div className={`font-mono font-bold ${r.cls}`}>{r.range}</div>
            <div className="text-muted-foreground">{r.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (inline) {
    return <div>{content}</div>;
  }

  if (frameworkOnly) {
    // Render just the framework tab inline, no trigger
    return (
      <div className="w-full">
        {CATEGORY_GROUPS.map(group => {
          const groupAttrs = group.keys.filter(k => weights[k] !== undefined);
          if (groupAttrs.length === 0) return null;
          return (
            <div key={group.label} className="mb-4">
              <div className={`text-[9px] font-bold tracking-widest uppercase mb-2 ${group.colour}`}>
                {group.label}
              </div>
              {groupAttrs.map(key => (
                <AttributeRow
                  key={key}
                  attrKey={key}
                  label={weightLabels[key] || key}
                  earned={0}
                  max={weights[key]}
                  evidence={weightEvidence[key]}
                  showScore={false}
                />
              ))}
            </div>
          );
        })}
      </div>
    );
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
        aria-label="Score breakdown"
      >
        ?
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute z-50 bottom-full mb-2 right-0"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {content}
        </div>
      )}
    </div>
  );
}

/**
 * FrameworkSection — the full methodology section shown on each model page.
 * Replaces the existing FrameworkSection in each model report page.
 */
export function FrameworkSection({
  weights,
  weightLabels,
  weightDescriptions,
  weightEvidence,
  sectionNumber = "01",
  modelName = "Ferrari",
}: {
  weights: Record<string, number>;
  weightLabels: Record<string, string>;
  weightDescriptions: Record<string, string>;
  weightEvidence: Record<string, EvidenceItem>;
  sectionNumber?: string;
  modelName?: string;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  // Sort by weight descending for the chart
  const sortedEntries = Object.entries(weights).sort((a, b) => b[1] - a[1]);

  return (
    <section id="framework" className="py-14 md:py-20 border-t border-border">
      <div className="container">
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="section-number text-3xl md:text-4xl lg:text-6xl">{sectionNumber}</div>
          <div>
            <div className="data-label text-primary mb-2">Step {sectionNumber} — Scoring Methodology</div>
            <h2 className="font-serif text-2xl md:text-4xl font-black text-foreground mb-3">
              Research-Backed Weighted Framework
            </h2>
            <p className="text-sm md:text-base text-foreground/70 max-w-2xl leading-relaxed">
              Each {modelName} is scored across {Object.keys(weights).length} factors using a{" "}
              <strong className="text-foreground">multiplicative hedonic pricing model</strong> calibrated
              against real UK auction results from 2024–2026. Weights reflect the actual price impact of
              each attribute — not subjective opinion. Hover any factor for the research evidence.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
          {/* Left: Weight bar chart */}
          <div>
            <div className="data-label text-primary mb-4">Factor Weights (max {totalWeight} pts)</div>
            <div className="space-y-1">
              {sortedEntries.map(([key, weight]) => {
                const pct = (weight / sortedEntries[0][1]) * 100;
                const ev = weightEvidence[key];
                const isExpanded = expandedKey === key;
                return (
                  <div key={key}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 py-1.5 hover:bg-muted/30 px-2 -mx-2 transition-colors group text-left"
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                    >
                      <div className="shrink-0 font-mono text-[10px] font-bold text-muted-foreground w-5 text-right">
                        {weight}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-foreground truncate">
                            {weightLabels[key] || key}
                          </span>
                          <span className="text-[9px] text-muted-foreground ml-2 shrink-0 group-hover:text-primary transition-colors">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </button>
                    {isExpanded && ev && (
                      <div className="ml-8 mb-2 p-3 bg-muted/20 border border-border text-[10px] leading-relaxed">
                        <p className="text-foreground/80 mb-1.5">{ev.description ?? ev.finding}</p>
                        <div className="text-primary font-medium mb-1">Price Impact: {ev.impact}</div>
                        <div className="text-muted-foreground">
                          Source:{" "}
                          {(ev.sourceUrl ?? ev.url) ? (
                            <a
                              href={ev.sourceUrl ?? ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-primary"
                            >
                              {ev.source}
                            </a>
                          ) : (
                            ev.source
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Methodology explanation */}
          <div className="space-y-6">
            <div>
              <div className="data-label text-primary mb-2">IIV — Indicative Investment Value</div>
              <p className="text-sm text-foreground/70 leading-relaxed mb-3">
                The IIV is <strong className="text-foreground">not anchored to the current market median</strong>.
                It is computed from a research-calibrated base value using a multiplicative hedonic model:
              </p>
              <div className="bg-card border border-border p-3 font-mono text-xs text-foreground/80 mb-3">
                IIV = BASE_VALUE × Π(1 + premium_i)
              </div>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Each attribute contributes a percentage premium or discount derived from real auction data.
                A car with a full carbon pack, pre-GPF engine, and single owner will have a materially
                higher IIV than a standard-spec example — even if both are listed at the same price.
              </p>
            </div>

            <div>
              <div className="data-label text-primary mb-2">Confidence Intervals</div>
              <div className="space-y-2">
                {[
                  { level: "High ±8%", desc: "5+ recent UK comps within 12 months, full spec data", cls: "border-emerald-500/40 text-emerald-500" },
                  { level: "Medium ±12%", desc: "2–4 comps or data 12–24 months old, partial spec", cls: "border-amber-500/40 text-amber-500" },
                  { level: "Low ±18%", desc: "Fewer than 2 comps, limited spec, unusual config", cls: "border-red-500/40 text-red-500" },
                ].map(c => (
                  <div key={c.level} className={`border-l-2 pl-3 py-1 ${c.cls}`}>
                    <div className="text-xs font-bold">{c.level}</div>
                    <div className="text-[10px] text-foreground/60">{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="data-label text-primary mb-2">Auction Calibration Sources</div>
              <div className="text-xs text-foreground/60 space-y-1">
                {[
                  { name: "Bring a Trailer (BaT)", url: "https://bringatrailer.com/ferrari/" },
                  { name: "Collecting Cars UK", url: "https://collectingcars.com" },
                  { name: "Iconic Auctioneers", url: "https://www.iconicauctioneers.com" },
                  { name: "Bonhams|Cars", url: "https://cars.bonhams.com" },
                  { name: "Hagerty UK Price Guide", url: "https://www.hagerty.co.uk/valuation/tool/" },
                  { name: "Ferrari Approved UK", url: "https://preowned.ferrari.com/en-US/r/europe/used-ferrari/great-britain/" },
                ].map(s => (
                  <div key={s.name}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary underline">
                      {s.name}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

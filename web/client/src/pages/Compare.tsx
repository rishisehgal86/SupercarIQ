/**
 * Compare.tsx — Side-by-side car comparison tool
 * Fully DB-driven via trpc.listings.allActive + trpc.models.all
 * Design: Direction B editorial — warm cream, Playfair Display, Ferrari red accent
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { GlobalNav } from "@/components/GlobalNav";
import { ArrowLeft, ChevronDown, TrendingUp, Loader2, X, Plus } from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
const fmtK = (n: number) => `£${(n / 1000).toFixed(0)}k`;

const VERDICT_LABEL: Record<string, string> = {
  "strong-buy": "STRONG BUY", buy: "BUY", consider: "CONSIDER", avoid: "AVOID",
};
const VERDICT_CLASS: Record<string, string> = {
  "strong-buy": "text-emerald-700 bg-emerald-50 border-emerald-200",
  buy: "text-blue-700 bg-blue-50 border-blue-200",
  consider: "text-amber-700 bg-amber-50 border-amber-200",
  avoid: "text-red-700 bg-red-50 border-red-200",
};

const SCORE_CATEGORIES = [
  { key: "gpf", label: "GPF Status" },
  { key: "colour", label: "Colour" },
  { key: "mileage", label: "Mileage" },
  { key: "ownerHistory", label: "Owners" },
  { key: "serviceHistory", label: "Service" },
  { key: "carbonPack", label: "Carbon Pack" },
  { key: "ccb", label: "CCB" },
  { key: "price", label: "Value" },
];

function getScores(car: any): Record<string, number> {
  try {
    if (car.details?.scoresJson) return JSON.parse(car.details.scoresJson);
  } catch {}
  return {};
}

function CarSelector({
  allListings, selectedId, onSelect, placeholder,
}: {
  allListings: any[]; selectedId: string | null; onSelect: (id: string | null) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    allListings.filter((c) => {
      const q = search.toLowerCase();
      return !q || c.colour?.toLowerCase().includes(q) || c.modelKey?.toLowerCase().includes(q) || String(c.year).includes(q);
    }), [allListings, search]);

  const selected = allListings.find((c) => c.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-[#E8E4DC] hover:border-primary/40 transition-colors text-left"
      >
        {selected ? (
          <div className="min-w-0">
            <div className="font-medium text-sm text-foreground truncate">
              {selected.year} {selected.colour} {selected.modelKey?.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </div>
            <div className="data-label text-[10px] text-muted-foreground">{fmt(selected.askingPrice)} · {selected.details?.totalScore?.toFixed(1) ?? "—"}/100</div>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-[#E8E4DC] shadow-lg max-h-64 overflow-y-auto">
          <div className="p-2 border-b border-[#E8E4DC]">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1.5 text-sm border border-[#E8E4DC] focus:outline-none focus:border-primary/40"
            />
          </div>
          {selectedId && (
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              className="w-full px-3 py-2 text-sm text-muted-foreground hover:bg-[#FAFAF7] text-left flex items-center gap-2"
            >
              <X className="w-3 h-3" /> Clear selection
            </button>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c.id); setOpen(false); setSearch(""); }}
              className={`w-full px-3 py-2 text-left hover:bg-[#FAFAF7] transition-colors ${c.id === selectedId ? "bg-primary/5" : ""}`}
            >
              <div className="text-sm font-medium text-foreground">
                {c.year} {c.colour} {c.modelKey?.replace(/-/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase())}
              </div>
              <div className="data-label text-[10px] text-muted-foreground">
                {fmt(c.askingPrice)} · Score: {c.details?.totalScore?.toFixed(1) ?? "—"}/100 · IIV: {c.details?.iiv ? fmt(c.details.iiv) : "—"}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">No cars found</div>
          )}
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, values, highlight = false }: { label: string; values: (string | number | null)[]; highlight?: boolean }) {
  return (
    <div className={`grid gap-px bg-[#E8E4DC] ${values.length === 2 ? "grid-cols-3" : "grid-cols-4"}`}>
      <div className={`px-3 py-2.5 ${highlight ? "bg-[#F5F2EC]" : "bg-white"}`}>
        <span className="data-label text-[10px] text-muted-foreground">{label}</span>
      </div>
      {values.map((v, i) => (
        <div key={i} className={`px-3 py-2.5 ${highlight ? "bg-[#F5F2EC]" : "bg-white"}`}>
          <span className="text-sm font-medium text-foreground">{v ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

export default function Compare() {
  const [selectedIds, setSelectedIds] = useState<(string | null)[]>([null, null]);

  const { data: allListings, isLoading } = trpc.listings.allActive.useQuery();

  const selectedCars = useMemo(() => {
    if (!allListings) return [];
    return selectedIds.map((id) => id ? (allListings as any[]).find((c) => c.id === id) ?? null : null);
  }, [allListings, selectedIds]);

  const radarData = useMemo(() => {
    const cars = selectedCars.filter(Boolean);
    if (cars.length === 0) return [];
    return SCORE_CATEGORIES.map(({ key, label }) => {
      const entry: any = { subject: label };
      cars.forEach((car, i) => {
        const scores = getScores(car);
        entry[`car${i + 1}`] = scores[key] ?? 0;
      });
      return entry;
    });
  }, [selectedCars]);

  const COLORS = ["#C8102E", "#1e293b", "#2563eb"];

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <GlobalNav />

      {/* Header */}
      <div className="border-b border-[#E8E4DC] bg-white">
        <div className="container py-6 md:py-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </Link>
          <div className="data-label text-primary text-xs mb-1">SupercarIQ · Compare Tool</div>
          <h1 className="font-serif text-2xl md:text-3xl font-black text-foreground">Side-by-Side Comparison</h1>
          <p className="text-sm text-muted-foreground mt-1">Select up to 3 cars to compare specifications, scores, and investment metrics.</p>
        </div>
      </div>

      <div className="container py-6 md:py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Car selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {selectedIds.map((id, i) => (
                <div key={i}>
                  <div className="data-label text-[10px] text-muted-foreground mb-1.5">CAR {i + 1}</div>
                  <CarSelector
                    allListings={(allListings as any[]) ?? []}
                    selectedId={id}
                    onSelect={(newId) => {
                      const next = [...selectedIds];
                      next[i] = newId;
                      setSelectedIds(next);
                    }}
                    placeholder={`Select car ${i + 1}...`}
                  />
                </div>
              ))}
              {selectedIds.length < 3 && (
                <div>
                  <div className="data-label text-[10px] text-muted-foreground mb-1.5">ADD CAR</div>
                  <button
                    onClick={() => setSelectedIds([...selectedIds, null])}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-dashed border-[#E8E4DC] hover:border-primary/40 transition-colors text-sm text-muted-foreground"
                  >
                    <Plus className="w-4 h-4" /> Add third car
                  </button>
                </div>
              )}
            </div>

            {/* Comparison table */}
            {selectedCars.some(Boolean) && (
              <div className="space-y-6">
                {/* Score overview */}
                <div className="bg-white border border-[#E8E4DC] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E8E4DC] bg-[#FAFAF7]">
                    <div className="data-label text-xs text-primary">INVESTMENT OVERVIEW</div>
                  </div>
                  <div className="divide-y divide-[#E8E4DC]">
                    <CompareRow label="IIV Score" highlight values={selectedCars.map((c) => c ? `${c.details?.totalScore?.toFixed(1) ?? "—"}/100` : null)} />
                    <CompareRow label="IIV (Fair Value)" values={selectedCars.map((c) => c?.details?.iiv ? fmt(c.details.iiv) : null)} />
                    <CompareRow label="Asking Price" values={selectedCars.map((c) => c ? fmt(c.askingPrice) : null)} />
                    <CompareRow label="Value Gap" highlight values={selectedCars.map((c) => {
                      if (!c?.details?.priceVariance) return null;
                      const gap = c.details.priceVariance;
                      return gap > 0 ? `+${fmt(gap)}` : fmt(gap);
                    })} />
                    <CompareRow label="Verdict" values={selectedCars.map((c) => {
                      const v = c?.details?.investmentVerdict;
                      return v ? VERDICT_LABEL[v] ?? v : null;
                    })} />
                    <CompareRow label="Rank" values={selectedCars.map((c) => c?.details?.rank ? `#${c.details.rank}` : null)} />
                  </div>
                </div>

                {/* Spec table */}
                <div className="bg-white border border-[#E8E4DC] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E8E4DC] bg-[#FAFAF7]">
                    <div className="data-label text-xs text-primary">SPECIFICATION</div>
                  </div>
                  <div className="divide-y divide-[#E8E4DC]">
                    <CompareRow label="Year" values={selectedCars.map((c) => c?.year ?? null)} />
                    <CompareRow label="Colour" values={selectedCars.map((c) => c?.colour ?? null)} />
                    <CompareRow label="Mileage" values={selectedCars.map((c) => c?.mileage ? `${c.mileage.toLocaleString("en-GB")} mi` : null)} />
                    <CompareRow label="Interior" values={selectedCars.map((c) => c?.details?.interior ?? null)} />
                    <CompareRow label="GPF Status" values={selectedCars.map((c) => c?.details?.gpfStatus ?? null)} />
                    <CompareRow label="Owners" values={selectedCars.map((c) => c?.details?.ownerCount ?? null)} />
                    <CompareRow label="Service History" values={selectedCars.map((c) => c?.details?.serviceHistory ?? null)} />
                    <CompareRow label="Carbon Pack" values={selectedCars.map((c) => c?.details?.carbonPack ? "Yes" : "No")} />
                    <CompareRow label="CCB" values={selectedCars.map((c) => c?.details?.ccb ? "Yes" : "No")} />
                    <CompareRow label="Suspension Lift" values={selectedCars.map((c) => c?.details?.suspensionLift ? "Yes" : "No")} />
                    <CompareRow label="Atelier Car" values={selectedCars.map((c) => c?.details?.atelierCar ? "Yes" : "No")} />
                    <CompareRow label="Dealer" values={selectedCars.map((c) => c?.details?.dealer ?? null)} />
                  </div>
                </div>

                {/* Radar chart */}
                {radarData.length > 0 && selectedCars.filter(Boolean).length > 1 && (
                  <div className="bg-white border border-[#E8E4DC] p-4 md:p-6">
                    <div className="data-label text-xs text-primary mb-4">SCORE COMPARISON — RADAR</div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#E8E4DC" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6B7280" }} />
                          {selectedCars.filter(Boolean).map((car, i) => (
                            <Radar
                              key={i}
                              name={car ? `${car.year} ${car.colour}` : `Car ${i + 1}`}
                              dataKey={`car${i + 1}`}
                              stroke={COLORS[i]}
                              fill={COLORS[i]}
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                          ))}
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="flex gap-4 justify-center mt-2">
                      {selectedCars.filter(Boolean).map((car, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-3 h-0.5" style={{ backgroundColor: COLORS[i] }} />
                          <span className="data-label text-[10px]">{car ? `${car.year} ${car.colour}` : `Car ${i + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price comparison bar */}
                {selectedCars.filter(Boolean).length > 1 && (
                  <div className="bg-white border border-[#E8E4DC] p-4 md:p-6">
                    <div className="data-label text-xs text-primary mb-4">PRICE vs IIV COMPARISON</div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={selectedCars.filter(Boolean).map((car, i) => ({
                          name: `${car!.year} ${car!.colour?.split(" ")[0]}`,
                          "Asking Price": car!.askingPrice,
                          "IIV (Fair Value)": car!.details?.iiv ?? 0,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DC" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={(v) => fmtK(v)} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Legend />
                          <Bar dataKey="Asking Price" fill="#C8102E" />
                          <Bar dataKey="IIV (Fair Value)" fill="#1e293b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Key strengths/weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCars.filter(Boolean).map((car, i) => {
                    const strengths: string[] = [];
                    const weaknesses: string[] = [];
                    try {
                      if (car!.details?.keyStrengths) strengths.push(...JSON.parse(car!.details.keyStrengths));
                      if (car!.details?.keyWeaknesses) weaknesses.push(...JSON.parse(car!.details.keyWeaknesses));
                    } catch {}
                    return (
                      <div key={i} className="bg-white border border-[#E8E4DC] p-4">
                        <div className="data-label text-[10px] text-primary mb-2">
                          CAR {i + 1} — {car!.year} {car!.colour}
                        </div>
                        {strengths.length > 0 && (
                          <div className="mb-3">
                            <div className="data-label text-[9px] text-emerald-700 mb-1">STRENGTHS</div>
                            {strengths.slice(0, 3).map((s, j) => (
                              <div key={j} className="flex items-start gap-1.5 text-xs text-foreground mb-1">
                                <span className="text-emerald-600 mt-0.5">✓</span> {s}
                              </div>
                            ))}
                          </div>
                        )}
                        {weaknesses.length > 0 && (
                          <div>
                            <div className="data-label text-[9px] text-red-600 mb-1">WEAKNESSES</div>
                            {weaknesses.slice(0, 3).map((w, j) => (
                              <div key={j} className="flex items-start gap-1.5 text-xs text-foreground mb-1">
                                <span className="text-red-500 mt-0.5">✗</span> {w}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!selectedCars.some(Boolean) && (
              <div className="text-center py-24 border border-dashed border-[#E8E4DC] bg-white">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 text-primary/30" />
                <p className="font-serif text-lg text-foreground mb-1">Select cars to compare</p>
                <p className="text-sm text-muted-foreground">Choose up to 3 cars from the dropdowns above to see a side-by-side comparison.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

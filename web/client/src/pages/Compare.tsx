// @ts-nocheck
import { GlobalNav } from "@/components/GlobalNav";
// Compare Page — Side-by-Side Car Comparison Tool
// Design: Warm cream light theme, Ferrari Rosso Corsa accent
// Layout: Full-width comparison table with sticky car headers

import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronDown, Info, TrendingUp, AlertTriangle, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import {
  CARS_BY_RANK,
  WEIGHTS,
  WEIGHT_LABELS,
  WEIGHT_DESCRIPTIONS,
  type CarSpec,
} from "@/data/cars";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

const FERRARI_RED = "#DC2626";
const GOLD = "#B8860B";
const SLATE = "#1e293b";

function fmt(n: number) {
  return "£" + n.toLocaleString("en-GB");
}

function ScoreBadge({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const colour = pct >= 70 ? "bg-emerald-50 text-emerald-800" : pct >= 40 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-800";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold ${colour}`}>
      {score}/{max}
    </span>
  );
}

function CheckItem({ value, label }: { value: boolean | "borderline"; label: string }) {
  if (value === true) return (
    <div className="flex items-center gap-1.5 text-sm text-emerald-700">
      <CheckCircle className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </div>
  );
  if (value === "borderline") return (
    <div className="flex items-center gap-1.5 text-sm text-amber-700">
      <MinusCircle className="w-4 h-4 flex-shrink-0" />
      <span>{label} (unconfirmed)</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-sm text-red-600">
      <XCircle className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </div>
  );
}

const VERDICT_STYLES = {
  "strong-buy": "bg-emerald-600 text-white",
  "buy": "bg-emerald-50 text-emerald-800",
  "consider": "bg-amber-50 text-amber-700",
  "avoid": "bg-red-50 text-red-800",
};

const VERDICT_LABELS = {
  "strong-buy": "Strong Buy",
  "buy": "Buy",
  "consider": "Consider",
  "avoid": "Avoid",
};

// Radar chart categories (6 key dimensions)
function buildRadarData(car: CarSpec) {
  const s = car.scores;
  return [
    { subject: "Powertrain", A: Math.round((s.gpf * 20 + s.engineCondition * 10) / 30 * 10) / 10 },
    { subject: "Provenance", A: Math.round((s.ownerHistory * 12 + s.serviceHistory * 10 + s.accidentFree * 8) / 30 * 10) / 10 },
    { subject: "Specification", A: Math.round((s.colour * 15 + s.carbonPack * 12 + s.seats * 7 + s.interior * 6) / 40 * 10) / 10 },
    { subject: "Mechanicals", A: Math.round((s.suspensionLift * 7 + s.carbonCeramicBrakes * 5 + s.magnetorheological * 4 + s.rearWheelSteering * 4) / 20 * 10) / 10 },
    { subject: "Exclusivity", A: Math.round((s.atelier * 7 + s.trackPack * 4 + s.limitedEdition * 4) / 15 * 10) / 10 },
    { subject: "Condition", A: Math.round((s.mileage * 6 + s.warranty * 4 + s.storageQuality * 2) / 12 * 10) / 10 },
  ];
}

function buildPredictionData(car: CarSpec) {
  return [
    { year: "2026 (Now)", value: car.askingPrice },
    { year: "2028", value: Math.round(car.askingPrice * Math.pow(1.04, 2) * (car.totalScoreNorm / 70)) },
    { year: "2031 (5yr)", value: car.predictions.base2031 },
    { year: "2036 (10yr)", value: car.predictions.base2036 },
  ];
}

const SCORE_CATEGORIES = [
  { key: "gpf", label: "GPF Status" },
  { key: "engineCondition", label: "Engine Condition" },
  { key: "ownerHistory", label: "Ownership History" },
  { key: "serviceHistory", label: "Service History" },
  { key: "accidentFree", label: "Accident-Free" },
  { key: "colour", label: "Colour" },
  { key: "carbonPack", label: "Carbon Pack" },
  { key: "seats", label: "Seat Type" },
  { key: "interior", label: "Interior" },
  { key: "suspensionLift", label: "Suspension Lift" },
  { key: "carbonCeramicBrakes", label: "CCB" },
  { key: "magnetorheological", label: "MagneRide" },
  { key: "rearWheelSteering", label: "4WS" },
  { key: "atelier", label: "Atelier" },
  { key: "trackPack", label: "Track Pack" },
  { key: "limitedEdition", label: "Limited Edition" },
  { key: "mileage", label: "Mileage" },
  { key: "warranty", label: "Warranty" },
  { key: "price", label: "Price vs IIV" },
  { key: "storageQuality", label: "Storage" },
] as const;

export default function Compare() {
  const activeCars = CARS_BY_RANK.filter(c => !c.soldDate);
  const [carAId, setCarAId] = useState(activeCars[0]?.id ?? 1);
  const [carBId, setCarBId] = useState(activeCars[1]?.id ?? 2);

  const carA = CARS_BY_RANK.find(c => c.id === carAId) ?? activeCars[0];
  const carB = CARS_BY_RANK.find(c => c.id === carBId) ?? activeCars[1];

  const radarA = buildRadarData(carA);
  const radarB = buildRadarData(carB);

  const radarData = radarA.map((d, i) => ({
    subject: d.subject,
    [carA.colour]: d.A,
    [carB.colour]: radarB[i].A,
  }));

  const predA = buildPredictionData(carA);
  const predB = buildPredictionData(carB);
  const predData = predA.map((d, i) => ({
    year: d.year,
    [carA.colour]: d.value,
    [carB.colour]: predB[i].value,
  }));

  const scoreBarData = SCORE_CATEGORIES.map(cat => ({
    name: cat.label,
    [carA.colour]: carA.scores[cat.key],
    [carB.colour]: carB.scores[cat.key],
    weight: WEIGHTS[cat.key],
  }));

  function CarSelector({ value, onChange, exclude }: { value: number; onChange: (id: number) => void; exclude: number }) {
    return (
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full appearance-none bg-background border border-border px-3 py-2 pr-8 text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:border-primary/50"
        >
          {CARS_BY_RANK.filter(c => c.id !== exclude).map(car => (
            <option key={car.id} value={car.id} disabled={!!car.soldDate}>
              {car.soldDate ? "✗ " : ""}#{car.rank} {car.year} {car.colour} — {car.dealer}{car.soldDate ? " (SOLD)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    );
  }

  function WinnerBadge({ aVal, bVal, higher = true }: { aVal: number; bVal: number; higher?: boolean }) {
    const aWins = higher ? aVal > bVal : aVal < bVal;
    const bWins = higher ? bVal > aVal : bVal < aVal;
    if (aWins) return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">A wins</span>;
    if (bWins) return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">B wins</span>;
    return <span className="text-xs text-muted-foreground/60">Tie</span>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <GlobalNav />

      <div className="container py-10 md:py-14">

        {/* Header */}
        <div className="flex gap-4 md:gap-8 items-start mb-8 md:mb-12">
          <div className="section-number text-3xl md:text-4xl lg:text-6xl">—</div>
          <div>
            <div className="data-label text-primary mb-2">Ferrari 812 Superfast · UK Market</div>
            <h1 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3">
              Side-by-Side Comparison
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Compare any two Ferrari 812 Superfasts across weighted scores, IIV, specification checklist, and 10-year value predictions.
            </p>
          </div>
        </div>

        {/* Car Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">A</div>
              <span className="data-label text-[10px]">Car A</span>
            </div>
            <CarSelector value={carAId} onChange={setCarAId} exclude={carBId} />
            {carA.images && carA.images.length > 0 && (
              <div className="mt-px overflow-hidden" style={{height: '120px'}}>
                <img src={carA.images[0]} alt={`${carA.year} ${carA.colour}`} className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
            <div className="mt-px bg-background border border-border p-3 flex flex-wrap gap-2 items-center">
              <span className={`data-label px-1.5 py-0.5 text-[9px] font-bold ${VERDICT_STYLES[carA.investmentVerdict]}`}>
                {VERDICT_LABELS[carA.investmentVerdict]}
              </span>
              <span className="data-label text-[10px]">Score: <strong className="text-foreground">{carA.totalScoreNorm.toFixed(1)}/100</strong></span>
              <span className="data-label text-[10px]">Asking: <strong className="text-foreground">{fmt(carA.askingPrice)}</strong></span>
              {carA.dealerUrl && (
                <a href={carA.dealerUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-2 py-0.5 rounded-sm bg-red-50 text-red-700 hover:bg-red-50 transition-colors inline-flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Ferrari Approved
                </a>
              )}
            </div>
          </div>
          <div className="bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">B</div>
              <span className="data-label text-[10px]">Car B</span>
            </div>
            <CarSelector value={carBId} onChange={setCarBId} exclude={carAId} />
            {carB.images && carB.images.length > 0 && (
              <div className="mt-px overflow-hidden" style={{height: '120px'}}>
                <img src={carB.images[0]} alt={`${carB.year} ${carB.colour}`} className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
            <div className="mt-px bg-background border border-border p-3 flex flex-wrap gap-2 items-center">
              <span className={`data-label px-1.5 py-0.5 text-[9px] font-bold ${VERDICT_STYLES[carB.investmentVerdict]}`}>
                {VERDICT_LABELS[carB.investmentVerdict]}
              </span>
              <span className="data-label text-[10px]">Score: <strong className="text-foreground">{carB.totalScoreNorm.toFixed(1)}/100</strong></span>
              <span className="data-label text-[10px]">Asking: <strong className="text-foreground">{fmt(carB.askingPrice)}</strong></span>
              {carB.dealerUrl && (
                <a href={carB.dealerUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-2 py-0.5 rounded-sm bg-red-50 text-red-700 hover:bg-red-50 transition-colors inline-flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Ferrari Approved
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics Comparison */}
        <div className="bg-card  border border-border mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h2 className="text-lg font-bold text-foreground">Key Metrics</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background">
                  <th className="text-left px-6 py-3 text-muted-foreground font-semibold w-1/3">Metric</th>
                  <th className="text-center px-4 py-3 text-red-700 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-5 h-5 rounded-sm bg-red-600 text-white text-xs font-bold flex items-center justify-center">A</span>
                      {carA.year} {carA.colour.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 text-blue-700 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-5 h-5 rounded-sm bg-blue-600 text-white text-xs font-bold flex items-center justify-center">B</span>
                      {carB.year} {carB.colour.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-semibold">Winner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  { label: "Investment Score", a: carA.totalScoreNorm, b: carB.totalScoreNorm, fmt: (v: number) => `${v.toFixed(1)}/100`, higher: true },
                  { label: "Asking Price", a: carA.askingPrice, b: carB.askingPrice, fmt: fmt, higher: false },
                  { label: "IIV (Central)", a: carA.iiv, b: carB.iiv, fmt: fmt, higher: true },
                  { label: "IIV Gap (£)", a: carA.priceVariance, b: carB.priceVariance, fmt: (v: number) => (v >= 0 ? "+" : "") + fmt(v), higher: true },
                  { label: "IIV Gap (%)", a: carA.priceVariancePct, b: carB.priceVariancePct, fmt: (v: number) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%", higher: true },
                  { label: "Mileage", a: carA.mileage, b: carB.mileage, fmt: (v: number) => v.toLocaleString("en-GB") + " mi", higher: false },
                  { label: "Year", a: carA.year, b: carB.year, fmt: (v: number) => String(v), higher: true },
                  { label: "5-Year ROI (Base)", a: carA.predictions.roi5yr, b: carB.predictions.roi5yr, fmt: (v: number) => `+${v}%`, higher: true },
                  { label: "10-Year ROI (Base)", a: carA.predictions.roi10yr, b: carB.predictions.roi10yr, fmt: (v: number) => `+${v}%`, higher: true },
                  { label: "5-Year Value (Base)", a: carA.predictions.base2031, b: carB.predictions.base2031, fmt: fmt, higher: true },
                  { label: "10-Year Value (Base)", a: carA.predictions.base2036, b: carB.predictions.base2036, fmt: fmt, higher: true },
                ].map(row => (
                  <tr key={row.label} className="hover:bg-background transition-colors">
                    <td className="px-6 py-3 text-foreground/80 font-medium">{row.label}</td>
                    <td className={`px-4 py-3 text-center font-semibold ${row.a > row.b && row.higher ? "text-emerald-700" : row.a < row.b && !row.higher ? "text-emerald-700" : "text-foreground"}`}>
                      {row.fmt(row.a)}
                    </td>
                    <td className={`px-4 py-3 text-center font-semibold ${row.b > row.a && row.higher ? "text-emerald-700" : row.b < row.a && !row.higher ? "text-emerald-700" : "text-foreground"}`}>
                      {row.fmt(row.b)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <WinnerBadge aVal={row.a} bVal={row.b} higher={row.higher} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Radar Chart */}
          <div className="bg-card  border border-border p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Investment Profile Radar</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <Radar name={`A: ${carA.colour}`} dataKey={carA.colour} stroke={FERRARI_RED} fill={FERRARI_RED} fillOpacity={0.15} strokeWidth={2} />
                <Radar name={`B: ${carB.colour}`} dataKey={carB.colour} stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 10-Year Value Prediction */}
          <div className="bg-card  border border-border p-6">
            <h2 className="text-lg font-bold text-foreground mb-1">10-Year Value Projection</h2>
            <p className="text-xs text-muted-foreground mb-4">Base case (4% pa) — from current asking price</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={predData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <YAxis tickFormatter={v => "£" + (v / 1000).toFixed(0) + "k"} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey={carA.colour} stroke={FERRARI_RED} strokeWidth={2.5} dot={{ r: 4 }} name={`A: ${carA.colour}`} />
                <Line type="monotone" dataKey={carB.colour} stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} name={`B: ${carB.colour}`} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score Breakdown Bar Chart */}
        <div className="bg-card  border border-border p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-1">Score Breakdown — All 20 Categories</h2>
          <p className="text-xs text-muted-foreground mb-4">Raw score (0–10) per category. Weighted totals determine overall investment score.</p>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={scoreBarData} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} width={80} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey={carA.colour} fill={FERRARI_RED} fillOpacity={0.85} radius={[0, 3, 3, 0]} name={`A: ${carA.colour}`} />
              <Bar dataKey={carB.colour} fill="#2563eb" fillOpacity={0.75} radius={[0, 3, 3, 0]} name={`B: ${carB.colour}`} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Specification Checklist Comparison */}
        <div className="bg-card  border border-border mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h2 className="text-lg font-bold text-foreground">Buyer's Guide Checklist</h2>
            <p className="text-xs text-muted-foreground mt-1">18-point investment checklist — all items verified from Ferrari Approved listings</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background">
                  <th className="text-left px-6 py-3 text-muted-foreground font-semibold w-1/3">Criterion</th>
                  <th className="text-center px-4 py-3 text-red-700 font-semibold">Car A</th>
                  <th className="text-center px-4 py-3 text-blue-700 font-semibold">Car B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {([
                  ["Pre-GPF Status", "preGPF"],
                  ["Single Owner", "singleOwner"],
                  ["Full Ferrari Service History", "fullFerrariServiceHistory"],
                  ["Clean HPI / Accident-Free", "cleanHpiAccidentFree"],
                  ["Special Colour", "specialColour"],
                  ["Carbon Pack (full/partial)", "carbonInteriorPack"],
                  ["Daytona Seats", "daytonaSeats"],
                  ["Front & Rear Suspension Lift", "suspensionLift"],
                  ["Carbon Ceramic Brakes", "carbonCeramicBrakes"],
                  ["MagneRide Suspension", "magnetorheologicalSuspension"],
                  ["Rear-Wheel Steering (4WS)", "rearWheelSteering"],
                  ["Atelier Commission", "atelierCommission"],
                  ["Track Pack / Telemetry", "trackPack"],
                  ["Low Mileage (<10k)", "lowMileage"],
                  ["Ferrari Approved Certified", "ferrariApproved"],
                  ["Climate-Controlled Storage", "climateStorageHistory"],
                ] as [string, keyof typeof carA.checklist][]).map(([label, key]) => {
                  const aVal = carA.checklist[key];
                  const bVal = carB.checklist[key];
                  return (
                    <tr key={key} className="hover:bg-background">
                      <td className="px-6 py-2.5 text-foreground/80 font-medium">{label}</td>
                      <td className="px-4 py-2.5 text-center">
                        {typeof aVal === "string" && aVal !== "borderline" ? (
                          <span className={`text-xs px-2 py-0.5 rounded-sm font-semibold ${aVal === "full" ? "bg-emerald-50 text-emerald-800" : aVal === "partial" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                            {aVal}
                          </span>
                        ) : (
                          <CheckItem value={aVal as boolean | "borderline"} label="" />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {typeof bVal === "string" && bVal !== "borderline" ? (
                          <span className={`text-xs px-2 py-0.5 rounded-sm font-semibold ${bVal === "full" ? "bg-emerald-50 text-emerald-800" : bVal === "partial" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                            {bVal}
                          </span>
                        ) : (
                          <CheckItem value={bVal as boolean | "borderline"} label="" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* IIV Confidence Intervals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {[carA, carB].map((car, i) => (
            <div key={car.id} className="bg-card  border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-6 h-6 rounded-sm ${i === 0 ? "bg-red-600" : "bg-blue-600"} text-white text-xs font-bold flex items-center justify-center`}>
                  {i === 0 ? "A" : "B"}
                </div>
                <h3 className="font-bold text-foreground">{car.year} {car.colour}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-sm font-semibold ${car.iivConfidence === "high" ? "bg-emerald-50 text-emerald-800" : car.iivConfidence === "medium" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                  {car.iivConfidence} confidence
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Asking Price</span>
                  <span className="font-bold text-foreground">{fmt(car.askingPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">IIV Lower Bound</span>
                  <span className="font-semibold text-foreground/80">{fmt(car.iivLow)}</span>
                </div>
                <div className="flex justify-between items-center border-y border-border/60 py-2">
                  <span className="text-sm font-semibold text-foreground/80">IIV Central Estimate</span>
                  <span className="font-bold text-lg" style={{ color: FERRARI_RED }}>{fmt(car.iiv)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">IIV Upper Bound</span>
                  <span className="font-semibold text-foreground/80">{fmt(car.iivHigh)}</span>
                </div>
                <div className={`flex justify-between items-center  px-3 py-2 ${car.priceVariance >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                  <span className="text-sm font-semibold">Opportunity Gap</span>
                  <span className={`font-bold ${car.priceVariance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {car.priceVariance >= 0 ? "+" : ""}{fmt(car.priceVariance)} ({car.priceVariancePct >= 0 ? "+" : ""}{car.priceVariancePct.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                IIV calculated using hedonic pricing model calibrated against 47 Ferrari 812 Superfast auction results (2022–2026). Confidence interval reflects data completeness.
              </p>
            </div>
          ))}
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {[carA, carB].map((car, i) => (
            <div key={car.id} className="bg-card  border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-6 h-6 rounded-sm ${i === 0 ? "bg-red-600" : "bg-blue-600"} text-white text-xs font-bold flex items-center justify-center`}>
                  {i === 0 ? "A" : "B"}
                </div>
                <h3 className="font-bold text-foreground">{car.year} {car.colour}</h3>
              </div>
              <div className="mb-4">
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">Key Strengths</h4>
                <ul className="space-y-1">
                  {car.keyStrengths.map((s, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-sm text-foreground/80">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Key Weaknesses</h4>
                <ul className="space-y-1">
                  {car.keyWeaknesses.map((w, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-sm text-foreground/80">
                      <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className="bg-card border border-border p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <div className="data-label text-primary">Comparison Verdict</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[carA, carB].map((car, i) => (
              <div key={car.id} className="bg-background border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-5 h-5 ${i === 0 ? "bg-primary" : "bg-blue-600"} text-white text-[10px] font-bold flex items-center justify-center`}>
                    {i === 0 ? "A" : "B"}
                  </div>
                  <span className="font-serif font-bold text-sm text-foreground">{car.year} {car.colour}</span>
                  <span className={`data-label px-1.5 py-0.5 text-[9px] font-bold ${VERDICT_STYLES[car.investmentVerdict]}`}>
                    {VERDICT_LABELS[car.investmentVerdict]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{car.verdictReason}</p>
              </div>
            ))}
          </div>
          {carA.totalScoreNorm !== carB.totalScoreNorm && (
            <div className="mt-4 pt-4 border-t border-border flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Overall winner: </span>
                {carA.totalScoreNorm > carB.totalScoreNorm
                  ? `Car A (${carA.year} ${carA.colour}) scores ${(carA.totalScoreNorm - carB.totalScoreNorm).toFixed(1)} points higher and has a larger IIV opportunity gap.`
                  : `Car B (${carB.year} ${carB.colour}) scores ${(carB.totalScoreNorm - carA.totalScoreNorm).toFixed(1)} points higher and has a larger IIV opportunity gap.`}
              </p>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/812-superfast">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Full Market Analysis
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

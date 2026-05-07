import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

// ─── Finance formulas ──────────────────────────────────────────────────────────

/**
 * Standard annuity monthly payment formula:
 *   P = principal (amount financed)
 *   r = monthly interest rate (APR / 12 / 100)
 *   n = number of months
 *   F = future value / balloon (0 for HP)
 *
 *   monthly = (P * r * (1+r)^n - F * r) / ((1+r)^n - 1)
 */
function calcMonthlyPayment(principal: number, aprPct: number, months: number, balloon: number): number {
  if (aprPct === 0) return (principal - balloon) / months;
  const r = aprPct / 100 / 12;
  const pow = Math.pow(1 + r, months);
  return (principal * r * pow - balloon * r) / (pow - 1);
}

/**
 * PCP Guaranteed Future Value (GFV) — simplified UK model.
 * The GFV is the lender's estimate of the car's residual value at end of term.
 * For a Ferrari 812 Superfast (strong residuals), we use:
 *   - 48 months / 8k mi/yr: ~55% of purchase price
 *   - 36 months / 8k mi/yr: ~62%
 *   - 60 months / 8k mi/yr: ~48%
 * Mileage adjusts the GFV: each 1k miles above 8k/yr reduces GFV by ~0.8%
 */
function calcGFV(vehiclePrice: number, months: number, annualMileage: number): number {
  // Base residual by term
  const baseResiduals: Record<number, number> = {
    24: 0.68,
    36: 0.62,
    48: 0.55,
    60: 0.48,
  };
  const base = baseResiduals[months] ?? 0.55;
  // Mileage adjustment: ±0.8% per 1k miles vs 8k/yr baseline
  const mileageDelta = (annualMileage - 8000) / 1000;
  const mileageAdj = mileageDelta * 0.008;
  const residual = Math.max(0.3, Math.min(0.80, base - mileageAdj));
  return Math.round(vehiclePrice * residual);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FinanceCalculatorProps {
  vehiclePrice: number;
  iivPrice?: number;
  carTitle?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function FinanceCalculator({ vehiclePrice, iivPrice, carTitle }: FinanceCalculatorProps) {
  const [mode, setMode] = useState<"pcp" | "hp">("pcp");
  const [depositPct, setDepositPct] = useState(10); // % of vehicle price
  const [termMonths, setTermMonths] = useState(48);
  const [apr, setApr] = useState(9.9);
  const [annualMileage, setAnnualMileage] = useState(8000);

  const depositAmount = Math.round((depositPct / 100) * vehiclePrice);
  const financed = vehiclePrice - depositAmount;

  const results = useMemo(() => {
    const balloon = mode === "pcp" ? calcGFV(vehiclePrice, termMonths, annualMileage) : 0;
    const monthly = calcMonthlyPayment(financed, apr, termMonths, balloon);
    const totalMonthlyPayments = monthly * termMonths;
    const totalPayable = depositAmount + totalMonthlyPayments + (mode === "pcp" ? 0 : 0);
    const totalInterest = totalPayable - vehiclePrice + (mode === "pcp" ? balloon : 0) - balloon;
    const costOfCredit = totalMonthlyPayments + depositAmount - vehiclePrice + balloon;

    return {
      monthly: Math.max(0, monthly),
      balloon,
      totalMonthlyPayments,
      totalPayable: depositAmount + totalMonthlyPayments + (mode === "pcp" ? balloon : 0),
      costOfCredit: Math.max(0, costOfCredit),
      totalInterest: Math.max(0, totalInterest),
    };
  }, [mode, depositPct, termMonths, apr, annualMileage, vehiclePrice, financed, depositAmount]);

  // IIV context: monthly equivalent of the price gap
  const iivGap = iivPrice ? iivPrice - vehiclePrice : 0;
  const iivMonthlyEquiv = iivGap > 0 ? Math.round(iivGap / termMonths) : 0;

  const fmt = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;
  const fmtM = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}/mo`;

  const TERM_OPTIONS = [24, 36, 48, 60];

  return (
    <section className="border border-border bg-card rounded-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-0.5">Finance Calculator</div>
          <h3 className="font-serif text-lg font-bold text-foreground">
            {carTitle ? `Finance this ${carTitle}` : "Estimate your monthly payments"}
          </h3>
        </div>
        {/* Mode toggle */}
        <div className="flex gap-1 bg-muted rounded-sm p-0.5">
          {(["pcp", "hp"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-semibold tracking-wide rounded-sm transition-colors ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* ── Left: Inputs ── */}
        <div className="px-5 py-5 space-y-5">
          {/* Vehicle price (read-only) */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Vehicle price</span>
            <span className="font-mono font-semibold text-foreground">{fmt(vehiclePrice)}</span>
          </div>

          {/* Deposit slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <label className="text-muted-foreground">Deposit</label>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-foreground">{fmt(depositAmount)}</span>
                <span className="text-xs text-muted-foreground">({depositPct}%)</span>
              </div>
            </div>
            <Slider
              min={0}
              max={50}
              step={1}
              value={[depositPct]}
              onValueChange={([v]) => setDepositPct(v)}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>£0</span>
              <span>{fmt(vehiclePrice * 0.5)}</span>
            </div>
          </div>

          {/* Term selector */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Term</div>
            <div className="flex gap-1.5">
              {TERM_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTermMonths(t)}
                  className={`flex-1 py-1.5 text-xs font-semibold border transition-colors ${
                    termMonths === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {t}mo
                </button>
              ))}
            </div>
          </div>

          {/* APR slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <label className="text-muted-foreground">APR</label>
              <span className="font-mono font-semibold text-foreground">{apr.toFixed(1)}%</span>
            </div>
            <Slider
              min={4}
              max={25}
              step={0.1}
              value={[apr]}
              onValueChange={([v]) => setApr(v)}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>4.0%</span>
              <span className="text-muted-foreground/60">Representative 9.9%</span>
              <span>25.0%</span>
            </div>
          </div>

          {/* Annual mileage (PCP only) */}
          {mode === "pcp" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label className="text-muted-foreground">Annual mileage</label>
                <span className="font-mono font-semibold text-foreground">{annualMileage.toLocaleString("en-GB")} mi</span>
              </div>
              <Slider
                min={2000}
                max={20000}
                step={1000}
                value={[annualMileage]}
                onValueChange={([v]) => setAnnualMileage(v)}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>2k mi</span>
                <span>20k mi</span>
              </div>
            </div>
          )}

          {/* Mode explanation */}
          <div className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-3">
            {mode === "pcp" ? (
              <>
                <strong className="text-foreground">PCP:</strong> You pay the depreciation only. At the end of the term you can pay the Guaranteed Future Value ({fmt(results.balloon)}) to own the car, hand it back, or part-exchange.
              </>
            ) : (
              <>
                <strong className="text-foreground">HP:</strong> You pay off the full vehicle value over the term. You own the car outright at the end — no balloon payment required.
              </>
            )}
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Monthly payment — hero figure */}
          <div className="bg-muted/50 border border-border px-5 py-4 text-center">
            <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">Monthly Payment</div>
            <div className="font-serif text-4xl font-black text-primary">
              {fmtM(results.monthly)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {apr.toFixed(1)}% APR · {termMonths} months · {fmt(depositAmount)} deposit
            </div>
          </div>

          {/* Breakdown table */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Amount financed</span>
              <span className="font-mono font-semibold">{fmt(financed)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Deposit</span>
              <span className="font-mono font-semibold">{fmt(depositAmount)}</span>
            </div>
            {mode === "pcp" && (
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">
                  Balloon / GFV
                  <span className="ml-1 text-[10px] text-muted-foreground/60">(optional final payment)</span>
                </span>
                <span className="font-mono font-semibold">{fmt(results.balloon)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Total interest</span>
              <span className="font-mono font-semibold text-amber-600">{fmt(results.costOfCredit)}</span>
            </div>
            <div className="flex justify-between py-1.5 font-semibold">
              <span className="text-foreground">Total amount payable</span>
              <span className="font-mono">{fmt(results.totalPayable)}</span>
            </div>
          </div>

          {/* IIV context row */}
          {iivGap > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-800/40 px-4 py-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 text-base leading-none mt-0.5">↑</span>
                <div>
                  <span className="text-emerald-300 font-semibold">
                    {fmt(iivGap)} below implied value
                  </span>
                  <span className="text-emerald-300/70 ml-1">
                    — equivalent to saving {fmt(iivMonthlyEquiv)}/mo vs. a fairly-priced example over {termMonths} months.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
            Illustrative only. Actual rates depend on your credit profile and lender. Representative APR 9.9% shown for reference. GFV is an estimate based on typical Ferrari residual values and may differ from lender quotes.
          </p>
        </div>
      </div>
    </section>
  );
}

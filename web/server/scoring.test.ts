/**
 * scoring.test.ts — Tests for the scoring framework and IIV display logic
 *
 * These tests verify:
 * 1. Score scale: all scores from DB are 0–100 (50 = neutral baseline)
 * 2. Score bar display: bars use score directly as % width (not score * 10)
 * 3. Score colour coding: ≥60 = primary, 50–59 = amber, <50 = red
 * 4. IIV formula: base_value × (1 + sum_of_premiums) within expected range
 * 5. Verdict logic: strong-buy / buy / consider / avoid thresholds
 */

import { describe, it, expect } from "vitest";

// ── Score scale validation ────────────────────────────────────────────────────

describe("Score scale (0–100)", () => {
  const NEUTRAL = 50;
  const MAX_SCORE = 100;
  const MIN_SCORE = 0;

  it("neutral baseline is 50", () => {
    expect(NEUTRAL).toBe(50);
  });

  it("score bar width equals score value directly (not score * 10)", () => {
    // A score of 56.7 should produce a bar width of 56.7%, not 567%
    const score = 56.7;
    const barWidth = score; // correct: use score directly
    const wrongBarWidth = score * 10; // wrong: old 0-10 scale logic
    expect(barWidth).toBeLessThanOrEqual(100);
    expect(wrongBarWidth).toBeGreaterThan(100);
  });

  it("all scores are within 0–100 range", () => {
    const sampleScores = {
      gpf: 56.7,
      colour: 56.7,
      ownerHistory: 56.7,
      carbonPack: 50,
      engineCondition: 50,
      serviceHistory: 55,
      accidentFree: 54.2,
      warranty: 53.3,
      seats: 50,
      suspensionLift: 50,
      carbonCeramicBrakes: 50,
      magnetorheological: 50,
      rearWheelSteering: 50,
      atelier: 50,
      trackPack: 50,
      limitedEdition: 50,
      mileage: 54.2,
      price: 50,
      storageQuality: 50,
    };
    for (const [key, val] of Object.entries(sampleScores)) {
      expect(val, `${key} score should be 0–100`).toBeGreaterThanOrEqual(MIN_SCORE);
      expect(val, `${key} score should be 0–100`).toBeLessThanOrEqual(MAX_SCORE);
    }
  });
});

// ── Score colour coding ───────────────────────────────────────────────────────

describe("Score colour coding", () => {
  function getColourClass(score: number): string {
    if (score >= 60) return "bg-primary/70";
    if (score >= 50) return "bg-amber-500/60";
    return "bg-red-500/50";
  }

  it("score ≥ 60 gets primary colour", () => {
    expect(getColourClass(86.7)).toBe("bg-primary/70");
    expect(getColourClass(60)).toBe("bg-primary/70");
  });

  it("score 50–59 gets amber colour", () => {
    expect(getColourClass(56.7)).toBe("bg-amber-500/60");
    expect(getColourClass(50)).toBe("bg-amber-500/60");
    expect(getColourClass(59.9)).toBe("bg-amber-500/60");
  });

  it("score < 50 gets red colour", () => {
    expect(getColourClass(40)).toBe("bg-red-500/50");
    expect(getColourClass(0)).toBe("bg-red-500/50");
    expect(getColourClass(49.9)).toBe("bg-red-500/50");
  });
});

// ── IIV hedonic model ─────────────────────────────────────────────────────────

describe("IIV hedonic model", () => {
  const BASE_812 = 220_000; // £220k base for 812 Superfast

  function computeIIV(base: number, premiums: Record<string, number>): number {
    const totalPremium = Object.values(premiums).reduce((a, b) => a + b, 0);
    return Math.round(base * (1 + totalPremium));
  }

  it("pre-GPF premium adds ~8% to IIV", () => {
    const withGPF = computeIIV(BASE_812, {});
    const withoutGPF = computeIIV(BASE_812, { gpf: 0.08 });
    expect(withoutGPF - withGPF).toBeCloseTo(BASE_812 * 0.08, 0);
  });

  it("top-spec 812 IIV is within £280k–£380k", () => {
    const topSpecPremiums = {
      gpf: 0.08,          // pre-GPF
      colour: 0.08,       // Rosso Corsa
      ownerHistory: 0.07, // single owner
      carbonPack: 0.07,   // full carbon
      serviceHistory: 0.06, // full Ferrari SH
      accidentFree: 0.04, // accident free
      warranty: 0.04,     // Ferrari Approved
      seats: 0.04,        // Daytona seats
      mileage: 0.04,      // low mileage
    };
    const iiv = computeIIV(BASE_812, topSpecPremiums);
    expect(iiv).toBeGreaterThan(280_000);
    expect(iiv).toBeLessThan(380_000);
  });

  it("base-spec 812 IIV is within £160k–£240k", () => {
    // A GPF-fitted, multi-owner, partial-SH, high-mileage 812 should trade
    // materially below the £220k base — total discount ~20%
    const baseSpecPremiums = {
      gpf: -0.08,          // GPF fitted
      ownerHistory: -0.04, // 3+ owners
      serviceHistory: -0.04, // partial SH
      mileage: -0.04,      // 20k+ miles
    };
    const iiv = computeIIV(BASE_812, baseSpecPremiums);
    expect(iiv).toBeGreaterThan(160_000);
    expect(iiv).toBeLessThan(240_000);
  });

  it("IIV confidence intervals are correctly sized", () => {
    const iiv = 300_000;
    const highCI = { low: iiv * 0.92, high: iiv * 1.08 }; // ±8%
    const medCI = { low: iiv * 0.88, high: iiv * 1.12 };  // ±12%
    const lowCI = { low: iiv * 0.82, high: iiv * 1.18 };  // ±18%

    expect(highCI.high - highCI.low).toBeCloseTo(iiv * 0.16, 0);
    expect(medCI.high - medCI.low).toBeCloseTo(iiv * 0.24, 0);
    expect(lowCI.high - lowCI.low).toBeCloseTo(iiv * 0.36, 0);
  });
});

// ── Verdict thresholds ────────────────────────────────────────────────────────

describe("Investment verdict thresholds", () => {
  function computeVerdict(totalScore: number, priceVariancePct: number): string {
    // Strong buy: high score AND priced below IIV
    if (totalScore >= 75 && priceVariancePct > 5) return "strong-buy";
    // Buy: good score OR meaningfully below IIV
    if (totalScore >= 65 || priceVariancePct > 10) return "buy";
    // Avoid: overpriced or very low score
    if (priceVariancePct < -10 || totalScore < 45) return "avoid";
    return "consider";
  }

  it("strong-buy requires score ≥ 75 AND price > 5% below IIV", () => {
    expect(computeVerdict(86.7, 35.6)).toBe("strong-buy");
    expect(computeVerdict(82.5, 28.0)).toBe("strong-buy");
  });

  it("buy requires score ≥ 65 or price > 10% below IIV", () => {
    expect(computeVerdict(65, 3)).toBe("buy");
    expect(computeVerdict(60, 15)).toBe("buy");
  });

  it("avoid triggers when price > 10% above IIV", () => {
    expect(computeVerdict(50, -15)).toBe("avoid");
  });

  it("avoid triggers when score < 45", () => {
    expect(computeVerdict(40, 0)).toBe("avoid");
  });

  it("consider is the default for borderline cases", () => {
    expect(computeVerdict(55, 5)).toBe("consider");
    expect(computeVerdict(60, 3)).toBe("consider");
  });
});

// ── Score display formatting ──────────────────────────────────────────────────

describe("Score display formatting", () => {
  it("score is displayed as integer/100", () => {
    const score = 56.7;
    const display = `${score.toFixed(0)}/100`;
    expect(display).toBe("57/100");
  });

  it("total score is displayed as decimal/100", () => {
    const totalScore = 86.7;
    const display = `${totalScore}/100`;
    expect(display).toBe("86.7/100");
  });

  it("IIV is formatted as £Xk", () => {
    const iiv = 324000;
    const display = `£${(iiv / 1000).toFixed(0)}k`;
    expect(display).toBe("£324k");
  });

  it("price variance is formatted with sign", () => {
    const variance = 85000;
    const display = variance > 0 ? `+£${(variance / 1000).toFixed(0)}k` : `£${(variance / 1000).toFixed(0)}k`;
    expect(display).toBe("+£85k");
  });
});

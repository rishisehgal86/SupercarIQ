/**
 * Per-car verdict calculation — independent of model-level investment verdict.
 *
 * The verdict is computed from two inputs:
 *   - totalScoreNorm: the car's normalised quality/spec score (0–100)
 *   - priceVariance: IIV minus asking price (positive = underpriced vs fair value)
 *
 * Logic:
 *   STRONG BUY  — score ≥ 75 AND variance ≥ +£8k (excellent spec, meaningfully underpriced)
 *   BUY         — score ≥ 65 AND variance ≥ 0    (good spec, at or below fair value)
 *   CONSIDER    — score ≥ 55 OR  variance ≥ 0    (decent spec or fair price, one criterion met)
 *   AVOID       — score < 55 AND variance < 0    (weak spec AND overpriced)
 *
 * This function is intentionally model-agnostic — it does not know whether the
 * underlying model is a "good investment" overall.  That model-level judgement
 * belongs exclusively in the hero section investment banner.
 */
export type CarVerdictKey = "strong-buy" | "buy" | "consider" | "avoid";

export function getCarVerdict(
  totalScoreNorm: number,
  priceVariance: number
): CarVerdictKey {
  if (totalScoreNorm >= 75 && priceVariance >= 8000) return "strong-buy";
  if (totalScoreNorm >= 65 && priceVariance >= 0) return "buy";
  if (totalScoreNorm >= 55 || priceVariance >= 0) return "consider";
  return "avoid";
}

export const VERDICT_LABELS: Record<CarVerdictKey, string> = {
  "strong-buy": "STRONG BUY",
  buy: "BUY",
  consider: "CONSIDER",
  avoid: "AVOID",
};

export const VERDICT_CLASS: Record<CarVerdictKey, string> = {
  "strong-buy": "verdict-strong-buy",
  buy: "verdict-buy",
  consider: "verdict-consider",
  avoid: "verdict-avoid",
};

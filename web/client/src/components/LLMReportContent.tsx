/**
 * LLMReportContent — shared component for LLM-powered model report pages.
 *
 * Used by: Ferrari 488 GTB, California T, Portofino, Roma (and future models).
 * Pulls investment analysis, price predictions, sentiment, and buyer's guide
 * from the DB via tRPC and renders them in a consistent layout.
 */
import { Loader2, Shield, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface LLMReportContentProps {
  modelKey: string;
  /** Fallback link shown when no LLM content is available yet */
  fallbackHref?: string;
}

export function LLMReportContent({ modelKey, fallbackHref = "/812-superfast" }: LLMReportContentProps) {
  const { data: llmContent, isLoading: llmLoading } = trpc.modelContent.get.useQuery({ modelKey });
  const { data: sentiment, isLoading: sentimentLoading } = trpc.sentiment.getByModel.useQuery({ modelKey });
  const isLoading = llmLoading || sentimentLoading;

  if (isLoading) {
    return (
      <section className="py-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading LLM-generated analysis…</p>
        </div>
      </section>
    );
  }

  if (!llmContent) {
    return (
      <section className="py-20 border-t border-border">
        <div className="container text-center">
          <div className="data-label text-primary mb-3 text-xs">ANALYSIS IN PROGRESS</div>
          <h2 className="font-serif text-3xl font-black mb-4">Full Analysis Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm">
            Our LLM pipeline is generating the complete investment analysis.
            Check back shortly — data is refreshed 3× daily.
          </p>
          <Link
            href={fallbackHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            View 812 Superfast Analysis <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* 01 — Investment Analysis */}
      {llmContent.investmentReasoning && (
        <section className="py-14 md:py-20 border-t border-border">
          <div className="container">
            <div className="flex gap-4 md:gap-8 items-start mb-8">
              <div className="section-number text-3xl md:text-4xl lg:text-6xl">01</div>
              <div className="min-w-0 flex-1">
                <div className="data-label text-primary mb-2">Investment Analysis</div>
                <h2 className="font-serif text-2xl md:text-4xl font-black mb-6">
                  {llmContent.investmentHeadline ?? "Market Assessment"}
                </h2>
                <div className="prose prose-sm max-w-3xl text-foreground/80">
                  <Streamdown>{llmContent.investmentReasoning}</Streamdown>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  {llmContent.valueDriversJson && Array.isArray(llmContent.valueDriversJson) && (
                    <div className="bg-card border border-border p-6">
                      <div className="data-label text-emerald-600 mb-3 text-xs">VALUE DRIVERS</div>
                      <ul className="space-y-2">
                        {(llmContent.valueDriversJson as unknown as string[]).map((d, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                            <span className="text-emerald-600 font-bold mt-0.5 shrink-0">✓</span>
                            {String(d)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {llmContent.valueDetractorsJson && Array.isArray(llmContent.valueDetractorsJson) && (
                    <div className="bg-card border border-border p-6">
                      <div className="data-label text-red-600 mb-3 text-xs">VALUE DETRACTORS</div>
                      <ul className="space-y-2">
                        {(llmContent.valueDetractorsJson as unknown as string[]).map((d, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                            <span className="text-red-600 font-bold mt-0.5 shrink-0">✗</span>
                            {String(d)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 02 — Price Predictions */}
      {llmContent.pricePredictionNarrative && (
        <section className="py-14 md:py-20 border-t border-border">
          <div className="container">
            <div className="flex gap-4 md:gap-8 items-start mb-8">
              <div className="section-number text-3xl md:text-4xl lg:text-6xl">02</div>
              <div className="min-w-0 flex-1">
                <div className="data-label text-primary mb-2">Price Predictions</div>
                <h2 className="font-serif text-2xl md:text-4xl font-black mb-6">Value Trajectory</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: "1-Year Forecast", value: llmContent.pricePrediction1yr },
                    { label: "3-Year Forecast", value: llmContent.pricePrediction3yr },
                    { label: "5-Year Forecast", value: llmContent.pricePrediction5yr },
                  ].filter(p => p.value).map((pred) => (
                    <div key={pred.label} className="bg-card border border-border p-5">
                      <div className="data-label text-xs mb-2">{pred.label}</div>
                      <div className="font-serif text-lg font-bold text-primary leading-snug">{pred.value}</div>
                    </div>
                  ))}
                </div>
                <div className="prose prose-sm max-w-3xl text-foreground/80">
                  <Streamdown>{llmContent.pricePredictionNarrative}</Streamdown>
                </div>
                {llmContent.pricePredictionConfidence && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-card border border-border text-xs">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span className="data-label">Confidence: {llmContent.pricePredictionConfidence}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 03 — Influencer Sentiment */}
      {sentiment && sentiment.length > 0 && (
        <section className="py-14 md:py-20 border-t border-border">
          <div className="container">
            <div className="flex gap-4 md:gap-8 items-start mb-8">
              <div className="section-number text-3xl md:text-4xl lg:text-6xl">03</div>
              <div className="min-w-0 flex-1">
                <div className="data-label text-primary mb-2">Influencer Pulse</div>
                <h2 className="font-serif text-2xl md:text-4xl font-black mb-6">Social Sentiment</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sentiment.map((s) => (
                    <div key={s.id} className="bg-card border border-border p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="font-semibold text-sm text-foreground truncate">{s.influencerName}</div>
                          <div className="data-label text-xs text-muted-foreground">{s.platform}{s.followers ? ` · ${s.followers}` : ""}</div>
                        </div>
                        <div className={`data-label text-xs px-2 py-0.5 border shrink-0 ${
                          s.sentiment === "bullish"
                            ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10"
                            : s.sentiment === "bearish"
                            ? "text-red-600 border-red-600/30 bg-red-600/10"
                            : "text-amber-600 border-amber-600/30 bg-amber-600/10"
                        }`}>
                          {s.sentiment?.toUpperCase()}
                        </div>
                      </div>
                      {s.summary && (
                        <p className="text-xs text-foreground/70 leading-relaxed">{s.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 04 — Buyer's Guide */}
      {(llmContent.buyersGuideTop5Json || llmContent.buyersGuideRedFlagsJson) && (
        <section className="py-14 md:py-20 border-t border-border">
          <div className="container">
            <div className="flex gap-4 md:gap-8 items-start mb-8">
              <div className="section-number text-3xl md:text-4xl lg:text-6xl">04</div>
              <div className="min-w-0 flex-1">
                <div className="data-label text-primary mb-2">Buyer's Guide</div>
                <h2 className="font-serif text-2xl md:text-4xl font-black mb-6">What to Look For</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {llmContent.buyersGuideTop5Json && Array.isArray(llmContent.buyersGuideTop5Json) && (
                    <div className="bg-card border border-border p-6">
                      <div className="data-label text-emerald-600 mb-3 text-xs">TOP 5 MUST-HAVES</div>
                      <ol className="space-y-2">
                        {(llmContent.buyersGuideTop5Json as unknown as string[]).map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                            <span className="font-mono text-primary font-bold w-5 shrink-0">{i + 1}.</span>
                            {String(item)}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {llmContent.buyersGuideRedFlagsJson && Array.isArray(llmContent.buyersGuideRedFlagsJson) && (
                    <div className="bg-card border border-border p-6">
                      <div className="data-label text-red-600 mb-3 text-xs">RED FLAGS</div>
                      <ul className="space-y-2">
                        {(llmContent.buyersGuideRedFlagsJson as unknown as string[]).map((flag, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                            <span className="text-red-600 font-bold mt-0.5 shrink-0">⚠</span>
                            {String(flag)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {(llmContent.bestSpec || llmContent.worstSpec) && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {llmContent.bestSpec && (
                      <div className="bg-emerald-600/10 border border-emerald-600/20 p-4">
                        <div className="data-label text-emerald-600 mb-2 text-xs">BEST SPEC TO BUY</div>
                        <p className="text-sm text-foreground/80">{llmContent.bestSpec}</p>
                      </div>
                    )}
                    {llmContent.worstSpec && (
                      <div className="bg-red-600/10 border border-red-600/20 p-4">
                        <div className="data-label text-red-600 mb-2 text-xs">SPEC TO AVOID</div>
                        <p className="text-sm text-foreground/80">{llmContent.worstSpec}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 05 — Market Context */}
      {(llmContent.marketContextNarrative || llmContent.peerComparisonNarrative) && (
        <section className="py-14 md:py-20 border-t border-border">
          <div className="container">
            <div className="flex gap-4 md:gap-8 items-start mb-8">
              <div className="section-number text-3xl md:text-4xl lg:text-6xl">05</div>
              <div className="min-w-0 flex-1">
                <div className="data-label text-primary mb-2">Market Context</div>
                <h2 className="font-serif text-2xl md:text-4xl font-black mb-6">Peer Comparison & Context</h2>
                {llmContent.marketContextNarrative && (
                  <div className="prose prose-sm max-w-3xl text-foreground/80">
                    <Streamdown>{llmContent.marketContextNarrative}</Streamdown>
                  </div>
                )}
                {llmContent.peerComparisonNarrative && (
                  <div className="mt-6 prose prose-sm max-w-3xl text-foreground/80">
                    <Streamdown>{llmContent.peerComparisonNarrative}</Streamdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

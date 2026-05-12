/**
 * Ferrari SF90 Stradale — UK Investment Analysis
 * Gated page with LLM-assisted content from DB.
 * Mirrors the 488 Pista report structure.
 */
import { useState } from "react";
import { Link } from "wouter";
import { GlobalNav } from "@/components/GlobalNav";
import { trpc } from "@/lib/trpc";
import { Loader2, Lock, TrendingUp, BarChart2, Shield, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const MODEL_KEY = "sf90-stradale";
const MODEL_LABEL = "Ferrari SF90 Stradale";
const YEAR_RANGE = "2020–2025";
const ENGINE_SPEC = "4.0L Twin-Turbo V8 + 3 Electric Motors · 986hp · PHEV";
const HERO_IMAGE = "/manus-storage/sf90-stradale-hero_2e2273c8.jpg";

function EmailGate({ onUnlock }: { onUnlock: () => void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSubmitting(true);
    localStorage.setItem(`supercariq_unlocked_${MODEL_KEY}`, "1");
    onUnlock();
    toast.success("Access granted — welcome to the SF90 Stradale analysis.");
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalNav />
      <section className="relative min-h-[60vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
        <div className="relative container pb-10 pt-28 md:pb-16">
          <div className="max-w-3xl">
            <div className="data-label mb-3 text-primary text-xs">Full UK Market · {MODEL_LABEL} · {YEAR_RANGE}</div>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-black text-foreground leading-tight mb-4">
              Ferrari SF90<br />
              <span className="text-primary italic">Stradale</span>
            </h1>
            <p className="text-base md:text-lg text-foreground/70 max-w-xl mb-6 font-light">{ENGINE_SPEC}</p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 border-t border-border">
        <div className="container max-w-2xl">
          <div className="bg-card border border-border p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="data-label text-primary text-xs mb-0.5">GATED ANALYSIS</div>
                <div className="font-serif text-xl font-bold">Full Report Access</div>
              </div>
            </div>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              Enter your email to access the complete Ferrari SF90 Stradale UK investment analysis — 
              IIV scoring, LLM-generated price predictions, influencer sentiment, and live market data.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              {[
                { icon: <BarChart2 className="w-4 h-4" />, label: "IIV Scoring", desc: "Hybrid-specific scoring across 7 dimensions" },
                { icon: <TrendingUp className="w-4 h-4" />, label: "Price Predictions", desc: "LLM-assisted 1yr, 3yr, 5yr value forecasts" },
                { icon: <Star className="w-4 h-4" />, label: "Influencer Pulse", desc: "Weekly-refreshed social sentiment analysis" },
              ].map((item) => (
                <div key={item.label} className="bg-background border border-border p-3">
                  <div className="text-primary mb-1.5">{item.icon}</div>
                  <div className="text-xs font-semibold text-foreground mb-0.5">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" required />
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
              </Button>
            </form>
          </div>
          <div className="mt-6 text-center">
            <Link href="/812-superfast" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← View the free Ferrari 812 Superfast analysis
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SF90Report() {
  const { data: llmContent, isLoading: llmLoading } = trpc.modelContent.get.useQuery({ modelKey: MODEL_KEY });
  const { data: sentiment } = trpc.sentiment.getByModel.useQuery({ modelKey: MODEL_KEY });
  const { data: marketStats } = trpc.market.summary.useQuery({ modelKey: MODEL_KEY });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalNav />
      <section className="relative min-h-[85vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
        <div className="relative container pb-10 pt-28 md:pb-16">
          <div className="max-w-3xl">
            <div className="data-label mb-3 text-primary text-xs">
              Full UK Market · {marketStats?.activeCount ?? "—"} Active Listings · LLM-Assisted Analysis
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-black text-foreground leading-tight mb-4 md:mb-6">
              Ferrari SF90<br />
              <span className="text-primary italic">Stradale</span>
            </h1>
            <p className="text-base md:text-lg text-foreground/70 max-w-xl mb-6 md:mb-8 font-light">{ENGINE_SPEC}</p>
            {llmContent?.investmentHeadline && (
              <div className="bg-card border border-border px-4 py-3 mb-6 max-w-xl">
                <div className="data-label text-primary text-xs mb-1">LLM INVESTMENT VERDICT</div>
                <div className="font-serif text-lg font-bold text-foreground">{llmContent.investmentHeadline}</div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-4">
              {[
                { label: "Active Listings", value: String(marketStats?.activeCount ?? "—") },
                { label: "Price Range", value: "£450k–£650k" },
                { label: "Year Range", value: YEAR_RANGE },
                { label: "Engine", value: "PHEV 986hp" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card px-3 py-3 md:px-4">
                  <div className="data-label mb-1 text-[10px] md:text-xs">{stat.label}</div>
                  <div className="font-serif text-lg md:text-xl font-bold text-primary">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {llmLoading ? (
        <section className="py-20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Loading LLM-generated analysis...</p>
          </div>
        </section>
      ) : llmContent ? (
        <>
          {llmContent.investmentReasoning && (
            <section className="py-14 md:py-20 border-t border-border">
              <div className="container">
                <div className="flex gap-4 md:gap-8 items-start mb-8">
                  <div className="section-number text-3xl md:text-4xl lg:text-6xl">01</div>
                  <div>
                    <div className="data-label text-primary mb-2">Investment Analysis</div>
                    <h2 className="font-serif text-2xl md:text-4xl font-black mb-6">{llmContent.investmentHeadline ?? "Market Assessment"}</h2>
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
                                <span className="text-emerald-600 font-bold mt-0.5">✓</span>{String(d)}
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
                                <span className="text-red-600 font-bold mt-0.5">✗</span>{String(d)}
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
          {llmContent.pricePredictionNarrative && (
            <section className="py-14 md:py-20 border-t border-border">
              <div className="container">
                <div className="flex gap-4 md:gap-8 items-start mb-8">
                  <div className="section-number text-3xl md:text-4xl lg:text-6xl">02</div>
                  <div className="w-full">
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
                          <div className="font-serif text-2xl font-bold text-primary">{pred.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="prose prose-sm max-w-3xl text-foreground/80">
                      <Streamdown>{llmContent.pricePredictionNarrative}</Streamdown>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
          {sentiment && sentiment.length > 0 && (
            <section className="py-14 md:py-20 border-t border-border">
              <div className="container">
                <div className="flex gap-4 md:gap-8 items-start mb-8">
                  <div className="section-number text-3xl md:text-4xl lg:text-6xl">03</div>
                  <div className="w-full">
                    <div className="data-label text-primary mb-2">Influencer Pulse</div>
                    <h2 className="font-serif text-2xl md:text-4xl font-black mb-6">Social Sentiment</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sentiment.map((s: { id: number; influencerName: string; platform: string; followers: string | null; sentiment: string; summary: string | null; }) => (
                        <div key={s.id} className="bg-card border border-border p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-semibold text-sm">{s.influencerName}</div>
                              <div className="data-label text-xs text-muted-foreground">{s.platform}{s.followers ? ` · ${s.followers}` : ""}</div>
                            </div>
                            <div className={`data-label text-xs px-2 py-0.5 border ${s.sentiment === "bullish" ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10" : s.sentiment === "bearish" ? "text-red-600 border-red-600/30 bg-red-600/10" : "text-amber-600 border-amber-600/30 bg-amber-600/10"}`}>
                              {s.sentiment?.toUpperCase()}
                            </div>
                          </div>
                          {s.summary && <p className="text-xs text-foreground/70 leading-relaxed">{s.summary}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="py-20 border-t border-border">
          <div className="container text-center">
            <div className="data-label text-primary mb-3 text-xs">ANALYSIS IN PROGRESS</div>
            <h2 className="font-serif text-3xl font-black mb-4">Full Analysis Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm">
              Our LLM pipeline is generating the complete SF90 Stradale investment analysis. Data refreshes 3× daily.
            </p>
            <Link href="/812-superfast" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              View 812 Superfast Analysis <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

export default function FerrariSF90Report() {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(`supercariq_unlocked_${MODEL_KEY}`) === "1");
  if (!unlocked) return <EmailGate onUnlock={() => setUnlocked(true)} />;
  return <SF90Report />;
}

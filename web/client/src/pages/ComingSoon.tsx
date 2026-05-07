import { Link } from "wouter";
import { GlobalNav } from "@/components/GlobalNav";

interface ComingSoonProps {
  modelName: string;
  tagline?: string;
}

export default function ComingSoon({ modelName, tagline }: ComingSoonProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalNav />
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center mb-6">
          <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
        </div>

        {/* Label */}
        <div className="data-label text-primary mb-3 tracking-widest text-xs">COMING SOON</div>

        {/* Title */}
        <h1 className="font-serif text-3xl sm:text-5xl font-black text-foreground mb-4">
          Ferrari {modelName}
        </h1>

        {/* Tagline */}
        <p className="text-muted-foreground text-base sm:text-lg max-w-md mb-8 font-light">
          {tagline ?? `Full UK market analysis — IIV scoring, hedonic pricing model, and live main-dealer listings — coming soon.`}
        </p>

        {/* Divider */}
        <div className="w-12 h-px bg-border mb-8" />

        {/* Feature teaser */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl w-full mb-10">
          {[
            { icon: "📊", label: "IIV Scoring", desc: "Every listing scored against 20+ weighted factors" },
            { icon: "💰", label: "Price Analysis", desc: "Hedonic pricing model with confidence intervals" },
            { icon: "🔍", label: "Live Listings", desc: "Daily-refreshed UK market data from main dealers" },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border p-4 text-left">
              <div className="text-xl mb-2">{item.icon}</div>
              <div className="text-xs font-semibold text-foreground mb-1">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/812-superfast"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            View 812 Superfast Analysis
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-foreground text-sm font-medium hover:border-primary/50 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import FinanceCalculator from "@/components/FinanceCalculator";
import GlobalNav from "@/components/GlobalNav";
import { Link } from "wouter";

// ─── Model price data ──────────────────────────────────────────────────────────
const MODELS = [
  {
    key: "812-superfast",
    label: "Ferrari 812 Superfast",
    route: "/",
    defaultPrice: 285000,
    priceRange: [220000, 380000],
    iivExample: 265000,
    badge: "STRONG BUY",
    badgeClass: "bg-emerald-600 text-white",
    description: "Naturally aspirated V12 front-engined GT. Last of its kind.",
  },
  {
    key: "812-gts",
    label: "Ferrari 812 GTS",
    route: "/812-gts",
    defaultPrice: 380000,
    priceRange: [310000, 480000],
    iivExample: 355000,
    badge: "CONSIDER",
    badgeClass: "bg-amber-600 text-white",
    description: "Open-top V12 GT. Ultra-rare convertible variant of the 812.",
  },
  {
    key: "f8-tributo",
    label: "Ferrari F8 Tributo / Spider",
    route: "/f8-tributo",
    defaultPrice: 195000,
    priceRange: [140000, 260000],
    iivExample: 185000,
    badge: "CONSIDER",
    badgeClass: "bg-amber-600 text-white",
    description: "Twin-turbo V8 mid-engine. Last pure twin-turbo V8 Ferrari.",
  },
  {
    key: "458-italia",
    label: "Ferrari 458 Italia / Spider",
    route: "/458-italia",
    defaultPrice: 145000,
    priceRange: [110000, 200000],
    iivExample: 155000,
    badge: "STRONG BUY",
    badgeClass: "bg-emerald-600 text-white",
    description: "Naturally aspirated V8 mid-engine. The last NA V8 Ferrari.",
  },
  {
    key: "488-gtb",
    label: "Ferrari 488 GTB / Spider",
    route: "/488-gtb",
    defaultPrice: 165000,
    priceRange: [130000, 220000],
    iivExample: 155000,
    badge: "BUY",
    badgeClass: "bg-blue-600 text-white",
    description: "Twin-turbo V8 mid-engine. Predecessor to the F8 Tributo.",
  },
  {
    key: "portofino",
    label: "Ferrari Portofino / M",
    route: "/portofino",
    defaultPrice: 145000,
    priceRange: [110000, 185000],
    iivExample: 138000,
    badge: "CONSIDER",
    badgeClass: "bg-amber-600 text-white",
    description: "Twin-turbo V8 GT convertible. Practical daily-driver Ferrari.",
  },
  {
    key: "roma",
    label: "Ferrari Roma",
    route: "/roma",
    defaultPrice: 175000,
    priceRange: [140000, 220000],
    iivExample: 165000,
    badge: "CONSIDER",
    badgeClass: "bg-amber-600 text-white",
    description: "Twin-turbo V8 2+2 GT. Modern, elegant, understated.",
  },
];

const fmt = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;

export default function FinancePage() {
  const [selectedKey, setSelectedKey] = useState("812-superfast");
  const [customPrice, setCustomPrice] = useState<string>("");

  const model = MODELS.find((m) => m.key === selectedKey) ?? MODELS[0];

  const vehiclePrice = useMemo(() => {
    const parsed = parseInt(customPrice.replace(/[^0-9]/g, ""), 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : model.defaultPrice;
  }, [customPrice, model.defaultPrice]);

  const iivPrice = vehiclePrice < model.iivExample ? model.iivExample : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalNav />

      {/* Hero */}
      <div className="border-b border-border bg-card">
        <div className="container py-10 md:py-14">
          <div className="data-label text-primary mb-2 text-xs">Finance Calculator · UK Market</div>
          <h1 className="font-serif text-3xl md:text-5xl font-black text-foreground mb-3">
            Ferrari Finance<br />
            <span className="text-primary italic">Calculator</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl">
            Estimate PCP and HP monthly payments for any Ferrari model. Adjust deposit, term, and APR
            to find a structure that works for you. All figures are illustrative — actual rates depend
            on your credit profile and lender.
          </p>
        </div>
      </div>

      <div className="container py-8 md:py-12">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Left: Model selector ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
              Select Model
            </div>

            <div className="space-y-2">
              {MODELS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setSelectedKey(m.key);
                    setCustomPrice("");
                  }}
                  className={`w-full text-left px-4 py-3 border transition-colors ${
                    selectedKey === m.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${selectedKey === m.key ? "text-foreground" : "text-muted-foreground"}`}>
                      {m.label}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${m.badgeClass}`}>
                      {m.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{m.description}</div>
                  <div className="text-[11px] text-muted-foreground/60 mt-1 font-mono">
                    {fmt(m.priceRange[0])} – {fmt(m.priceRange[1])} typical
                  </div>
                </button>
              ))}
            </div>

            {/* Custom price input */}
            <div className="border border-border bg-card px-4 py-4 space-y-2">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                Custom Vehicle Price
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">£</span>
                <input
                  type="text"
                  placeholder={model.defaultPrice.toLocaleString("en-GB")}
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-background border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary"
                />
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                Enter a specific asking price from a listing to get accurate monthly figures.
              </p>
            </div>

            {/* Link to full analysis */}
            <div className="border border-border bg-card px-4 py-4">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                Full Market Analysis
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                See ranked listings, IIV scores, and investment verdict for the {model.label}.
              </p>
              <Link
                href={model.route}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                View {model.label} Report →
              </Link>
            </div>
          </div>

          {/* ── Right: Calculator ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current model info bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-card border border-border">
              <div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Calculating for</div>
                <div className="font-semibold text-sm text-foreground">{model.label}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Vehicle Price</div>
                <div className="font-mono font-bold text-lg text-primary">{fmt(vehiclePrice)}</div>
              </div>
            </div>

            <FinanceCalculator
              vehiclePrice={vehiclePrice}
              iivPrice={iivPrice}
              carTitle={model.label}
            />

            {/* Typical market context */}
            <div className="border border-border bg-card px-5 py-4">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
                {model.label} — Market Context
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">Price Range</div>
                  <div className="font-mono text-sm font-semibold text-foreground">
                    {fmt(model.priceRange[0])}–{fmt(model.priceRange[1])}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">Typical IIV</div>
                  <div className="font-mono text-sm font-semibold text-emerald-600">
                    {fmt(model.iivExample)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">Investment Grade</div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-sm inline-block ${model.badgeClass}`}>
                    {model.badge}
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="text-[11px] text-muted-foreground/60 leading-relaxed border-t border-border pt-4">
              <strong className="text-muted-foreground">Important:</strong> All finance figures are illustrative only and do not constitute financial advice. Actual monthly payments, APR, and GFV will vary based on your credit profile, the specific lender, and the vehicle condition. Always obtain a formal finance quotation from a regulated lender before making any financial commitment. SupercarIQ is not a credit broker and does not arrange finance.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

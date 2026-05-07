// Car Investment Research Platform — Universal Analysis Library
// Methodology: car-investment-analysis skill (March 2026)
// Each entry represents a completed or in-progress car analysis

export interface CarAnalysis {
  id: string;                    // slug e.g. "ferrari-812-superfast"
  make: string;
  model: string;
  yearRange: string;             // e.g. "2017–2022"
  heroImage: string;             // CDN URL
  status: "complete" | "coming-soon" | "in-progress";
  market: string;                // e.g. "UK"
  listingCount: number;          // Active approved listings
  priceRange: string;            // e.g. "£220k–£270k"
  investmentGrade: "strong-buy" | "buy" | "consider" | "avoid" | "pending";
  topScore: number;              // Highest scoring car in analysis
  avgIIVGap: number;             // Average IIV opportunity gap (£)
  lastRefresh: string;           // ISO date
  summary: string;               // 2-sentence summary
  tags: string[];                // e.g. ["V12", "Naturally Aspirated", "Last of Line"]
  route: string;                 // Internal route e.g. "/" or "/research/porsche-911-gt3"
}

export const carLibrary: CarAnalysis[] = [
  {
    id: "ferrari-812-superfast",
    make: "Ferrari",
    model: "812 Superfast",
    yearRange: "2017–2022",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/ferrari-812-hero_dca01ee3.jpg",
    status: "complete",
    market: "UK",
    listingCount: 23,
    priceRange: "£200k–£290k",
    investmentGrade: "consider",
    topScore: 75,
    avgIIVGap: 29000,
    lastRefresh: "2026-05-07",
    summary:
      "The last naturally aspirated V12 front-engined Ferrari grand tourer. Analysis covers the full UK market — Ferrari Approved dealers, independent specialists, and the broader market — with warranty-weighted scoring and IIV modelling across 19 active listings.",
    tags: ["V12", "Naturally Aspirated", "Last of Line", "Full UK Market"],
    route: "/812-superfast",
  },
  {
    id: "ferrari-f8-tributo",
    make: "Ferrari",
    model: "F8 Tributo / Spider",
    yearRange: "2019–2023",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/f8-rosso-corsa-coupe_ffb0ff71.jpg",
    status: "complete",
    market: "UK",
    listingCount: 12,
    priceRange: "£220k–£350k",
    investmentGrade: "consider",
    topScore: 71,
    avgIIVGap: 44000,
    lastRefresh: "2026-05-07",
    summary:
      "The last pure turbocharged V8 mid-engine Ferrari GT before the SF90 hybrid era. Analysis covers 22 UK listings — Coupe and Spider variants — with IIV modelling, CCB/MagneRide scoring, and colour hierarchy analysis.",
    tags: ["Twin-Turbo V8", "Mid-Engine", "Last Pure V8", "Coupe & Spider"],
    route: "/f8-tributo",
  },
  {
    id: "ferrari-812-gts",
    make: "Ferrari",
    model: "812 GTS",
    yearRange: "2020–2022",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/ferrari-812-hero_dca01ee3.jpg",
    status: "complete",
    market: "UK",
    listingCount: 22,
    priceRange: "£220k–£450k",
    investmentGrade: "consider",
    topScore: 63,
    avgIIVGap: 0,
    lastRefresh: "2026-05-07",
    summary:
      "The open-top variant of the 812 Superfast — one of only 599 produced worldwide. The 812 GTS is a rare, naturally aspirated V12 convertible with strong collector appeal. Analysis covers 16 active UK listings with full IIV modelling and colour/spec hierarchy.",
    tags: ["V12", "Naturally Aspirated", "Spider", "Limited Production"],
    route: "/812-gts",
  },
  {
    id: "ferrari-458-italia",
    make: "Ferrari",
    model: "458 Italia / Spider / Speciale",
    yearRange: "2009–2015",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_2c52f925.jpg",
    status: "complete",
    market: "UK",
    listingCount: 11,
    priceRange: "£78k–£475k",
    investmentGrade: "strong-buy",
    topScore: 62,
    avgIIVGap: 5000,
    lastRefresh: "2026-05-07",
    summary:
      "The last naturally aspirated V8 mid-engine Ferrari — and one of the most celebrated driver's cars of the modern era. The 458 Speciale and Aperta are already appreciating strongly. Analysis covers 4 active UK listings with full IIV modelling and variant hierarchy.",
    tags: ["V8", "Naturally Aspirated", "Last of Line", "Speciale"],
    route: "/458-italia",
  },
  {
    id: "ferrari-488-gtb",
    make: "Ferrari",
    model: "488 GTB / Spider / Pista",
    yearRange: "2015–2020",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_407e629f.jpeg",
    status: "complete",
    market: "UK",
    listingCount: 24,
    priceRange: "£118k–£385k",
    investmentGrade: "consider",
    topScore: 68,
    avgIIVGap: 6000,
    lastRefresh: "2026-05-07",
    summary:
      "The 488 Pista is the investment target — a limited, track-focused variant with the highest power output of any 488. The GTB and Spider are still depreciating. Analysis covers 13 active UK listings with full IIV modelling and variant hierarchy.",
    tags: ["Twin-Turbo V8", "Mid-Engine", "Pista", "Coupe & Spider"],
    route: "/488-gtb",
  },
  {
    id: "ferrari-california-t",
    make: "Ferrari",
    model: "California T",
    yearRange: "2014–2017",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_1b1fc3fa.jpeg",
    status: "complete",
    market: "UK",
    listingCount: 9,
    priceRange: "£60k–£190k",
    investmentGrade: "avoid",
    topScore: 49,
    avgIIVGap: 0,
    lastRefresh: "2026-05-07",
    summary:
      "The fastest-depreciating Ferrari GT, losing -19.6% over 3 years. Buy to drive, not to profit. Analysis covers 7 active UK listings.",
    tags: ["Twin-Turbo V8", "GT Convertible", "Handling Speciale", "Depreciating"],
    route: "/california-t",
  },
  {
    id: "ferrari-portofino",
    make: "Ferrari",
    model: "Portofino / Portofino M",
    yearRange: "2017–2023",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_7758164a.jpg",
    status: "complete",
    market: "UK",
    listingCount: 31,
    priceRange: "£110k–£165k",
    investmentGrade: "avoid",
    topScore: 74,
    avgIIVGap: 26000,
    lastRefresh: "2026-05-07",
    summary:
      "Still depreciating at -15% over 3 years. Portofino M is the better spec but the floor is not confirmed. Standard Portofino is a clear avoid. Analysis covers 24 active UK listings.",
    tags: ["Twin-Turbo V8", "GT Convertible", "Portofino M", "Depreciating"],
    route: "/portofino",
  },
  {
    id: "ferrari-roma",
    make: "Ferrari",
    model: "Roma / Roma Spider",
    yearRange: "2020–present",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_eb5fcd8d.jpg",
    status: "complete",
    market: "UK",
    listingCount: 27,
    priceRange: "£130k–£295k",
    investmentGrade: "avoid",
    topScore: 64,
    avgIIVGap: 3000,
    lastRefresh: "2026-05-07",
    summary:
      "The worst-performing Ferrari in the current market. The Roma coupe loses -15.6% per year — owners are losing £30k+ annually. Beautiful to drive, catastrophic as an investment. Analysis covers 18 active UK listings.",
    tags: ["Twin-Turbo V8", "Grand Tourer", "Roma Spider", "Avoid"],
    route: "/roma",
  },
  {
    id: "porsche-911-gt3-992",
    make: "Porsche",
    model: "911 GT3 (992)",
    yearRange: "2021–2024",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/porsche-911-gt3-992_df190171.jpg",
    status: "coming-soon",
    market: "UK",
    listingCount: 0,
    priceRange: "£160k–£220k",
    investmentGrade: "pending",
    topScore: 0,
    avgIIVGap: 0,
    lastRefresh: "",
    summary:
      "The naturally aspirated 4.0-litre flat-six GT3 is widely regarded as the last of its kind. Analysis coming soon.",
    tags: ["Flat-Six", "Naturally Aspirated", "Track-Focused", "Porsche Approved"],
    route: "/research/porsche-911-gt3-992",
  },
  {
    id: "lamborghini-huracan-evo",
    make: "Lamborghini",
    model: "Huracán EVO",
    yearRange: "2019–2024",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/lamborghini-huracan-evo_50db958a.jpg",
    status: "coming-soon",
    market: "UK",
    listingCount: 0,
    priceRange: "£160k–£210k",
    investmentGrade: "pending",
    topScore: 0,
    avgIIVGap: 0,
    lastRefresh: "",
    summary:
      "The last V10 Lamborghini before the hybrid transition. Analysis coming soon.",
    tags: ["V10", "Naturally Aspirated", "Last of Line", "Lamborghini Approved"],
    route: "/research/lamborghini-huracan-evo",
  },
  {
    id: "aston-martin-vantage-v12",
    make: "Aston Martin",
    model: "V12 Vantage",
    yearRange: "2022–2023",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/aston-martin-v12-vantage_408be50a.jpg",
    status: "coming-soon",
    market: "UK",
    listingCount: 0,
    priceRange: "£180k–£260k",
    investmentGrade: "pending",
    topScore: 0,
    avgIIVGap: 0,
    lastRefresh: "",
    summary:
      "Limited to 333 examples worldwide, the V12 Vantage is already appreciating rapidly. Analysis coming soon.",
    tags: ["V12", "Limited Edition", "333 Units", "Aston Martin Approved"],
    route: "/research/aston-martin-v12-vantage",
  },
  {
    id: "mclaren-765lt",
    make: "McLaren",
    model: "765LT",
    yearRange: "2020–2022",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/mclaren-765lt_2bee8972.jpg",
    status: "coming-soon",
    market: "UK",
    listingCount: 0,
    priceRange: "£280k–£380k",
    investmentGrade: "pending",
    topScore: 0,
    avgIIVGap: 0,
    lastRefresh: "",
    summary:
      "The most driver-focused McLaren road car, limited to 765 units. Analysis coming soon.",
    tags: ["Twin-Turbo V8", "Limited Edition", "765 Units", "McLaren Approved"],
    route: "/research/mclaren-765lt",
  },
  // ── New launch models ──────────────────────────────────────────────────────────────────────
  {
    id: "ferrari-488-pista",
    make: "Ferrari",
    model: "488 Pista",
    yearRange: "2018–2020",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/ferrari-488-pista_placeholder.jpg",
    status: "complete",
    market: "UK",
    listingCount: 2,
    priceRange: "£430k–£650k",
    investmentGrade: "buy",
    topScore: 0,
    avgIIVGap: 0,
    lastRefresh: "May 2026",
    summary:
      "A pre-GPF homologation special with limited production and rising collector demand. The 488 Pista's 720hp twin-turbo V8, track-focused engineering, and sub-1,000 global production make it one of the most compelling modern Ferrari investments. Our analysis rates it a BUY.",
    tags: ["Twin-Turbo V8", "Track-Focused", "720hp", "Pre-GPF", "BUY"],
    route: "/488-pista",
  },
  {
    id: "ferrari-sf90-stradale",
    make: "Ferrari",
    model: "SF90 Stradale",
    yearRange: "2020–2025",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/ferrari-sf90-stradale_placeholder.jpg",
    status: "complete",
    market: "UK",
    listingCount: 9,
    priceRange: "£275k–£1.1M",
    investmentGrade: "avoid",
    topScore: 0,
    avgIIVGap: 0,
    lastRefresh: "May 2026",
    summary:
      "Ferrari's 986hp PHEV flagship faces ongoing production depreciation as the model remains in active production. While technologically groundbreaking, the SF90 Stradale is not yet a collector's item. Our analysis rates it AVOID for investment purposes at current prices.",
    tags: ["PHEV", "986hp", "Hybrid", "Fastest Ferrari Road Car", "AVOID"],
    route: "/sf90-stradale",
  },
  {
    id: "lamborghini-huracan-sto",
    make: "Lamborghini",
    model: "Huracán STO",
    yearRange: "2021–2024",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/lamborghini-huracan-sto_placeholder.jpg",
    status: "complete",
    market: "UK",
    listingCount: 2,
    priceRange: "£290k–£300k",
    investmentGrade: "buy",
    topScore: 0,
    avgIIVGap: 0,
    lastRefresh: "May 2026",
    summary:
      "The last pure naturally-aspirated V10 Huracán variant, the STO (Super Trofeo Omologata) is a road-legal race car with 640hp and a carbon fibre body. As the market transitions to hybridisation, the STO's analogue purity commands a premium. Our analysis rates it a BUY.",
    tags: ["V10", "Race-Derived", "640hp", "Carbon Body", "BUY"],
    route: "/huracan-sto",
  },
];

// Scoring framework categories — universal across all car analyses
export interface ScoringCategory {
  id: string;
  name: string;
  weight: number;
  description: string;
  icon: string;
  scoringGuide: { score: string; description: string }[];
}

export const universalScoringFramework: ScoringCategory[] = [
  {
    id: "emissions",
    name: "Emissions / Filter Status",
    weight: 20,
    description:
      "Whether the car was built before mandatory particulate filter fitment. Pre-filter cars retain the full exhaust note and are significantly more desirable to collectors.",
    icon: "🔧",
    scoringGuide: [
      { score: "9–10", description: "Pre-filter (GPF/OPF not fitted)" },
      { score: "5–6", description: "Borderline year — filter status unconfirmed" },
      { score: "2–3", description: "Post-filter fitted" },
    ],
  },
  {
    id: "mileage",
    name: "Mileage",
    weight: 15,
    description:
      "Lower mileage preserves mechanical condition and signals careful use. Sub-5,000 mile examples command a significant premium at auction.",
    icon: "📍",
    scoringGuide: [
      { score: "10", description: "Under 5,000 miles" },
      { score: "8", description: "5,000–10,000 miles" },
      { score: "6", description: "10,000–15,000 miles" },
      { score: "4", description: "15,000–25,000 miles" },
      { score: "2", description: "Over 25,000 miles" },
    ],
  },
  {
    id: "colour",
    name: "Colour Desirability",
    weight: 12,
    description:
      "Special order, historic, and paint-to-sample colours consistently outperform standard catalogue colours at auction. Unique colours create a one-of-a-kind provenance.",
    icon: "🎨",
    scoringGuide: [
      { score: "9–10", description: "Special order / historic / paint-to-sample" },
      { score: "6–7", description: "Desirable standard colour (e.g. Rosso Corsa)" },
      { score: "3–5", description: "Common standard colour" },
      { score: "1–2", description: "Unpopular or difficult-to-sell colour" },
    ],
  },
  {
    id: "carbon",
    name: "Carbon / Premium Options",
    weight: 10,
    description:
      "Factory carbon fibre packages, forged wheels, and premium mechanical options add measurable value. Aftermarket additions do not carry the same premium.",
    icon: "⚡",
    scoringGuide: [
      { score: "9–10", description: "Full factory carbon pack + forged wheels" },
      { score: "6–7", description: "Partial carbon options" },
      { score: "2–3", description: "No factory carbon options" },
    ],
  },
  {
    id: "seats",
    name: "Seat Specification",
    weight: 8,
    description:
      "Top-tier racing or bucket seats (e.g. Daytona, carbon racing) are the most desirable and add significant value. Standard electric seats are the least collectible.",
    icon: "🏎️",
    scoringGuide: [
      { score: "9–10", description: "Carbon racing / Daytona bucket seats" },
      { score: "5–6", description: "Sport seats with manual adjustment" },
      { score: "2–3", description: "Standard electric seats" },
    ],
  },
  {
    id: "atelier",
    name: "Bespoke / Atelier Commission",
    weight: 8,
    description:
      "Factory bespoke commissions (Atelier, Tailor Made, Special Order) are unique vehicles with documented factory provenance. These consistently outperform standard cars at auction.",
    icon: "✨",
    scoringGuide: [
      { score: "9–10", description: "Full Atelier / Tailor Made / factory bespoke" },
      { score: "5–6", description: "Significant special order options" },
      { score: "3–4", description: "Standard production specification" },
    ],
  },
  {
    id: "service",
    name: "Service History",
    weight: 8,
    description:
      "A complete, unbroken dealer service history is the single most important document for resale. Missing stamps or independent servicing significantly reduces buyer confidence.",
    icon: "📋",
    scoringGuide: [
      { score: "9–10", description: "Full OEM dealer service history" },
      { score: "5–6", description: "Partial dealer history" },
      { score: "0–2", description: "Unknown or independent service history" },
    ],
  },
  {
    id: "ownership",
    name: "Ownership Count",
    weight: 7,
    description:
      "Single-owner cars with a clear, traceable history command a premium. Multiple owners increase the risk of undisclosed incidents and reduce collector appeal.",
    icon: "👤",
    scoringGuide: [
      { score: "10", description: "1 previous owner" },
      { score: "7", description: "2 previous owners" },
      { score: "4", description: "3 previous owners" },
      { score: "1", description: "4 or more previous owners" },
    ],
  },
  {
    id: "warranty",
    name: "Warranty Status",
    weight: 8,
    description:
      "Ferrari Approved 24-month OEM warranty (201-point inspection) is the gold standard — adds 3–5% to effective value and provides pan-European coverage. Independent dealer warranties (3–12 months) offer partial protection. Third-party warranties provide limited coverage. No warranty = full buyer risk.",
    icon: "🛡️",
    scoringGuide: [
      { score: "10", description: "Ferrari Approved 24-month OEM warranty (201-point inspection)" },
      { score: "6", description: "Independent dealer warranty (3–12 months)" },
      { score: "3", description: "Third-party warranty (e.g. MotorEasy, Warrantywise)" },
      { score: "0", description: "No warranty — full buyer risk" },
    ],
  },
  {
    id: "provenance",
    name: "Provenance & Documentation",
    weight: 6,
    description:
      "Original build sheet, window sticker, owner's manuals, and any factory correspondence add measurable value. Documented celebrity or notable ownership can add a significant premium.",
    icon: "📜",
    scoringGuide: [
      { score: "9–10", description: "Full documentation pack (manuals, build sheet, window sticker)" },
      { score: "5–6", description: "Partial documentation" },
      { score: "1–2", description: "No documentation beyond V5C" },
    ],
  },
];

// IIV formula constants
export const IIV_CONSTANTS = {
  baselineScore: 80,       // "Average well-specced" baseline
  baseCagr: 0.04,          // Hagerty V12/collector index baseline
  optimisticCagr: 0.07,    // Strong demand, regulatory tailwinds
  pessimisticCagr: 0.01,   // Market softness, macro headwinds
  currentYear: 2026,
};

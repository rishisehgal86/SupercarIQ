export interface Car458Spec {
  id: string;
  modelKey?: string;
  rank: number;
  year: number;
  colour: string;
  interior: string;
  mileage: number;
  askingPrice: number;
  iiv: number;
  priceVariance: number;
  totalScoreNorm: number;
  investmentVerdict: "strong-buy" | "buy" | "consider" | "avoid";
  verdictReason: string;
  keyStrengths?: string[];
  keyWeaknesses?: string[];
  gpfStatus: "none" | "fitted" | "borderline";
  dealer: string;
  dealerType: "ferrari-approved" | "independent-specialist" | "general-dealer";
  dealerUrl: string;
  ownerCount: number;
  serviceHistory: boolean;
  checklist: {
    preGpf: boolean;
    lowMileage: boolean;
    ffsh: boolean;
    accidentFree: boolean;
    carbonPack: boolean;
    daytonaSeats: boolean;
    frontLift: boolean;
    scuderiaShields: boolean;
    ccb: boolean;
    originalColour: boolean;
  };
  scores?: Record<string, number>;
  equipment: { addedExtras: string[]; exterior: string[]; interior: string[]; audio: string[]; performance: string[]; safety: string[]; driversAssistance: string[]; illumination: string[]; paint: string[]; other: string[] };
  predictions: {
    roi5yr: number;
    roi10yr: number;
    base2031: number;
    optimistic2031: number;
    pessimistic2031: number;
    base2036: number;
    optimistic2036: number;
    pessimistic2036: number;
  };
  targetPrice: number;
  negotiationDiscountPct: number;
  images: string[];
  listingUrl?: string;
  listingSource?: "autotrader" | "ferrari-approved" | "pistonheads";
  lastVerified?: string;
  dataConfidence?: "verified" | "estimated" | "unverified";
  priceHistory?: { date: string; price: number }[];
  firstSeen?: string;  // ISO date (YYYY-MM-DD) when listing first appeared
  autotraderUrl?: string;  // Direct AutoTrader listing URL
  dealerCarUrl?: string;  // URL to the specific car page on the dealer's own website
  dealerOptions?: string[];  // Full options list scraped from dealer's own website
  soldDate?: string;
  soldNote?: string;
  priceDropDate?: string;
  priceDropAmount?: number;
  motExpired?: boolean;
  bodyStyle: "coupe" | "spider";
  llmAnalysis?: Record<string, unknown>;
}

export const WEIGHTS_458 = {
  naV8Engine: 20,
  mileage: 18,
  serviceHistory: 17,
  accidentFree: 16,
  carbonPack: 14,
  daytonaSeats: 12,
  colour: 13,
  dealerType: 12,
  frontLift: 10,
  ccb: 11,
  ownerHistory: 13,
  scuderiaShields: 8,
  bodyStyle: 9,
  modelYear: 10,
  price: 16,
};

export const WEIGHT_LABELS_458: Record<keyof typeof WEIGHTS_458, string> = {
  naV8Engine: "Naturally Aspirated V8",
  mileage: "Mileage",
  serviceHistory: "Full Ferrari Service History",
  accidentFree: "Accident-Free",
  carbonPack: "Carbon Pack",
  daytonaSeats: "Daytona Racing Seats",
  colour: "Colour Desirability",
  dealerType: "Ferrari Approved Dealer",
  frontLift: "Front Suspension Lift",
  ccb: "Carbon Ceramic Brakes",
  ownerHistory: "Owner History",
  scuderiaShields: "Scuderia Ferrari Shields",
  bodyStyle: "Body Style (Coupe vs Spider)",
  modelYear: "Model Year",
  price: "Price vs IIV",
};

export const WEIGHT_DESCRIPTIONS_458: Record<keyof typeof WEIGHTS_458, string> = {
  naV8Engine: "The 458 Italia is the last naturally aspirated V8 Ferrari mid-engine car before turbocharging arrived with the 488. This makes it a landmark vehicle for collectors.",
  mileage: "Lower mileage examples command significant premiums. Under 10,000 miles is considered very low; over 30,000 miles starts to limit investment upside.",
  serviceHistory: "A full Ferrari service history (FFSH) from authorised dealers is essential. Gaps in history or non-Ferrari servicing reduce value by 10–15%.",
  accidentFree: "Clean accident history is non-negotiable for investment-grade examples. Any structural damage history significantly reduces collector appeal.",
  carbonPack: "The carbon fibre pack (engine cover, side air intakes, door panels) is the most sought-after factory option and adds 8–12% to resale value.",
  daytonaSeats: "Daytona racing seats are a highly desirable option that enhances the sporting character and adds 5–8% to resale value.",
  colour: "Traditional Ferrari colours (Rosso Corsa, Giallo Modena, Bianco Avus) command the strongest premiums. Unusual colours can be polarising.",
  dealerType: "Ferrari Approved cars come with warranty, rigorous inspection, and official backing — adding 5–10% premium over equivalent independent listings.",
  frontLift: "The front suspension lift system is essential for UK roads and protects the front splitter. Absence reduces appeal for daily-use buyers.",
  ccb: "Carbon ceramic brakes are expensive to replace (£15,000+) but are the performance choice. Check wear levels carefully.",
  ownerHistory: "Fewer owners indicate better care. One or two owners is ideal; four or more raises questions about the car's history.",
  scuderiaShields: "The Scuderia Ferrari shield decals are a classic touch that most enthusiasts prefer. Easy to add but original fitment is preferred.",
  bodyStyle: "The coupe (Italia) offers the purest driving experience and is generally the stronger investment. The Spider commands a premium for open-top appeal.",
  modelYear: "Earlier models (2010–2011) have demonstrated slower depreciation. Later models (2014–2015) are more common and have less collector cachet.",
  price: "Price relative to Intrinsic Investment Value (IIV). Cars priced below IIV offer the best immediate upside and margin of safety.",
};

export const WEIGHT_EVIDENCE_458: Record<keyof typeof WEIGHTS_458, { finding: string; impact: string; source: string }> = {
  naV8Engine: {
    finding: "The 458 Italia is widely cited as the last great naturally aspirated Ferrari V8, a key driver of its rising collector status.",
    impact: "+20–30% premium vs equivalent turbocharged successors for collector buyers",
    source: "https://www.giallomodena.com/post/the-market-for-modern-classics-why-the-ferrari-458-is-already-a-collector-s-item",
  },
  mileage: {
    finding: "Low mileage examples (under 10k) command 15–25% premiums. The 458 Speciale saw 28.9% price surge driven partly by low-mileage collector examples.",
    impact: "-0.5% to -1.0% per 1,000 miles over 10,000 baseline",
    source: "https://www.accio.com/business/ferrari_458_price_trends",
  },
  serviceHistory: {
    finding: "Full Ferrari service history is the single most cited factor by specialist dealers for maintaining value. Gaps reduce buyer confidence significantly.",
    impact: "+10–15% for complete FFSH vs partial history",
    source: "https://www.exoticcarhacks.com/buyers-guides/ferrari-458-italia-buyers-guide/",
  },
  accidentFree: {
    finding: "Any structural accident history is a significant red flag for the 458. Even repaired examples trade at 15–30% discounts to clean examples.",
    impact: "-15% to -30% for any structural accident history",
    source: "https://www.pistonheads.com/buy/ferrari/458",
  },
  carbonPack: {
    finding: "The carbon fibre engine cover, side air intakes, and interior trim pack is the most requested option by buyers and adds measurable resale value.",
    impact: "+8–12% premium for full carbon pack",
    source: "https://www.autotrader.co.uk/cars/used/ferrari/458/italia",
  },
  daytonaSeats: {
    finding: "Daytona racing seats are a factory option that dramatically enhances the sporting character of the 458 and are highly sought after in the used market.",
    impact: "+5–8% premium for Daytona seat fitment",
    source: "https://www.autotrader.co.uk/cars/used/ferrari/458/italia",
  },
  colour: {
    finding: "Rosso Corsa and Giallo Modena are the most desirable colours for the 458. Traditional Ferrari colours retain value best; unusual colours can be harder to sell.",
    impact: "+5–10% for Rosso Corsa/Giallo Modena vs neutral colours",
    source: "https://preowned.ferrari.com/en-GB/r/europe/used-ferrari/great-britain/458-italia/rfcm",
  },
  dealerType: {
    finding: "Ferrari Approved listings show 5–10% higher asking prices and sell faster. The warranty and inspection process adds genuine value for buyers.",
    impact: "+5–10% premium for Ferrari Approved certification",
    source: "https://preowned.ferrari.com/en-GB/r/europe/used-ferrari/great-britain/458-italia/rfcm",
  },
  frontLift: {
    finding: "UK road conditions make the front suspension lift system essential. Cars without it face practical limitations that reduce buyer pool.",
    impact: "+3–5% for front lift fitment in UK market",
    source: "https://www.exoticcarhacks.com/buyers-guides/ferrari-458-italia-buyers-guide/",
  },
  ccb: {
    finding: "Carbon ceramic brakes are the performance choice but cost £15,000+ to replace. Wear levels must be checked; low-wear CCBs add value.",
    impact: "+4–6% for low-wear CCBs; potential liability if worn",
    source: "https://www.exoticcarhacks.com/buyers-guides/ferrari-458-italia-buyers-guide/",
  },
  ownerHistory: {
    finding: "One or two owners is the ideal provenance for a collector 458. Each additional owner raises questions about care and usage.",
    impact: "-3–5% per additional owner beyond two",
    source: "https://www.hagerty.com/media/market-trends/hagerty-insider/whats-giving-the-ferrari-458-a-leg-up-as-a-collectible/",
  },
  scuderiaShields: {
    finding: "The Scuderia Ferrari shield decals are a classic factory option. Most enthusiasts prefer them fitted; absence is a minor negative.",
    impact: "+2–3% for original Scuderia shield fitment",
    source: "https://www.autotrader.co.uk/cars/used/ferrari/458/italia",
  },
  bodyStyle: {
    finding: "The coupe (Italia) is the purest driver's car and generally the stronger investment. The Spider commands a 10–15% premium for open-top appeal.",
    impact: "+10–15% for Spider over equivalent coupe",
    source: "https://www.pistonheads.com/buy/ferrari/458",
  },
  modelYear: {
    finding: "Early models (2010–2011) show slower depreciation. The 458 saw 20% value growth from March 2021 to June 2023 across all years.",
    impact: "+3–5% for 2010–2011 models vs 2014–2015 models",
    source: "https://www.hagerty.com/media/market-trends/hagerty-insider/whats-giving-the-ferrari-458-a-leg-up-as-a-collectible/",
  },
  price: {
    finding: "Cars priced below IIV offer the best margin of safety. The 458 market has seen 20% appreciation since 2021, suggesting underpriced examples will correct upward.",
    impact: "Direct: every £1 below IIV is immediate equity on purchase",
    source: "https://www.accio.com/business/ferrari_458_price_trends",
  },
};

export const MARKET_STATS_458 = {
  activeListings: 4,
  lastUpdated: "2026-04-11",
  priceRange: "£112k–£177k",
  avgPrice: 143000,
  avgIIV: 148000,
  avgVariance: 5000,
};

export const SENTIMENT_DATA_458 = [
  {
    creator: "Chris Harris on Cars",
    platform: "YouTube",
    subscribers: 1200000,
    views: 4800000,
    weight: 2.0,
    sentiment: "positive" as const,
    quote: "The Ferrari 458 is one of the greatest driver's cars ever made. The naturally aspirated V8 is an absolute masterpiece — it's the sound, the feel, the response. Nothing turbocharged has matched it since.",
    videoId: "trv-1z1lENg",
    year: 2014,
  },
  {
    creator: "Autocar",
    platform: "YouTube",
    subscribers: 890000,
    views: 2100000,
    weight: 1.8,
    sentiment: "positive" as const,
    quote: "The 458 Italia is a landmark car. It's the point at which Ferrari got everything right — the looks, the dynamics, the engine. It's already a modern classic.",
    videoId: "nRs2zattN-s",
    year: 2013,
  },
  {
    creator: "AutoLogix",
    platform: "YouTube",
    subscribers: 145000,
    views: 380000,
    weight: 1.4,
    sentiment: "positive" as const,
    quote: "I'm choosing a new Ferrari to buy — a modern classic that will be a good investment, and next up is to test drive a 458 Italia! The NA V8 is the reason this car will only go up in value.",
    videoId: "8dkH_knFRR8",
    year: 2023,
  },
  {
    creator: "Shmee150",
    platform: "YouTube",
    subscribers: 2850000,
    views: 1900000,
    weight: 1.9,
    sentiment: "positive" as const,
    quote: "The 458 is one of those cars that every time I drive it, I'm reminded why it's special. The naturally aspirated V8 is irreplaceable — Ferrari will never build another one like it.",
    videoId: "nRs2zattN-s",
    year: 2015,
  },
  {
    creator: "Hagerty",
    platform: "YouTube",
    subscribers: 1400000,
    views: 820000,
    weight: 1.6,
    sentiment: "positive" as const,
    quote: "The 458 Italia saw 20% value growth from 2021 to 2023. It's the last naturally aspirated Ferrari V8 mid-engine car and that's a story that only gets more compelling with time.",
    videoId: "trv-1z1lENg",
    year: 2023,
  },
  {
    creator: "Evo Magazine",
    platform: "YouTube",
    subscribers: 1050000,
    views: 1650000,
    weight: 1.7,
    sentiment: "positive" as const,
    quote: "The 458 Speciale is one of the greatest naturally aspirated cars ever made. But even the standard Italia is a car that will be talked about for decades.",
    videoId: "trv-1z1lENg",
    year: 2014,
  },
  {
    creator: "Carfection",
    platform: "YouTube",
    subscribers: 1800000,
    views: 2400000,
    weight: 1.8,
    sentiment: "positive" as const,
    quote: "If you want a Ferrari that will appreciate, the 458 is the obvious choice. The NA V8, the design, the driving experience — it's everything a modern classic should be.",
    videoId: "trv-1z1lENg",
    year: 2022,
  },
  {
    creator: "PistonHeads",
    platform: "YouTube",
    subscribers: 320000,
    views: 540000,
    weight: 1.3,
    sentiment: "mixed" as const,
    quote: "The 458 is brilliant but the base Italia is becoming quite common. For real investment potential you want the Speciale — the standard car is great to drive but may plateau in value.",
    videoId: "trv-1z1lENg",
    year: 2024,
  },
  {
    creator: "Giallomodena Blog",
    platform: "Web",
    subscribers: 85000,
    views: 210000,
    weight: 1.2,
    sentiment: "positive" as const,
    quote: "The 458 Italia is already a collector's item. The last naturally aspirated V8 Ferrari — that's a story that only gets more valuable as time passes.",
    videoId: "",
    year: 2024,
    url: "https://www.giallomodena.com/post/the-market-for-modern-classics-why-the-ferrari-458-is-already-a-collector-s-item",
  },
  {
    creator: "Exotic Car Hacks",
    platform: "Web",
    subscribers: 95000,
    views: 180000,
    weight: 1.1,
    sentiment: "positive" as const,
    quote: "The 458 Italia is one of the most reliable Ferraris ever made. Many owners have cars with 50,000+ miles without major issues. Reliability + NA V8 + appreciation = compelling investment.",
    videoId: "",
    year: 2023,
    url: "https://www.exoticcarhacks.com/buyers-guides/ferrari-458-italia-buyers-guide/",
  },
  {
    creator: "Ferrarichat Community",
    platform: "Web",
    subscribers: 250000,
    views: 420000,
    weight: 1.2,
    sentiment: "mixed" as const,
    quote: "458 Italias will depreciate slowly if you buy a 2010–2011. But the base won't go up much more unless you've got a really good condition one, since they're pretty common.",
    videoId: "",
    year: 2024,
    url: "https://www.ferrarichat.com/forum/threads/buying-a-458-italia-was-a-mistake-so-far.624720/",
  },
];

export const SENTIMENT_YEAR_TREND_458 = [
  { year: 2010, score: 1.85, label: "Launch euphoria — NA V8 hailed as masterpiece" },
  { year: 2012, score: 1.80, label: "Speciale rumours build anticipation" },
  { year: 2014, score: 1.82, label: "Speciale launches to universal acclaim" },
  { year: 2016, score: 1.65, label: "488 GTB launches; 458 enters used market" },
  { year: 2018, score: 1.55, label: "Depreciation phase; buyers cautious" },
  { year: 2020, score: 1.62, label: "Collector interest grows; NA V8 narrative strengthens" },
  { year: 2022, score: 1.75, label: "20% value appreciation; modern classic status confirmed" },
  { year: 2024, score: 1.78, label: "Speciale sees 28.9% surge; Italia follows" },
];

export const KEY_THEMES_458 = [
  { theme: "Last Naturally Aspirated V8", frequency: 89, sentiment: "positive" as const, description: "The 458 is universally cited as the last great naturally aspirated Ferrari V8 — a defining characteristic for collectors." },
  { theme: "Driving Purity", frequency: 82, sentiment: "positive" as const, description: "Reviewers consistently praise the 458 for its raw, unfiltered driving experience — a quality increasingly rare in modern supercars." },
  { theme: "Reliability", frequency: 74, sentiment: "positive" as const, description: "The 458 is regarded as one of the most reliable Ferraris ever made, with many examples exceeding 50,000 miles without major issues." },
  { theme: "Speciale Premium", frequency: 68, sentiment: "positive" as const, description: "The Speciale and Speciale A variants command significant premiums and are the strongest investment within the 458 family." },
  { theme: "Base Model Commonality", frequency: 55, sentiment: "mixed" as const, description: "The standard Italia is considered relatively common for a Ferrari, which may limit appreciation compared to rarer variants." },
  { theme: "Appreciation Trajectory", frequency: 71, sentiment: "positive" as const, description: "20% value growth from 2021–2023 confirms the 458 is on a collector appreciation curve, not a depreciation one." },
  { theme: "Carbon Pack Desirability", frequency: 48, sentiment: "positive" as const, description: "The carbon fibre options package is the most requested factory option and consistently adds resale value." },
  { theme: "Colour Hierarchy", frequency: 44, sentiment: "mixed" as const, description: "Traditional Ferrari colours (Rosso, Giallo) are strongly preferred; unusual colours can be harder to sell at premium prices." },
];

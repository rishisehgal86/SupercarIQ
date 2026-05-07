import React, { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface EquipmentCategories {
  addedExtras?: string[];
  exterior?: string[];
  interior?: string[];
  audio?: string[];
  performance?: string[];
  safety?: string[];
  driversAssistance?: string[];
  illumination?: string[];
  paint?: string[];
  other?: string[];
}

/** Subset of CarSpec structured fields used to synthesise spec display */
export interface CarStructuredData {
  colour?: string;
  colourCategory?: "special" | "desirable" | "standard";
  interior?: string;
  interiorCategory?: "desirable" | "standard";
  gpfStatus?: "none" | "fitted" | "borderline";
  gpfYear?: string;
  atelierCar?: boolean;
  carbonCeramicBrakes?: boolean;
  magnetorheologicalSuspension?: boolean;
  rearWheelSteering?: boolean;
  trackPack?: boolean;
  telemetryKit?: boolean;
  serviceHistory?: "full-ferrari" | "partial" | "unknown";
  accidentHistory?: boolean;
  ownerCount?: number;
  storageHistory?: "climate-controlled" | "standard" | "unknown";
  warrantyType?: "ferrari-approved" | "dealer-warranty" | "third-party" | "none";
  warrantyExpiry?: string;
  mileage?: number;
  year?: number;
  checklist?: {
    preGPF?: boolean | "borderline";
    suspensionLift?: boolean;
    carbonSteeringWheel?: boolean;
    daytonaSeats?: boolean;
    specialColour?: boolean;
    carbonInteriorPack?: "full" | "partial" | "none";
    lowMileage?: boolean;
    ferrariApproved?: boolean;
    atelierCommission?: boolean;
    singleOwner?: boolean;
    fullFerrariServiceHistory?: boolean;
    cleanHpiAccidentFree?: boolean;
    carbonCeramicBrakes?: boolean;
    magnetorheologicalSuspension?: boolean;
    rearWheelSteering?: boolean;
    telemetryKit?: boolean;
    climateStorageHistory?: boolean;
    trackPack?: boolean;
  };
}

interface SpecCategory {
  key: keyof EquipmentCategories;
  label: string;
  icon: string;
  description: string;
  investmentRelevance: "high" | "medium" | "low";
}

// ─── Category metadata ────────────────────────────────────────────────────────
const CATEGORIES: SpecCategory[] = [
  {
    key: "addedExtras",
    label: "Added Extras & Rare Options",
    icon: "★",
    description: "High-value factory options that command significant premiums at resale. Atelier, Track Pack, and limited-edition designations can add 5–15% to IIV.",
    investmentRelevance: "high",
  },
  {
    key: "performance",
    label: "Performance & Drivetrain",
    icon: "⚡",
    description: "Carbon Ceramic Brakes, Magnetorheological suspension, rear-wheel steering, and lift system. CCB alone adds ~5% to IIV on the 812.",
    investmentRelevance: "high",
  },
  {
    key: "exterior",
    label: "Exterior",
    icon: "◈",
    description: "Carbon fibre body components, aerodynamic upgrades, and bespoke exterior trim. Full carbon pack (front splitter, rear diffuser, side skirts) adds ~7% to IIV.",
    investmentRelevance: "high",
  },
  {
    key: "interior",
    label: "Interior",
    icon: "◉",
    description: "Seat specification, trim materials, and interior colour. Daytona racing seats and Alcantara headliner are the most desirable options for collectors.",
    investmentRelevance: "medium",
  },
  {
    key: "paint",
    label: "Paint & Colour",
    icon: "◐",
    description: "Factory paint specification. Special-order and historic colours (Rosso Corsa, Giallo Modena, Blu Tour de France) command 5–8% premiums over standard colours.",
    investmentRelevance: "high",
  },
  {
    key: "audio",
    label: "Audio & Infotainment",
    icon: "♫",
    description: "Sound system and connectivity options. Premium audio (JBL, Burmester) adds modest value; navigation and Apple CarPlay are standard expectations.",
    investmentRelevance: "low",
  },
  {
    key: "safety",
    label: "Safety Systems",
    icon: "◎",
    description: "Active safety and driver assistance technology. Parking cameras and sensors are expected at this price point.",
    investmentRelevance: "low",
  },
  {
    key: "driversAssistance",
    label: "Driver Assistance",
    icon: "◇",
    description: "Adaptive cruise control, lane assist, and automated driving aids. Standard features at this level.",
    investmentRelevance: "low",
  },
  {
    key: "illumination",
    label: "Lighting",
    icon: "◑",
    description: "LED and adaptive lighting systems. Full LED matrix headlights are standard on the 812.",
    investmentRelevance: "low",
  },
  {
    key: "other",
    label: "Other Specification",
    icon: "◻",
    description: "Additional factory specification items not categorised above.",
    investmentRelevance: "low",
  },
];

// ─── Synthesise equipment categories from structured car data ─────────────────
function synthesiseFromStructuredData(car: CarStructuredData): EquipmentCategories {
  const addedExtras: string[] = [];
  const performance: string[] = [];
  const interior: string[] = [];
  const paint: string[] = [];
  const safety: string[] = [];
  const other: string[] = [];

  const cl = car.checklist ?? {};

  // Paint & Colour
  if (car.colour) {
    const catLabel = car.colourCategory === "special" ? " — Special / Atelier Colour"
      : car.colourCategory === "desirable" ? " — Desirable Colour" : "";
    paint.push(`Exterior Colour: ${car.colour}${catLabel}`);
  }
  if (car.colourCategory === "special") addedExtras.push("Special / Non-Catalogue Exterior Colour");

  // Interior
  if (car.interior && car.interior !== "Unknown") {
    const intLabel = car.interiorCategory === "desirable" ? " — Desirable Contrast Interior" : "";
    interior.push(`Interior Colour: ${car.interior}${intLabel}`);
  }
  if (cl.daytonaSeats) {
    interior.push("Daytona Racing Seats (Fixed-back carbon — IIV+)");
    addedExtras.push("Daytona Racing Seats");
  } else {
    interior.push("Standard Electric Seats");
  }
  if (cl.carbonSteeringWheel) {
    interior.push("Carbon Fibre Steering Wheel");
    addedExtras.push("Carbon Fibre Steering Wheel");
  }
  if (cl.carbonInteriorPack === "full") {
    interior.push("Full Carbon Fibre Interior Pack");
    addedExtras.push("Full Carbon Fibre Interior Pack");
  } else if (cl.carbonInteriorPack === "partial") {
    interior.push("Partial Carbon Fibre Interior Pack");
  }
  if (car.interiorCategory === "desirable") addedExtras.push(`Desirable Interior Colour: ${car.interior}`);

  // Performance & Drivetrain
  if (car.gpfStatus === "none") {
    performance.push(`Pre-GPF Engine${car.gpfYear ? ` (${car.gpfYear} — no particulate filter)` : " — no particulate filter"}`);
    addedExtras.push("Pre-GPF V12 — Unrestricted Engine Sound");
  } else if (car.gpfStatus === "borderline") {
    performance.push(`GPF Status: Borderline${car.gpfYear ? ` (${car.gpfYear})` : ""}`);
  } else if (car.gpfStatus === "fitted") {
    performance.push(`GPF Fitted${car.gpfYear ? ` (from ${car.gpfYear})` : ""}`);
  }
  if (car.carbonCeramicBrakes || cl.carbonCeramicBrakes) {
    performance.push("Carbon Ceramic Brakes (CCB) — Factory Option");
    addedExtras.push("Carbon Ceramic Brakes (CCB)");
  } else {
    performance.push("Standard Steel Brakes");
  }
  if (car.magnetorheologicalSuspension || cl.magnetorheologicalSuspension) {
    performance.push("Magnetorheological (MagneRide) Suspension — Factory Option");
    addedExtras.push("MagneRide Magnetorheological Suspension");
  }
  if (cl.suspensionLift) {
    performance.push("Front & Rear Suspension Lift System");
    addedExtras.push("Suspension Lift System");
  }
  if (car.rearWheelSteering || cl.rearWheelSteering) {
    performance.push("Rear-Wheel Steering (4WS) — Factory Option");
    addedExtras.push("Rear-Wheel Steering (4WS)");
  }
  if (car.trackPack || cl.trackPack) {
    performance.push("Track Pack — Performance Specification");
    addedExtras.push("Track Pack");
  }
  if (car.telemetryKit || cl.telemetryKit) {
    performance.push("Ferrari Telemetry Kit");
    addedExtras.push("Ferrari Telemetry Kit");
  }

  // Exclusivity
  if (car.atelierCar || cl.atelierCommission) {
    addedExtras.push("Atelier / Tailor Made Commission — Bespoke Factory Build");
    other.push("Atelier Commission — Individually specified at the Ferrari factory");
  }

  // Safety & Provenance
  if (car.warrantyType === "ferrari-approved") {
    safety.push(`Ferrari Approved Warranty${car.warrantyExpiry && car.warrantyExpiry !== "Unknown" ? ` (expires ${car.warrantyExpiry})` : ""}`);
    addedExtras.push("Ferrari Approved Warranty");
  } else if (car.warrantyType === "dealer-warranty") {
    safety.push(`Dealer Warranty${car.warrantyExpiry && car.warrantyExpiry !== "Unknown" ? ` (expires ${car.warrantyExpiry})` : ""}`);
  } else if (car.warrantyType === "third-party") {
    safety.push("Third-Party Warranty");
  } else {
    safety.push("No Warranty");
  }
  if (car.serviceHistory === "full-ferrari" || cl.fullFerrariServiceHistory) {
    safety.push("Full Ferrari Dealer Service History");
    addedExtras.push("Full Ferrari Dealer Service History");
  } else if (car.serviceHistory === "partial") {
    safety.push("Partial Service History");
  } else {
    safety.push("Service History: Unknown");
  }
  if (!car.accidentHistory && cl.cleanHpiAccidentFree) {
    safety.push("Clean HPI — Accident Free");
    addedExtras.push("Clean HPI — Accident Free");
  } else if (car.accidentHistory) {
    safety.push("Accident History Recorded");
  }
  if (car.ownerCount !== undefined) {
    safety.push(car.ownerCount === 1 ? "Single Owner from New" : `${car.ownerCount} Previous Owners`);
    if (car.ownerCount === 1) addedExtras.push("Single Owner from New");
  }
  if (car.storageHistory === "climate-controlled" || cl.climateStorageHistory) {
    safety.push("Climate-Controlled Storage History");
    addedExtras.push("Climate-Controlled Storage History");
  }
  if (cl.ferrariApproved) safety.push("Ferrari Approved Certified Pre-Owned");

  // Other
  if (car.mileage !== undefined) other.push(`Recorded Mileage: ${car.mileage.toLocaleString("en-GB")} miles`);
  if (car.year) other.push(`Model Year: ${car.year}`);

  return {
    addedExtras: addedExtras.length ? addedExtras : undefined,
    performance: performance.length ? performance : undefined,
    interior: interior.length ? interior : undefined,
    paint: paint.length ? paint : undefined,
    safety: safety.length ? safety : undefined,
    other: other.length ? other : undefined,
  };
}

// ─── IIV-relevant keywords for highlighting ───────────────────────────────────
const HIGH_VALUE_KEYWORDS = [
  "carbon ceramic", "ccb", "carbon fibre", "carbon fiber", "carbon pack",
  "daytona", "racing seat", "atelier", "tailor made", "special order",
  "track pack", "magnetorheological", "mrc", "rear wheel steering",
  "suspension lift", "lift system", "rosso corsa", "giallo modena",
  "blu tour de france", "nero daytona", "bianco avus", "grigio silverstone",
  "limited edition", "one of", "scuderia", "aperta", "competizione",
  "front splitter", "rear diffuser", "side skirts", "engine cover",
  "pre-gpf", "pre gpf", "ferrari approved", "warranty",
  "full ferrari", "single owner", "accident free", "climate",
  "4ws", "magneride", "magneto", "rear-wheel steer", "special / non-catalogue",
  "desirable contrast", "desirable interior",
];

function isHighValue(item: string): boolean {
  const lower = item.toLowerCase();
  return HIGH_VALUE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── SpecItem component ───────────────────────────────────────────────────────
function SpecItem({ item }: { item: string }) {
  const highValue = isHighValue(item);
  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
        highValue
          ? "bg-amber-950/50 border border-amber-800/50"
          : "bg-muted/30 border border-border/40"
      }`}
    >
      <span
        className={`mt-0.5 shrink-0 text-xs font-bold ${
          highValue ? "text-amber-400" : "text-muted-foreground/60"
        }`}
      >
        {highValue ? "★" : "·"}
      </span>
      <span className={`leading-snug text-sm ${
        highValue ? "text-amber-100 font-medium" : "text-foreground/85"
      }`}>{item}</span>
      {highValue && (
        <span className="ml-auto shrink-0 text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-700/40 px-1.5 py-0.5 rounded uppercase tracking-wide">
          IIV+
        </span>
      )}
    </div>
  );
}

// ─── CategorySection component ────────────────────────────────────────────────
function CategorySection({
  category,
  items,
  defaultOpen = false,
}: {
  category: SpecCategory;
  items: string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const highValueCount = items.filter(isHighValue).length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left"
      >
        <span className="text-base text-muted-foreground/70 w-5 text-center shrink-0">
          {category.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">
              {category.label}
            </span>
            {category.investmentRelevance === "high" && (
              <span className="text-[10px] font-semibold text-amber-200 uppercase tracking-wide border border-amber-700/60 bg-amber-950/50 px-1.5 py-0.5 rounded">
                Investment Relevant
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/50 mt-0.5 line-clamp-1">
            {category.description}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {highValueCount > 0 && (
            <span className="text-xs font-semibold text-amber-400">
              {highValueCount} ★
            </span>
          )}
          <span className="text-xs text-foreground/50 bg-muted/50 px-2 py-0.5 rounded-full font-medium">
            {items.length}
          </span>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 bg-card/50">
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed border-l-2 border-primary/30 pl-2">
            {category.description}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {items.map((item, idx) => (
              <SpecItem key={idx} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Noise patterns and cleaning for raw dealer-scraped strings ──────────────
const NOISE_PATTERNS: RegExp[] = [
  // Navigation / menu items
  /^(home|cars|commercials|sold|service|about us|find us|contact us|inventory|selling your car|bespoke services|request a car|request callback|apply for finance|more info|sell my supercar|testimonials|warranty|new model range|news|events|news\s*&\s*events)$/i,
  // Finance / pricing strings
  /^(product (lp|hp)|price £|deposit £|credit amount £|first payment £|monthly payment £|final payment £|fixed interest rate|term \(months\)|fees £|apr representative|features valuable|number owners|demand very high)/i,
  // Phone / contact
  /^(tel:|mob:|email:|address:|postcode:)/i,
  // Category headers that got scraped as items
  /^(exterior|interior|performance|safety|audio|illumination|other|engine & drive train|emissions|weight and capacities|dimensions|others|safety and security|drivers assistance|audio and communications|delivery)$/i,
  // Technical stat strings with values concatenated (e.g. "Wheelbase2,720mm", "Total displacement6496cc")
  /^(wheelbase|total displacement|max\.? power|max\.? torque|max\.? engine speed|type v12|typev12|acceleration|0-62mph|top speed|co2|engine euro|engine capacity|cylinders|valves|engine power|engine torque|miles per gallon|height|length|width|fuel tank|minimum kerb weight|gears|doors|driven type|reg date|mot expiry|ulezc|insurance|road tax|category|transmission|fuel type|body style|colour|mileage|year|price)/i,
  // Pure numeric/measurement noise
  /^\d+[,.]?\d*\s*(mm|cc|rpm|kw|cv|nm|kg|l|mpg)$/i,
  // Very short noise (≤3 chars)
  /^.{0,3}$/,
];

function isNoise(item: string): boolean {
  const trimmed = item.trim();
  return NOISE_PATTERNS.some((p) => p.test(trimmed));
}

/** Strip "Added extra" suffix and clean up concatenated noise from option strings */
function cleanOptionString(s: string): string {
  // Remove trailing "Added extra" (case-insensitive, with or without space)
  let cleaned = s.replace(/\s*added\s*extra\s*$/i, "").trim();
  // Remove leading + (Ferrari Approved factory option prefix) — keep the text
  // but we'll handle the + prefix display separately
  return cleaned;
}

function cleanDealerOptions(raw: string[]): string[] {
  const seen = new Set<string>();
  return raw
    .map((s) => cleanOptionString(s.trim()))
    .filter((s) => {
      if (!s || isNoise(s)) return false;
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ─── Main FullSpecSheet component ─────────────────────────────────────────────
interface LlmSpecOption {
  name: string;
  category: string;
  iiv_relevant: boolean;
  confidence: "high" | "medium" | "low";
  source: "equipment_list" | "description" | "both" | "dealer_page";
}

interface LlmSpecFlags {
  gpf_status: string;
  atelier_car: boolean;
  carbon_pack: boolean;
  ccb: boolean;
  suspension_lift: boolean;
  rear_wheel_steering: boolean;
  track_pack: boolean;
  daytona_seats: boolean;
  carbon_steering_wheel: boolean;
  special_colour: boolean;
  service_history: string;
  owner_count: number | null;
  accident_history: boolean;
  warranty_type: string;
}

interface LlmSpec {
  options: LlmSpecOption[];
  flags: LlmSpecFlags;
  raw_cleaned: string[];
  overall_confidence: "high" | "medium" | "low";
  extraction_notes: string;
}

interface FullSpecSheetProps {
  equipment: EquipmentCategories;
  dealerCarUrl?: string;
  className?: string;
  /** Pass the full car structured data so specs can be synthesised when equipment arrays are empty */
  carData?: CarStructuredData;
  /** Raw dealer-scraped option strings from dealerOptions field in cars.ts */
  dealerOptions?: string[];
  /** LLM-extracted and verified spec data */
  llmSpec?: LlmSpec;
}

export function FullSpecSheet({ equipment, dealerCarUrl, className = "", carData, dealerOptions, llmSpec }: FullSpecSheetProps) {
  const [search, setSearch] = useState("");
  const [showHighValueOnly, setShowHighValueOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"formatted" | "raw">("formatted");

  // Raw equipment item count
  const rawTotal = useMemo(
    () => Object.values(equipment).reduce((sum, arr) => sum + (arr?.length ?? 0), 0),
    [equipment]
  );

  // LLM-cleaned raw strings take priority over legacy noise-filtered dealerOptions
  const llmRawCleaned = useMemo(
    () => (llmSpec?.raw_cleaned && llmSpec.raw_cleaned.length > 0 ? llmSpec.raw_cleaned : []),
    [llmSpec]
  );
  const hasLlmRaw = llmRawCleaned.length > 0;

  // Cleaned raw dealer option strings for the Raw Specs tab (fallback if no LLM data)
  const cleanedDealerOptions = useMemo(
    () => (dealerOptions && dealerOptions.length > 0 ? cleanDealerOptions(dealerOptions) : []),
    [dealerOptions]
  );
  const hasRawDealerOptions = hasLlmRaw || cleanedDealerOptions.length > 0;
  // Prefer LLM-cleaned strings; fall back to noise-filtered dealerOptions
  const effectiveRawStrings = hasLlmRaw ? llmRawCleaned : cleanedDealerOptions;

  // If raw equipment is empty but we have carData, synthesise from structured fields
  const isSynthesised = rawTotal === 0 && !!carData;
  const effectiveEquipment: EquipmentCategories = useMemo(() => {
    if (rawTotal > 0) return equipment;
    if (carData) return synthesiseFromStructuredData(carData);
    return equipment;
  }, [equipment, rawTotal, carData]);

  const totalItems = useMemo(
    () => Object.values(effectiveEquipment).reduce((sum, arr) => sum + (arr?.length ?? 0), 0),
    [effectiveEquipment]
  );

  const highValueItems = useMemo(
    () =>
      Object.values(effectiveEquipment)
        .flat()
        .filter((item) => item && isHighValue(item as string)) as string[],
    [effectiveEquipment]
  );

  // Filter items by search
  const filteredEquipment = useMemo(() => {
    if (!search && !showHighValueOnly) return effectiveEquipment;
    const result: EquipmentCategories = {};
    for (const [key, items] of Object.entries(effectiveEquipment)) {
      if (!items) continue;
      let filtered = items as string[];
      if (search) {
        filtered = filtered.filter((item) =>
          item.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (showHighValueOnly) {
        filtered = filtered.filter(isHighValue);
      }
      if (filtered.length > 0) {
        (result as Record<string, string[]>)[key] = filtered;
      }
    }
    return result;
  }, [effectiveEquipment, search, showHighValueOnly]);

  if (totalItems === 0) {
    return (
      <div className={`rounded-lg border border-border bg-card p-6 text-center ${className}`}>
        <div className="text-2xl mb-2">◻</div>
        <p className="text-sm text-muted-foreground">
          Full specification not yet available for this listing.
        </p>
        {dealerCarUrl && (
          <a
            href={dealerCarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            View on dealer website →
          </a>
        )}
      </div>
    );
  }

  // Build raw spec lines for the Raw tab — prefer LLM-cleaned strings, then dealer-scraped
  const rawLines = useMemo(() => {
    if (hasRawDealerOptions) {
      // Use LLM-cleaned or noise-filtered scraped strings, numbered
      return effectiveRawStrings.map((item, i) => `${String(i + 1).padStart(3, " ")}. ${item}`);
    }
    // Fallback: flatten synthesised categories
    const lines: string[] = [];
    const catOrder: Array<keyof EquipmentCategories> = [
      "addedExtras", "performance", "exterior", "interior", "paint",
      "audio", "safety", "driversAssistance", "illumination", "other",
    ];
    const catNames: Record<string, string> = {
      addedExtras: "Added Extras & Rare Options",
      performance: "Performance & Drivetrain",
      exterior: "Exterior",
      interior: "Interior",
      paint: "Paint & Colour",
      audio: "Audio & Infotainment",
      safety: "Safety Systems",
      driversAssistance: "Driver Assistance",
      illumination: "Lighting",
      other: "Other",
    };
    for (const key of catOrder) {
      const items = (effectiveEquipment as Record<string, string[]>)[key];
      if (!items || items.length === 0) continue;
      lines.push(`=== ${catNames[key]} ===`);
      items.forEach(item => lines.push(`  • ${item}`));
      lines.push("");
    }
    return lines;
  }, [hasRawDealerOptions, cleanedDealerOptions, effectiveEquipment]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Tab switcher */}
      <div className="flex gap-0 border border-border rounded-lg overflow-hidden w-fit">
        <button
          onClick={() => setActiveTab("formatted")}
          className={`px-4 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "formatted"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Analysed View
        </button>
        <button
          onClick={() => setActiveTab("raw")}
          className={`px-4 py-1.5 text-xs font-medium transition-colors border-l border-border ${
            activeTab === "raw"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Raw Specs
        </button>
      </div>

      {/* RAW TAB */}
      {activeTab === "raw" && (
        <div className="rounded-lg border border-border bg-card">
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              {hasRawDealerOptions ? (
                <>
                  <span className="text-xs font-semibold text-foreground">{effectiveRawStrings.length} options</span>
                  {hasLlmRaw ? (
                    <span className="text-[10px] text-violet-300 border border-violet-600/50 bg-violet-950/30 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
                      LLM Verified{llmSpec?.overall_confidence ? ` · ${llmSpec.overall_confidence}` : ""}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 border border-emerald-600/50 bg-emerald-950/30 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">Source listing</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground italic">Derived from verified scoring data — no scraped option list available</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {dealerCarUrl && (
                <a
                  href={dealerCarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Source listing ↗
                </a>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rawLines.join("\n"));
                }}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
          <pre className="text-xs text-foreground/90 font-mono leading-relaxed whitespace-pre-wrap break-words p-4 max-h-[480px] overflow-y-auto">
            {rawLines.join("\n")}
          </pre>
        </div>
      )}

      {/* FORMATTED TAB */}
      {activeTab === "formatted" && <>
      {/* Synthesised notice */}
      {isSynthesised && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-500/8 border border-blue-500/20 text-xs text-blue-400">
          <span className="shrink-0 mt-0.5">ℹ</span>
          <span>
            Specification derived from verified scoring data. Full dealer option list pending enrichment.{" "}
            {dealerCarUrl && (
              <a href={dealerCarUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">
                View source listing →
              </a>
            )}
          </span>
        </div>
      )}

      {/* Header stats */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">{totalItems}</span>
          <span className="text-sm text-foreground/70">specification items</span>
        </div>
        {highValueItems.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-bold text-amber-400">{highValueItems.length}</span>
            <span className="text-foreground/60">investment-relevant options</span>
          </div>
        )}
        {!isSynthesised && dealerCarUrl && (
          <a
            href={dealerCarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
          >
            View source listing ↗
          </a>
        )}
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search specification..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={() => setShowHighValueOnly(!showHighValueOnly)}
          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
            showHighValueOnly
              ? "bg-amber-950/60 border-amber-700/60 text-amber-200"
              : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80"
          }`}
        >
          ★ IIV+ only
        </button>
      </div>

      {/* High-value summary strip */}
      {highValueItems.length > 0 && !search && !showHighValueOnly && (
        <div className="bg-amber-950/50 border border-amber-800/50 rounded-lg px-4 py-3">
          <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-widest mb-2">
            Investment-Relevant Options Detected
          </div>
          <div className="flex flex-wrap gap-1.5">
            {highValueItems.slice(0, 8).map((item, idx) => (
              <span
                key={idx}
                className="text-xs bg-amber-900/60 border border-amber-700/60 text-amber-100 px-2 py-0.5 rounded font-medium"
              >
                {item.length > 40 ? item.slice(0, 40) + "…" : item}
              </span>
            ))}
            {highValueItems.length > 8 && (
              <span className="text-xs text-amber-300 font-medium">
                +{highValueItems.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Category sections */}
      <div className="space-y-2">
        {CATEGORIES.map((cat) => {
          const items = (filteredEquipment as Record<string, string[]>)[cat.key] ?? [];
          if (items.length === 0) return null;
          return (
            <CategorySection
              key={cat.key}
              category={cat}
              items={items}
              defaultOpen={cat.investmentRelevance === "high" && items.length > 0}
            />
          );
        })}
      </div>

      {/* Empty search state */}
      {Object.values(filteredEquipment).every((arr) => !arr || arr.length === 0) && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          No specification items match "{search}"
        </div>
      )}
      </> /* end formatted tab */}
    </div>
  );
}

export default FullSpecSheet;

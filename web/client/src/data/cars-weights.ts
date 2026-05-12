import { WEIGHTS } from "./cars";
export const WEIGHT_LABELS: Record<keyof typeof WEIGHTS, string> = {
  gpf: "GPF / Emissions Status",
  engineCondition: "Engine Condition",
  ownerHistory: "Ownership History",
  serviceHistory: "Service History",
  accidentFree: "Accident-Free Record",
  colour: "Colour Desirability",
  carbonPack: "Carbon Pack",
  seats: "Seat Type",
  interior: "Interior Desirability",
  suspensionLift: "Suspension Lift",
  carbonCeramicBrakes: "Carbon Ceramic Brakes",
  magnetorheological: "MagneRide Suspension",
  rearWheelSteering: "Rear-Wheel Steering",
  atelier: "Atelier Commission",
  trackPack: "Track Pack / Telemetry",
  limitedEdition: "Limited Edition / Special Series",
  mileage: "Mileage",
  warranty: "Warranty Coverage",
  price: "Price vs IIV",
  storageQuality: "Storage History",
};

// Weight descriptions for the framework section
export const WEIGHT_DESCRIPTIONS: Record<keyof typeof WEIGHTS, string> = {
  gpf: "Pre-GPF cars produce the unfiltered V12 sound that defines collector desirability. Post-GPF models carry a 15-20% value discount at auction.",
  engineCondition: "Cold start behaviour, oil analysis, compression test, and service records. Critical for high-revving naturally aspirated V12s.",
  ownerHistory: "Single-owner cars command 6-12% premiums at auction. Each additional owner reduces provenance confidence and resale value.",
  serviceHistory: "Full Ferrari dealer service history adds 4-8% to resale value and is mandatory for Ferrari Approved certification.",
  accidentFree: "Any accident history — even minor — can reduce value by 15-25%. HPI check is non-negotiable.",
  colour: "Special and historic colours (Atelier, non-catalogue) command 7-15% premiums. Standard greys and silvers are the weakest performers.",
  carbonPack: "Full carbon packs (interior + exterior) add £10-20k in perceived and actual value. Partial packs add £3-8k.",
  seats: "Daytona-style racing seats are a collector signal and add 4-6% premium. Standard electric seats are neutral.",
  interior: "Desirable contrast interiors (Sabbia, Cuoio, Rosso Ferrari, Blu Sterling) add 3-5% over standard Grigio Silverstone or Charcoal.",
  suspensionLift: "Front and rear lift is near-essential for UK roads. Front-only lift is a compromise. Absence is a practical and resale negative.",
  carbonCeramicBrakes: "CCB is a £12k+ factory option that signals a serious specification. Adds 4-6% to resale value and is highly sought by collectors.",
  magnetorheological: "MagneRide magnetorheological dampers (£4k option) improve ride quality and are a desirable mechanical upgrade.",
  rearWheelSteering: "Four-wheel steering improves agility and is a desirable factory option (£5k+) on the 812 Superfast.",
  atelier: "Atelier bespoke factory commissions are unique one-off cars with custom colours and specifications. Command 10-15% premiums.",
  trackPack: "Track pack and telemetry kit signal a performance-focused specification and add collector appeal.",
  limitedEdition: "Special series or limited edition variants (e.g. Competizione, Versione Speciale) command significant premiums.",
  mileage: "Lower mileage preserves mechanical integrity and collector desirability. Each 1,000 miles above 15k reduces value by ~0.3%.",
  warranty: "Ferrari Approved 24-month OEM warranty (201-point inspection) is the gold standard — adds 3-5% to effective value and provides pan-European coverage. Independent dealer warranties (3–12 months) offer partial protection. Third-party warranties (e.g. MotorEasy, Warrantywise) provide limited coverage. No warranty = full buyer risk.",
  price: "The relationship between asking price and IIV. Minor weight — specification quality should drive decisions, not price alone.",
  storageQuality: "Documented climate-controlled storage history preserves paint, rubber, and mechanical components. Adds 2% to IIV.",
};

// ============================================================
// WEIGHT EVIDENCE — Research citations for each attribute
// Sources: Hagerty, Asharex, Romans International, FerrariChat,
//          Automonitor, Bloomberg, Bring a Trailer, Collecting Cars
// ============================================================
export const WEIGHT_EVIDENCE: Record<keyof typeof WEIGHTS, { source: string; finding: string; url: string; impact: string }> = {
  gpf: {
    source: "Scuderia Car Parts / FerrariChat Community Data",
    finding: "Pre-GPF 812 Superfast cars produce the unfiltered V12 sound that defines collector desirability. The GPF was mandated from mid-2020 under Euro 6d-TEMP regulations and measurably dampens the exhaust note. Pre-GPF cars consistently command a 5–10% premium over post-GPF equivalents in the UK market, a gap expected to widen as the model ages into the classic tier — analogous to the pre-catalytic converter premium on classic Ferraris from the 1980s.",
    url: "https://www.scuderiacarparts.com/blog/the-swansong-of-the-v12-an-812-superfast-worth-hearing/",
    impact: "5–10% price premium for pre-GPF models"
  },
  engineCondition: {
    source: "CarExamer / Ferrari Technical Service Bulletins",
    finding: "The 6.5L naturally aspirated V12 (F140 GA) is mechanically robust but requires cold-start compression testing and oil analysis to detect early wear. Known issues include rear-wheel steering solenoid oil leaks (affecting ~15–20% of cars) and battery drain from the complex electrical architecture. Unresolved mechanical issues carry a 10–20% value penalty and can disqualify a car from Ferrari Approved certification.",
    url: "https://carexamer.com/blog/ferrari-812-superfast-problems-what-to-know-before-buying/",
    impact: "10–20% penalty for unresolved mechanical issues"
  },
  ownerHistory: {
    source: "Asharex — Ferrari DNA: The Role of Provenance in Supercar Valuation",
    finding: "Single-owner provenance provides an unbroken chain of custody and reduces the statistical probability of undisclosed damage or misuse. The Asharex provenance study documents that ownership lineage is a foundational component of Ferrari collector value. UK market data shows single-owner 812 Superfasts command 6–12% premiums over two-owner equivalents. The Argento Nurburgring car in our dataset (single owner, 5,428 miles) sold within 24 hours — direct market validation.",
    url: "https://www.asharex.com/news-posts/ferrari-dna-the-role-of-provenance-in-supercar-valuation",
    impact: "6–12% premium for single-owner cars"
  },
  serviceHistory: {
    source: "Romans International Buyer's Guide / Ferrari Approved Programme",
    finding: "Full Ferrari dealer service history is mandatory for Ferrari Approved certification and adds 4–8% to resale value. Ferrari's 7-year service schedule means a gap in history raises immediate questions about the major £4,500–£6,000 service. The FerrariChat community consistently rates service history above most optional equipment in resale impact: 'Condition, provenance and service history trumps bits of initially expensive bits of plastic.'",
    url: "https://www.romansinternational.com/blog/ferrari-812-superfast-gts-buyer-s-guide-everything-you-need-to-know",
    impact: "4–8% premium for full Ferrari dealer service history"
  },
  accidentFree: {
    source: "HPI Check UK / Industry Standard Valuation Practice",
    finding: "Any accident history — even minor — reduces collector car value by 15–25% due to the uncertainty it introduces about structural integrity and the difficulty of verifying repair quality. An adverse HPI finding is a binary disqualifier for investment-grade purchases. This attribute carries the highest per-point penalty in the framework. A clean HPI check is a non-negotiable prerequisite, not a positive attribute.",
    url: "https://www.hpicheck.com/",
    impact: "15–25% value penalty for any accident history"
  },
  colour: {
    source: "Automonitor Ferrari Transaction Database / Hagerty Colour Study",
    finding: "Automonitor's analysis of 1,200+ Ferrari transactions (2020–2026) found that colour influences 8–12% of final resale value on average. Hagerty's Porsche colour study (3,500 transactions) found premiums of up to $3,000 above average for the most desirable shades. For the 812 Superfast, special/historic colours (Argento Nurburgring, Blu Tour de France, Verde British Racing, Canna di Fucile) command 7–15% premiums. Bloomberg's analysis of classic car auctions confirms that rare colours consistently outperform standard colours as models transition to collector status.",
    url: "https://www.hagerty.com/media/market-trends/hagerty-insider/insider-insight-does-paint-color-really-impact-value/",
    impact: "7–15% premium for special/historic colours"
  },
  carbonPack: {
    source: "Hagerty — 8 Options That Make a Massive Difference in Collector Car Value",
    finding: "Factory carbon fibre packs (interior + exterior) add £10–20k in perceived and actual value on the 812 Superfast. Hagerty's options study found that factory options can command premiums of up to 40% for the rarest configurations. The carbon driver zone, carbon steering wheel, and carbon door panels together represent approximately £15,000 in factory list price with strong residual retention. Partial carbon packs add £3–8k.",
    url: "https://www.hagerty.com/media/market-trends/hagerty-insider/8-options-and-editions-that-make-a-massive-difference-in-collector-car-value/",
    impact: "£10–20k (7%) premium for full carbon pack"
  },
  seats: {
    source: "Romans International / Meridien Modena Dealer Assessment",
    finding: "Daytona-style fixed-back carbon racing seats are the single most desirable interior option on the 812 Superfast, commanding a premium of approximately £8,000–£12,000 over standard electric seats at point of sale, with a residual premium of 3–5% at resale. They signal a performance-focused, collector-grade specification and are increasingly expected by serious buyers. Standard electric seats are neutral — neither a positive nor a negative.",
    url: "https://www.romansinternational.com/blog/ferrari-812-superfast-gts-buyer-s-guide-everything-you-need-to-know",
    impact: "3–5% premium for Daytona racing seats"
  },
  interior: {
    source: "Romans International / Ferrari Approved UK Listing Analysis",
    finding: "Desirable contrast interiors (Sabbia, Cuoio, Rosso Ferrari, Blu Sterling) add 3–5% over standard Grigio Silverstone or Charcoal. The Sabbia leather interior over a dark exterior is considered the most desirable combination by UK specialist dealers, reflecting the classic Ferrari GT aesthetic. Contrast stitching and piping in complementary colours further enhance desirability. The FerrariChat community notes that interior condition matters more than specification for resale.",
    url: "https://www.romansinternational.com/blog/ferrari-812-superfast-gts-buyer-s-guide-everything-you-need-to-know",
    impact: "3–5% premium for desirable contrast interiors"
  },
  suspensionLift: {
    source: "Romans International Buyer's Guide / UK Road Conditions",
    finding: "The front axle lift system (approximately £4,500 new) is near-essential for UK roads given the 812 Superfast's 125mm front ground clearance. Its absence is both a practical negative (speed bumps, car parks, driveways) and a resale negative — buyers increasingly expect it as standard on UK-market cars. Front and rear lift together represent the most practically impactful option combination for UK buyers and add approximately 3–4% to effective value.",
    url: "https://www.romansinternational.com/blog/ferrari-812-superfast-gts-buyer-s-guide-everything-you-need-to-know",
    impact: "3–4% effective value addition for UK usability"
  },
  carbonCeramicBrakes: {
    source: "Ferrari UK Options Pricing / Dealer Transaction Data",
    finding: "Carbon Ceramic Brakes (CCB) are a £12,000+ factory option that signals a serious, performance-focused specification. They add 4–6% to resale value and are highly sought by collectors who intend to use the car on track. CCB also reduces unsprung weight and improves fade resistance — a meaningful mechanical benefit for a 789bhp car. Their presence is a strong positive signal about the original buyer's intent and the car's specification quality.",
    url: "https://www.romansinternational.com/blog/ferrari-812-superfast-gts-buyer-s-guide-everything-you-need-to-know",
    impact: "4–6% premium for CCB-equipped cars"
  },
  magnetorheological: {
    source: "Ferrari Technical Specifications / UK Dealer Pricing",
    finding: "MagneRide magnetorheological dampers (approximately £4,000 factory option) improve ride quality and handling response by continuously adjusting damping rates. They are a desirable mechanical upgrade that adds to the car's all-round usability and collector appeal. Particularly valuable in the UK context where road quality varies significantly. Adds approximately 2–3% to resale value.",
    url: "https://www.romansinternational.com/blog/ferrari-812-superfast-gts-buyer-s-guide-everything-you-need-to-know",
    impact: "2–3% premium for MagneRide-equipped cars"
  },
  rearWheelSteering: {
    source: "Ferrari Technical Specifications / UK Dealer Pricing",
    finding: "Four-wheel steering (approximately £5,000 factory option) improves low-speed agility and high-speed stability, making the 812 Superfast more manageable in everyday driving. It is a desirable factory option that adds to the car's dynamic capability and is increasingly expected by buyers of high-specification examples. Adds approximately 2–3% to resale value.",
    url: "https://www.romansinternational.com/blog/ferrari-812-superfast-gts-buyer-s-guide-everything-you-need-to-know",
    impact: "2–3% premium for 4WS-equipped cars"
  },
  atelier: {
    source: "Asharex Provenance Study / Ferrari Atelier Programme",
    finding: "Atelier bespoke factory commissions are unique one-off cars with custom colours, materials, and specifications unavailable through the standard configurator. The Asharex study documents premiums of 10–15% for Atelier cars at auction, reflecting their uniqueness and the prestige of the programme. The Argento Nurburgring car in our dataset is an Atelier commission — it sold within 24 hours of listing at asking price, providing direct market validation of the Atelier premium.",
    url: "https://www.asharex.com/news-posts/ferrari-dna-the-role-of-provenance-in-supercar-valuation",
    impact: "10–15% premium for Atelier commissions"
  },
  trackPack: {
    source: "Ferrari Approved UK Listing Analysis / Collector Community Data",
    finding: "Track pack and telemetry kit signal a performance-focused, enthusiast-grade specification. They add collector appeal and are a positive provenance signal — a car specified with the track pack was likely ordered by a serious driver rather than a status buyer. The Ferrari telemetry system also provides documented performance data that can add to the car's historical record. Adds approximately 2% to resale value.",
    url: "https://preowned.ferrari.com/en-GB/r/europe/used-ferrari/great-britain/812-superfast/rfcm",
    impact: "~2% premium for track pack / telemetry"
  },
  limitedEdition: {
    source: "Ferrari Competizione / Versione Speciale Market Data",
    finding: "Special series or limited edition variants command significant premiums of 30–60% over standard production cars. While the standard 812 Superfast is not a limited edition, this attribute captures any special series designations, factory one-off status, or press car provenance that may apply. The 812 Competizione (limited to 999 units) commands a 40–60% premium over the standard 812 Superfast — illustrating the power of limited production numbers.",
    url: "https://www.asharex.com/news-posts/ferrari-dna-the-role-of-provenance-in-supercar-valuation",
    impact: "30–60% premium for limited edition variants"
  },
  mileage: {
    source: "Hagerty — Low-Mileage Collector Car Premium Study",
    finding: "Hagerty's analysis of 3,500+ collector car transactions demonstrates that 'Collectible Now' vehicles with 100–1,000 miles command a 60% premium over guide value, and 1,000–10,000 mile examples command a 48% premium. For the 812 Superfast, cars under 5,000 miles consistently achieve 12–18% above the median market price. Mileage carries a reduced weight (6%) in v2.0 vs v1.0 (12%) because provenance and specification are more reliable long-term value drivers — but it remains a critical secondary factor.",
    url: "https://www.hagerty.com/media/market-trends/valuation/low-mileage-collector-car/",
    impact: "12–18% premium for under 5,000 miles"
  },
  warranty: {
    source: "Ferrari Approved Programme / UK Warranty Replacement Cost Data",
    finding: "Remaining Ferrari Approved warranty provides buyer confidence and reduces ownership risk. A 12-month Ferrari Approved warranty has a replacement cost of approximately £3,000–£5,000 for a car of this value, rising to £8,000–£12,000 for 48 months. The warranty also signals that the car has passed Ferrari's 200-point inspection and is in good mechanical health. Adds 2–4% to effective value depending on remaining coverage.",
    url: "https://preowned.ferrari.com/en-GB/r/europe/used-ferrari/great-britain/812-superfast/rfcm",
    impact: "2–4% effective value addition"
  },
  price: {
    source: "Value Investing Theory (Graham, 1949) / IIV Model",
    finding: "The relationship between asking price and IIV represents the margin of safety — the difference between what the market is asking and what the model estimates the car is worth based on its attributes. A car priced below IIV offers a built-in buffer against valuation uncertainty. Minor weight (3%) reflects that specification quality should drive decisions, not price alone — a poorly specified car at a large discount to IIV is still a poor investment.",
    url: "https://www.hagerty.com/media/market-trends/valuation/",
    impact: "Direct measure of buying opportunity"
  },
  storageQuality: {
    source: "Collector Car Storage Best Practices / Asharex Provenance Study",
    finding: "Documented climate-controlled storage history preserves paint integrity, rubber seals, and mechanical components. It is a positive provenance signal that adds approximately 2% to IIV. Particularly relevant for low-mileage cars that may have spent extended periods in storage — a car stored in a climate-controlled facility is significantly better preserved than one stored in a standard garage.",
    url: "https://www.asharex.com/news-posts/ferrari-dna-the-role-of-provenance-in-supercar-valuation",
    impact: "~2% premium for documented climate storage"
  },
};

// ============================================================
// BROADER MARKET LISTINGS — Independent Specialists & Dealers
// Sources: PistonHeads, Autotrader UK (March 2026)

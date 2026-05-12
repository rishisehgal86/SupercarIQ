/**
 * useLiveListings812
 * Fetches live 812 Superfast listings from the DB via tRPC and maps them
 * to the GenericCarSpec shape expected by Home.tsx and related components.
 *
 * Falls back to empty array while loading (Home.tsx will show static data).
 */
import { trpc } from "@/lib/trpc";
import type { GenericCarSpec } from "@/data/genericCarSpec";

// Stable string-to-number hash so legacy numeric-ID UI still works
function hashId(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Normalise score: DB stores raw weighted points (0–150), UI expects 0–100
function normaliseScore(raw: number | null | undefined): number {
  if (raw == null || raw === 0) return 0;
  return Math.round((raw / 150) * 100 * 10) / 10;
}

export function useLiveListings812() {
  const { data, isLoading, error } = trpc.listings.byModel.useQuery(
    { modelKey: "812-superfast" },
    { staleTime: 5 * 60 * 1000 } // 5 min cache
  );

  const listings: GenericCarSpec[] = (data ?? []).map((row, idx) => {
    const d = row.details;
    const totalScoreNorm = normaliseScore(d?.totalScore);
    const iiv = d?.iiv ?? 0;
    const priceVariance = d?.priceVariance ?? (iiv > 0 ? iiv - row.askingPrice : 0);
    const verdict = (d?.investmentVerdict as GenericCarSpec["investmentVerdict"]) ?? "consider";

    return {
      // Identity
      id: hashId(row.id),
      modelKey: row.modelKey,
      rank: d?.rank && d.rank > 0 ? d.rank : idx + 1,

      // Dealer / listing
      dealer: d?.dealer ?? "Ferrari Approved",
      dealerCity: "",
      dealerUrl: "https://preowned.ferrari.com",
      dealerType: d?.dealerType ?? "ferrari-approved",
      warrantyType: "ferrari-approved",
      listingUrl: row.sourceUrl,
      dealerCarUrl: row.sourceUrl,

      // Core spec
      year: row.year ?? 2019,
      mileage: row.mileage ?? 0,
      askingPrice: row.askingPrice,
      colour: row.colour ?? "Unknown",

      // GPF / spec
      gpfStatus: d?.gpfStatus ?? (row.year && row.year <= 2018 ? "none" : "fitted"),
      gpfYear: row.year && row.year <= 2018 ? "Pre-2019" : "2019+",
      atelierCar: d?.atelierCar ?? false,
      carbonCeramicBrakes: d?.ccb ?? true,
      magnetorheologicalSuspension: false,
      rearWheelSteering: false,
      trackPack: false,
      ownerCount: d?.ownerCount ?? 1,
      serviceHistory: d?.serviceHistory ?? "full-ferrari",
      accidentHistory: d?.accidentHistory ?? false,
      storageHistory: "standard",

      // Scoring
      scores: (d?.scoresJson as Record<string, number>) ?? {},
      totalScore: d?.totalScore ?? 0,
      totalScoreNorm,
      iiv: iiv > 0 ? iiv : undefined,
      iivLow: d?.iivLow ?? undefined,
      iivHigh: d?.iivHigh ?? undefined,
      priceVariance,
      priceVariancePct: d?.priceVariancePct ?? undefined,
      investmentVerdict: verdict,

      // Checklist — built from flat DB fields so BuyersGuideSection doesn't crash
      checklist: {
        preGPF: d?.gpfStatus === "none" || (row.year != null && row.year <= 2018),
        suspensionLift: d?.suspensionLift ?? false,
        carbonSteeringWheel: false,
        daytonaSeats: false,
        specialColour: false,
        carbonInteriorPack: false,
        fullFerrariServiceHistory: (d?.serviceHistory ?? "full-ferrari") === "full-ferrari",
        cleanHpiAccidentFree: !(d?.accidentHistory ?? false),
        carbonCeramicBrakes: d?.ccb ?? true,
        magnetorheologicalSuspension: false,
        rearWheelSteering: false,
        telemetryKit: false,
        climateStorageHistory: false,
        trackPack: false,
      },

      // Colour category — derive from colour name heuristics
      colourCategory: ((): GenericCarSpec["colourCategory"] => {
        const c = (row.colour ?? "").toLowerCase();
        if (c.includes("canna") || c.includes("argento nurburgring") || c.includes("blu") || c.includes("matte")) return "special";
        if (c.includes("rosso") || c.includes("grigio silverstone") || c.includes("nero")) return "desirable";
        return "standard";
      })(),

      // Interior
      interior: d?.interior ?? "Cuoio",
      interiorCategory: "standard" as const,

      // Predictions — use sensible defaults based on asking price
      predictions: {
        base2031: Math.round((row.askingPrice ?? 0) * 1.25),
        optimistic2031: Math.round((row.askingPrice ?? 0) * 1.45),
        pessimistic2031: Math.round((row.askingPrice ?? 0) * 1.08),
        base2036: Math.round((row.askingPrice ?? 0) * 1.55),
        optimistic2036: Math.round((row.askingPrice ?? 0) * 1.80),
        pessimistic2036: Math.round((row.askingPrice ?? 0) * 1.25),
      },

      // Verdict text
      verdictReason: "",
      negotiationDiscountPct: 3,

      // Metadata
      dataConfidence: d?.dataConfidence ?? "estimated",
      // firstSeenDate comes as a Date object via superjson — convert to YYYY-MM-DD string
      firstSeen: row.firstSeenDate
        ? (row.firstSeenDate instanceof Date
          ? row.firstSeenDate.toISOString().slice(0, 10)
          : String(row.firstSeenDate).slice(0, 10))
        : undefined,
      soldDate: row.soldDate
        ? (row.soldDate instanceof Date
          ? row.soldDate.toISOString().slice(0, 10)
          : String(row.soldDate).slice(0, 10))
        : undefined,
      images: (d?.imagesJson as string[]) ?? [],
      keyStrengths: (d?.keyStrengths as string[]) ?? [],
      keyWeaknesses: (d?.keyWeaknesses as string[]) ?? [],
    };
  });

  // Derive market stats from live data
  const activeListings = listings.filter(c => !c.soldDate);
  const prices = activeListings.map(c => c.askingPrice);
  // Find the most recent firstSeen date across all active listings
  const latestDate = activeListings.reduce((latest, c) => {
    if (!c.firstSeen) return latest;
    // firstSeen is already YYYY-MM-DD string at this point
    const d = new Date(c.firstSeen + "T12:00:00Z");
    return !latest || d > latest ? d : latest;
  }, null as Date | null);

  const marketStats = {
    activeListings: activeListings.length,
    // Friendly display string e.g. "8 April 2026"
    lastUpdated: latestDate
      ? latestDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "Today",
    // ISO date string for components that need to parse the date
    lastUpdatedISO: latestDate
      ? latestDate.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  };

  // hasData is true only when the query has completed AND returned rows
  // isReady is true when the query has completed (success or empty)
  const isReady = !isLoading && !error;
  const hasData = listings.length > 0;

  return { listings, marketStats, isLoading, error, hasData, isReady };
}

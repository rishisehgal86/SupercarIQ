/**
 * seed-model-configs.mjs
 *
 * Seeds the model_configs table with all 11 SupercarIQ models.
 * Run with: node scripts/seed-model-configs.mjs
 *
 * Requires DATABASE_URL in environment (Railway MySQL format).
 * Uses INSERT ... ON DUPLICATE KEY UPDATE so it's safe to re-run.
 */

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

// ── Model data ────────────────────────────────────────────────────────────────
const models = [
  {
    modelKey: "812-superfast",
    make: "Ferrari",
    model: "812 Superfast",
    yearMin: 2017,
    yearMax: 2022,
    engineSpec: "6.5L V12 NA, 800hp",
    totalUnitsProduced: "~9,000",
    originalUkPriceGbp: "£263,000",
    gpfYear: null,
    heroImageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/ferrari-812-hero_dca01ee3.jpg",
    investmentVerdict: "consider",
    isPublic: true,   // Free / ungated
    isActive: true,
    sortOrder: 1,
  },
  {
    modelKey: "f8-tributo",
    make: "Ferrari",
    model: "F8 Tributo",
    yearMin: 2019,
    yearMax: 2023,
    engineSpec: "3.9L Twin-Turbo V8, 720hp",
    totalUnitsProduced: null,
    originalUkPriceGbp: "£198,000",
    gpfYear: 2020,
    heroImageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/f8-rosso-corsa-coupe_ffb0ff71.jpg",
    investmentVerdict: "consider",
    isPublic: false,  // Gated
    isActive: true,
    sortOrder: 2,
  },
  {
    modelKey: "812-gts",
    make: "Ferrari",
    model: "812 GTS",
    yearMin: 2020,
    yearMax: 2022,
    engineSpec: "6.5L V12 NA, 800hp",
    totalUnitsProduced: "599",
    originalUkPriceGbp: "£310,000",
    gpfYear: null,
    heroImageUrl:
      "https://ferrari-cdn.thron.com/delivery/public/image/ferrari/812-gts/3zayf6/std/0x0/812-gts.jpg?quality=auto-high&format=auto",
    investmentVerdict: "consider",
    isPublic: false,
    isActive: true,
    sortOrder: 3,
  },
  {
    modelKey: "458-italia",
    make: "Ferrari",
    model: "458 Italia",
    yearMin: 2009,
    yearMax: 2015,
    engineSpec: "4.5L V8 NA, 570hp",
    totalUnitsProduced: null,
    originalUkPriceGbp: "£168,000",
    gpfYear: null,
    heroImageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_2c52f925.jpg",
    investmentVerdict: "strong-buy",
    isPublic: false,
    isActive: true,
    sortOrder: 4,
  },
  {
    modelKey: "488-gtb",
    make: "Ferrari",
    model: "488 GTB",
    yearMin: 2015,
    yearMax: 2020,
    engineSpec: "3.9L Twin-Turbo V8, 660hp",
    totalUnitsProduced: null,
    originalUkPriceGbp: "£183,000",
    gpfYear: 2019,
    heroImageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_407e629f.jpeg",
    investmentVerdict: "consider",
    isPublic: false,
    isActive: true,
    sortOrder: 5,
  },
  {
    modelKey: "california-t",
    make: "Ferrari",
    model: "California T",
    yearMin: 2014,
    yearMax: 2017,
    engineSpec: "3.9L Twin-Turbo V8, 560hp",
    totalUnitsProduced: null,
    originalUkPriceGbp: "£155,000",
    gpfYear: null,
    heroImageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_1b1fc3fa.jpeg",
    investmentVerdict: "avoid",
    isPublic: false,
    isActive: true,
    sortOrder: 6,
  },
  {
    modelKey: "portofino",
    make: "Ferrari",
    model: "Portofino",
    yearMin: 2017,
    yearMax: 2023,
    engineSpec: "3.9L Twin-Turbo V8, 600hp",
    totalUnitsProduced: null,
    originalUkPriceGbp: "£172,000",
    gpfYear: 2020,
    heroImageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_7758164a.jpg",
    investmentVerdict: "avoid",
    isPublic: false,
    isActive: true,
    sortOrder: 7,
  },
  {
    modelKey: "roma",
    make: "Ferrari",
    model: "Roma",
    yearMin: 2020,
    yearMax: 2025,
    engineSpec: "3.9L Twin-Turbo V8, 620hp",
    totalUnitsProduced: null,
    originalUkPriceGbp: "£185,000",
    gpfYear: 2020,
    heroImageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/108231505/n92Lo6pqr7S5NaS6XDN7WL/hero_eb5fcd8d.jpg",
    investmentVerdict: "avoid",
    isPublic: false,
    isActive: true,
    sortOrder: 8,
  },
  {
    modelKey: "488-pista",
    make: "Ferrari",
    model: "488 Pista",
    yearMin: 2018,
    yearMax: 2020,
    engineSpec: "3.9L Twin-Turbo V8, 720hp",
    totalUnitsProduced: "~1,000",
    originalUkPriceGbp: "£250,000",
    gpfYear: null,
    heroImageUrl:
      "https://ferrari-cdn.thron.com/delivery/public/image/ferrari/488-pista/3zayf6/std/0x0/488-pista.jpg?quality=auto-high&format=auto",
    investmentVerdict: "buy",
    isPublic: false,
    isActive: true,
    sortOrder: 9,
  },
  {
    modelKey: "sf90-stradale",
    make: "Ferrari",
    model: "SF90 Stradale",
    yearMin: 2020,
    yearMax: 2025,
    engineSpec: "4.0L Twin-Turbo V8 + 3 Electric Motors, 1,000hp",
    totalUnitsProduced: null,
    originalUkPriceGbp: "£390,000",
    gpfYear: 2020,
    heroImageUrl:
      "https://ferrari-cdn.thron.com/delivery/public/image/ferrari/sf90-stradale/3zayf6/std/0x0/sf90-stradale.jpg?quality=auto-high&format=auto",
    investmentVerdict: "consider",
    isPublic: false,
    isActive: true,
    sortOrder: 10,
  },
  {
    modelKey: "huracan-sto",
    make: "Lamborghini",
    model: "Huracán STO",
    yearMin: 2021,
    yearMax: 2024,
    engineSpec: "5.2L V10 NA, 640hp",
    totalUnitsProduced: null,
    originalUkPriceGbp: "£260,000",
    gpfYear: null,
    heroImageUrl:
      "https://www.lamborghini.com/sites/it-en/files/DAM/lamborghini/facelift_2019/models_gw/huracan/sto/2023/07_2023/huracan-sto-hero.jpg",
    investmentVerdict: "buy",
    isPublic: false,
    isActive: true,
    sortOrder: 11,
  },
];

// ── DB connection ─────────────────────────────────────────────────────────────
async function main() {
  console.log("Connecting to database…");

  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log("Connected. Seeding model_configs…\n");

  let inserted = 0;
  let updated = 0;

  for (const m of models) {
    const sql = `
      INSERT INTO model_configs
        (modelKey, make, model, yearMin, yearMax, engineSpec, totalUnitsProduced,
         originalUkPriceGbp, gpfYear, heroImageUrl, investmentVerdict,
         isPublic, isActive, sortOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        make = VALUES(make),
        model = VALUES(model),
        yearMin = VALUES(yearMin),
        yearMax = VALUES(yearMax),
        engineSpec = VALUES(engineSpec),
        totalUnitsProduced = VALUES(totalUnitsProduced),
        originalUkPriceGbp = VALUES(originalUkPriceGbp),
        gpfYear = VALUES(gpfYear),
        heroImageUrl = VALUES(heroImageUrl),
        investmentVerdict = VALUES(investmentVerdict),
        isPublic = VALUES(isPublic),
        isActive = VALUES(isActive),
        sortOrder = VALUES(sortOrder)
    `;

    const values = [
      m.modelKey,
      m.make,
      m.model,
      m.yearMin,
      m.yearMax,
      m.engineSpec ?? null,
      m.totalUnitsProduced ?? null,
      m.originalUkPriceGbp ?? null,
      m.gpfYear ?? null,
      m.heroImageUrl ?? null,
      m.investmentVerdict ?? "consider",
      m.isPublic ? 1 : 0,
      m.isActive ? 1 : 0,
      m.sortOrder ?? 0,
    ];

    const [result] = await connection.execute(sql, values);
    const affectedRows = result.affectedRows;
    // affectedRows = 1 for INSERT, 2 for UPDATE (MySQL convention)
    if (affectedRows === 1) {
      inserted++;
      console.log(`  ✓ INSERTED  ${m.modelKey}`);
    } else {
      updated++;
      console.log(`  ↻ UPDATED   ${m.modelKey}`);
    }
  }

  await connection.end();

  console.log(`\nDone. ${inserted} inserted, ${updated} updated.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});

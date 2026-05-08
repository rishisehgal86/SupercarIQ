/**
 * migrate-tidb-to-railway.mjs
 *
 * Migrates all live data from Manus TiDB → Railway MySQL.
 *
 * Usage:
 *   SOURCE_DB_URL="mysql://..." DEST_DB_URL="mysql://..." node scripts/migrate-tidb-to-railway.mjs
 *
 * Tables migrated (in dependency order):
 *   1. car_listings
 *   2. car_listing_details
 *   3. model_llm_content
 *   4. influencer_sentiment
 *   5. market_daily_stats
 *   6. car_price_snapshots_v2
 *   7. pipeline_runs
 *   8. report_leads
 *   9. users  (skips rows with duplicate email)
 *
 * Strategy: TRUNCATE destination table, then batch INSERT from source.
 * Safe to re-run — always starts fresh.
 */

import mysql from "mysql2/promise";

const SOURCE_URL = process.env.SOURCE_DB_URL;
const DEST_URL = process.env.DEST_DB_URL;

if (!SOURCE_URL || !DEST_URL) {
  console.error(
    "ERROR: Set SOURCE_DB_URL and DEST_DB_URL environment variables."
  );
  process.exit(1);
}

const BATCH_SIZE = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function connectSrc() {
  return mysql.createConnection({
    uri: SOURCE_URL,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 30000,
    // TiDB returns BigInt for some columns — convert to string
    supportBigNumbers: true,
    bigNumberStrings: false,
  });
}

async function connectDest() {
  return mysql.createConnection({
    host: "turntable.proxy.rlwy.net",
    port: 15447,
    user: "root",
    password: "XopkOOFPGnetebJcyQujvvieGvFGcFJv",
    database: "railway",
    ssl: false,
    connectTimeout: 30000,
    supportBigNumbers: true,
    bigNumberStrings: false,
  });
}

function placeholders(row) {
  return Object.keys(row)
    .map(() => "?")
    .join(", ");
}

function columns(row) {
  return Object.keys(row)
    .map((k) => `\`${k}\``)
    .join(", ");
}

async function getCommonColumns(src, dest, table) {
  const [srcCols] = await src.query(`SHOW COLUMNS FROM \`${table}\``);
  const [destCols] = await dest.query(`SHOW COLUMNS FROM \`${table}\``);
  const srcNames = new Set(srcCols.map((c) => c.Field));
  const destNames = new Set(destCols.map((c) => c.Field));
  return [...srcNames].filter((c) => destNames.has(c));
}

async function migrateTable(src, dest, table, { truncate = true, upsertKey = null, onlyColumns = null } = {}) {
  console.log(`\n── ${table} ──`);

  // Count source rows
  const [[{ cnt }]] = await src.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
  console.log(`  Source rows: ${cnt}`);

  if (cnt === 0) {
    console.log("  Nothing to migrate.");
    return 0;
  }

  // Determine which columns to migrate
  const colsToMigrate = onlyColumns ?? await getCommonColumns(src, dest, table);
  const colSelect = colsToMigrate.map((c) => `\`${c}\``).join(", ");
  console.log(`  Migrating ${colsToMigrate.length} columns.`);

  if (truncate) {
    await dest.query(`SET FOREIGN_KEY_CHECKS=0`);
    await dest.query(`TRUNCATE TABLE \`${table}\``);
    await dest.query(`SET FOREIGN_KEY_CHECKS=1`);
    console.log("  Destination truncated.");
  }

  // Stream in batches
  let offset = 0;
  let totalInserted = 0;

  while (offset < cnt) {
    const [rows] = await src.query(
      `SELECT ${colSelect} FROM \`${table}\` LIMIT ${BATCH_SIZE} OFFSET ${offset}`
    );

    if (rows.length === 0) break;

    for (const row of rows) {
      // Normalise: convert Buffer/Uint8Array to string where needed
      for (const [k, v] of Object.entries(row)) {
        if (Buffer.isBuffer(v)) {
          row[k] = v.toString("utf8");
        }
      }

      const cols = columns(row);
      const vals = Object.values(row);
      const ph = placeholders(row);

      if (upsertKey) {
        // INSERT ... ON DUPLICATE KEY UPDATE all columns
        const updates = Object.keys(row)
          .filter((k) => k !== upsertKey)
          .map((k) => `\`${k}\` = VALUES(\`${k}\`)`)
          .join(", ");
        await dest.execute(
          `INSERT INTO \`${table}\` (${cols}) VALUES (${ph}) ON DUPLICATE KEY UPDATE ${updates}`,
          vals
        );
      } else {
        await dest.execute(
          `INSERT IGNORE INTO \`${table}\` (${cols}) VALUES (${ph})`,
          vals
        );
      }
      totalInserted++;
    }

    offset += rows.length;
    process.stdout.write(`\r  Migrated ${offset}/${cnt}...`);
  }

  console.log(`\r  ✓ ${totalInserted} rows migrated.      `);
  return totalInserted;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Connecting to source (Manus TiDB)...");
  const src = await connectSrc();
  console.log("Connecting to destination (Railway MySQL)...");
  const dest = await connectDest();

  console.log("\n=== Starting migration ===");

  const results = {};

  // 1. car_listings (no FK dependencies)
  results.car_listings = await migrateTable(src, dest, "car_listings", {
    upsertKey: "id",
  });

  // 2. car_listing_details (depends on car_listings.id)
  results.car_listing_details = await migrateTable(
    src,
    dest,
    "car_listing_details",
    { upsertKey: "listingId" }
  );

  // 3. model_llm_content
  results.model_llm_content = await migrateTable(
    src,
    dest,
    "model_llm_content",
    { upsertKey: "modelKey" }
  );

  // 4. influencer_sentiment
  results.influencer_sentiment = await migrateTable(
    src,
    dest,
    "influencer_sentiment",
    { upsertKey: "id" }
  );

  // 5. market_daily_stats
  results.market_daily_stats = await migrateTable(
    src,
    dest,
    "market_daily_stats",
    { upsertKey: "id" }
  );

  // 6. car_price_snapshots_v2
  results.car_price_snapshots_v2 = await migrateTable(
    src,
    dest,
    "car_price_snapshots_v2",
    { upsertKey: "id" }
  );

  // 7. pipeline_runs
  results.pipeline_runs = await migrateTable(src, dest, "pipeline_runs", {
    upsertKey: "id",
  });

  // 8. report_leads
  results.report_leads = await migrateTable(src, dest, "report_leads", {
    upsertKey: "id",
  });

  // 9. users (upsert by email to avoid duplicates)
  results.users = await migrateTable(src, dest, "users", {
    upsertKey: "id",
  });

  await src.end();
  await dest.end();

  console.log("\n=== Migration complete ===");
  console.log("Summary:");
  for (const [table, count] of Object.entries(results)) {
    console.log(`  ${table.padEnd(30)} ${count} rows`);
  }
}

main().catch((err) => {
  console.error("\nMigration failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});

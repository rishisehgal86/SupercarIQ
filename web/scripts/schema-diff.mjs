import mysql from "mysql2/promise";

const SRC_URL = process.env.DATABASE_URL;
const DEST = {
  host: "turntable.proxy.rlwy.net",
  port: 15447,
  user: "root",
  password: "XopkOOFPGnetebJcyQujvvieGvFGcFJv",
  database: "railway",
  ssl: false,
};

const tables = [
  "car_listings",
  "car_listing_details",
  "model_llm_content",
  "influencer_sentiment",
  "market_daily_stats",
  "car_price_snapshots_v2",
  "pipeline_runs",
  "report_leads",
  "users",
];

async function main() {
  const src = await mysql.createConnection({ uri: SRC_URL, ssl: { rejectUnauthorized: false } });
  const dest = await mysql.createConnection(DEST);

  for (const table of tables) {
    const [srcCols] = await src.query(`SHOW COLUMNS FROM \`${table}\``);
    const [destCols] = await dest.query(`SHOW COLUMNS FROM \`${table}\``);
    const srcNames = srcCols.map((c) => c.Field).sort();
    const destNames = destCols.map((c) => c.Field).sort();
    const onlyInSrc = srcNames.filter((c) => !destNames.includes(c));
    const onlyInDest = destNames.filter((c) => !srcNames.includes(c));
    if (onlyInSrc.length || onlyInDest.length) {
      console.log(`\n${table}:`);
      if (onlyInSrc.length) console.log("  ONLY IN SOURCE:", onlyInSrc);
      if (onlyInDest.length) console.log("  ONLY IN DEST:  ", onlyInDest);
    } else {
      console.log(`${table}: OK (${srcNames.length} cols match)`);
    }
  }

  await src.end();
  await dest.end();
}

main().catch((e) => console.error(e.message));

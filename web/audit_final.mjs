import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);

// 1. model_configs - which models are active and when last scraped/LLM-run
const [configs] = await conn.execute('SELECT modelKey, isActive, isPublic, sortOrder, heroImageUrl, updatedAt FROM model_configs ORDER BY sortOrder');
console.log('=== MODEL CONFIGS ===');
configs.forEach(r => console.log(JSON.stringify(r)));

// 2. Listing counts per model
const [listings] = await conn.execute(`
  SELECT modelKey,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
    MIN(CASE WHEN status = 'active' THEN askingPrice END) as min_price,
    MAX(CASE WHEN status = 'active' THEN askingPrice END) as max_price,
    MAX(updatedAt) as last_updated
  FROM car_listings
  GROUP BY modelKey
  ORDER BY modelKey
`);
console.log('\n=== LISTINGS ===');
listings.forEach(r => console.log(JSON.stringify(r)));

// 3. Scored listings per model (car_listing_details)
const [scores] = await conn.execute(`
  SELECT cl.modelKey,
    COUNT(cld.id) as scored_count,
    ROUND(AVG(cld.totalScore),1) as avg_score,
    MAX(cld.updatedAt) as last_scored
  FROM car_listings cl
  LEFT JOIN car_listing_details cld ON cld.listingId = cl.id
  WHERE cl.status = 'active'
  GROUP BY cl.modelKey
  ORDER BY cl.modelKey
`);
console.log('\n=== SCORED LISTINGS (active) ===');
scores.forEach(r => console.log(JSON.stringify(r)));

// 4. LLM content status
const [llm] = await conn.execute('SELECT modelKey, investmentHeadline IS NOT NULL as has_headline, investmentReasoning IS NOT NULL as has_reasoning, pricePrediction1yr IS NOT NULL as has_1yr, updatedAt FROM model_llm_content ORDER BY modelKey');
console.log('\n=== LLM CONTENT ===');
llm.forEach(r => console.log(JSON.stringify(r)));

// 5. Market daily stats - latest date per model
const [mds] = await conn.execute(`
  SELECT modelKey, COUNT(*) as stat_rows, MAX(statDate) as latest_stat
  FROM market_daily_stats
  GROUP BY modelKey
  ORDER BY modelKey
`);
console.log('\n=== MARKET DAILY STATS ===');
mds.forEach(r => console.log(JSON.stringify(r)));

// 6. Price history snapshots
const [ph] = await conn.execute(`
  SELECT carModel, COUNT(*) as snapshots, MAX(snapshotDate) as latest
  FROM priceHistory
  GROUP BY carModel
  ORDER BY carModel
`);
console.log('\n=== PRICE HISTORY ===');
ph.forEach(r => console.log(JSON.stringify(r)));

// 7. Influencer sentiment
const [sent] = await conn.execute(`
  SELECT modelKey, COUNT(*) as entries, MAX(createdAt) as latest
  FROM influencer_sentiment
  GROUP BY modelKey
  ORDER BY modelKey
`);
console.log('\n=== INFLUENCER SENTIMENT ===');
sent.forEach(r => console.log(JSON.stringify(r)));

await conn.end();

import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);

// Check model_configs table
const [configs] = await conn.execute(`
  SELECT modelKey, isActive, totalListings, activeListings, 
         minPrice, maxPrice, lastScrapedAt, lastLlmRunAt
  FROM model_configs
  ORDER BY modelKey
`);
console.log('=== MODEL CONFIGS ===');
configs.forEach(r => console.log(JSON.stringify(r)));

// Check car_listing_details for scoring data
const [detailCols] = await conn.execute('DESCRIBE car_listing_details');
console.log('\n=== car_listing_details COLS ===', detailCols.map(c => c.Field).join(', '));

const [details] = await conn.execute(`
  SELECT 
    cl.modelKey,
    COUNT(cld.id) as has_details,
    AVG(cld.investmentScore) as avg_score,
    MAX(cld.updatedAt) as last_scored
  FROM car_listings cl
  LEFT JOIN car_listing_details cld ON cld.listingId = cl.id
  WHERE cl.status = 'active'
  GROUP BY cl.modelKey
  ORDER BY cl.modelKey
`);
console.log('\n=== LISTING DETAIL SCORES ===');
details.forEach(r => console.log(JSON.stringify(r)));

// Check priceHistory
const [phCols] = await conn.execute('DESCRIBE priceHistory');
console.log('\n=== priceHistory COLS ===', phCols.map(c => c.Field).join(', '));

const [ph] = await conn.execute(`
  SELECT modelKey, COUNT(*) as snapshots, MAX(recordedAt) as last_snapshot
  FROM priceHistory
  GROUP BY modelKey
  ORDER BY modelKey
`);
console.log('\n=== PRICE HISTORY ===');
ph.forEach(r => console.log(JSON.stringify(r)));

// Check market_daily_stats
const [mds] = await conn.execute(`
  SELECT modelKey, COUNT(*) as rows, MAX(date) as latest_date
  FROM market_daily_stats
  GROUP BY modelKey
  ORDER BY modelKey
`);
console.log('\n=== MARKET DAILY STATS ===');
mds.forEach(r => console.log(JSON.stringify(r)));

await conn.end();

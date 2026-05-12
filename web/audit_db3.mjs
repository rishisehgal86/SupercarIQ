import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);

// Describe model_configs
const [mc] = await conn.execute('DESCRIBE model_configs');
console.log('model_configs cols:', mc.map(c => c.Field).join(', '));
const [configs] = await conn.execute('SELECT * FROM model_configs ORDER BY modelKey');
console.log('=== MODEL CONFIGS ===');
configs.forEach(r => {
  const { modelKey, isActive, lastScrapedAt, lastLlmRunAt, ...rest } = r;
  console.log(JSON.stringify({ modelKey, isActive, lastScrapedAt, lastLlmRunAt, extra: Object.keys(rest) }));
});

// car_listing_details
const [cld] = await conn.execute('DESCRIBE car_listing_details');
console.log('\ncar_listing_details cols:', cld.map(c => c.Field).join(', '));

// Scores per model
const [scores] = await conn.execute(`
  SELECT cl.modelKey,
    COUNT(cld.id) as scored,
    ROUND(AVG(cld.investmentScore),1) as avg_score,
    MAX(cld.updatedAt) as last_scored
  FROM car_listings cl
  LEFT JOIN car_listing_details cld ON cld.listingId = cl.id
  WHERE cl.status = 'active'
  GROUP BY cl.modelKey
  ORDER BY cl.modelKey
`).catch(e => { console.log('scores error:', e.message); return [[]]; });
console.log('\n=== SCORES PER MODEL ===');
scores.forEach(r => console.log(JSON.stringify(r)));

// priceHistory
const [phc] = await conn.execute('DESCRIBE priceHistory');
console.log('\npriceHistory cols:', phc.map(c => c.Field).join(', '));
const [ph] = await conn.execute(`
  SELECT modelKey, COUNT(*) as rows, MAX(recordedAt) as latest
  FROM priceHistory GROUP BY modelKey ORDER BY modelKey
`).catch(e => { console.log('ph error:', e.message); return [[]]; });
console.log('=== PRICE HISTORY ===');
ph.forEach(r => console.log(JSON.stringify(r)));

// market_daily_stats
const [mdc] = await conn.execute('DESCRIBE market_daily_stats');
console.log('\nmarket_daily_stats cols:', mdc.map(c => c.Field).join(', '));
const [mds] = await conn.execute(`
  SELECT modelKey, COUNT(*) as rows, MAX(date) as latest
  FROM market_daily_stats GROUP BY modelKey ORDER BY modelKey
`).catch(e => { console.log('mds error:', e.message); return [[]]; });
console.log('=== MARKET DAILY STATS ===');
mds.forEach(r => console.log(JSON.stringify(r)));

await conn.end();

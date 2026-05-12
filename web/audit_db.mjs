import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);

// 1. Listing counts and price ranges per model
const [listings] = await conn.execute(`
  SELECT 
    modelKey,
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
console.log('=== LISTINGS ===');
listings.forEach(r => console.log(JSON.stringify(r)));

// 2. LLM content per model
const [llm] = await conn.execute(`SELECT * FROM model_llm_content ORDER BY modelKey`);
console.log('\n=== LLM CONTENT ===');
llm.forEach(r => {
  console.log(JSON.stringify({
    modelKey: r.modelKey,
    has_headline: !!r.investmentHeadline,
    has_reasoning: !!r.investmentReasoning,
    has_1yr: !!r.pricePrediction1yr,
    has_narrative: !!r.pricePredictionNarrative,
    has_drivers: !!r.valueDriversJson,
    updated_at: r.updatedAt
  }));
});

// 3. Sentiment per model
const [sentiment] = await conn.execute(`
  SELECT modelKey, COUNT(*) as count, MAX(createdAt) as last_added
  FROM influencer_sentiment
  GROUP BY modelKey
  ORDER BY modelKey
`);
console.log('\n=== SENTIMENT ===');
sentiment.forEach(r => console.log(JSON.stringify(r)));

// 4. Check scoring data (car_scores table if it exists)
try {
  const [scores] = await conn.execute(`
    SELECT modelKey, COUNT(*) as scored_cars, AVG(totalScore) as avg_score, MAX(updatedAt) as last_scored
    FROM car_scores
    GROUP BY modelKey
    ORDER BY modelKey
  `);
  console.log('\n=== CAR SCORES ===');
  scores.forEach(r => console.log(JSON.stringify(r)));
} catch(e) {
  console.log('\n=== CAR SCORES: table not found ===');
}

// 5. Check price history
try {
  const [ph] = await conn.execute(`
    SELECT modelKey, COUNT(*) as snapshots, MAX(recordedAt) as last_snapshot
    FROM price_history
    GROUP BY modelKey
    ORDER BY modelKey
  `);
  console.log('\n=== PRICE HISTORY ===');
  ph.forEach(r => console.log(JSON.stringify(r)));
} catch(e) {
  console.log('\n=== PRICE HISTORY: ' + e.message + ' ===');
}

await conn.end();

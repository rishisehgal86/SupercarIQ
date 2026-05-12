import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const url = process.env.DATABASE_URL || '';
const m = url.replace(/^mysql2?:\/\//, '').match(/^([^:]+):([^@]+)@([^:\/]+):?(\d+)?\/([^?]+)/);
if (!m) { console.log('No DB URL'); process.exit(1); }

const conn = await createConnection({
  host: m[3], port: parseInt(m[4]||'3306'), user: m[1], password: m[2], database: m[5], ssl: {}
});

const [rows] = await conn.execute(
  'SELECT modelKey, investmentHeadline, CHAR_LENGTH(investmentReasoning) as reasoning_len, pricePrediction1yr, pricePrediction3yr, pricePrediction5yr FROM model_llm_content WHERE modelKey IN ("488-gtb","california-t","portofino","roma") ORDER BY modelKey'
);
console.log(JSON.stringify(rows, null, 2));

const [sentiment] = await conn.execute(
  'SELECT modelKey, COUNT(*) as cnt FROM influencer_sentiment WHERE modelKey IN ("488-gtb","california-t","portofino","roma") GROUP BY modelKey'
);
console.log('Sentiment:', JSON.stringify(sentiment, null, 2));

await conn.end();

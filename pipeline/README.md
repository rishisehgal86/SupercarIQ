# Ferrari Pipeline

Daily data pipeline for the Ferrari 812 Superfast UK Market Analysis platform.

Runs on Railway as a cron service at **2:00 AM UTC** every day.

---

## What it does

1. **Discovery** (`discovery_scraper.py`) — Scrapes AutoTrader and Ferrari Approved for new/removed listings across all supported models. Inserts new listings into the DB and marks absent ones as `pending_sold`.

2. **Enrichment** (`detail_scraper.py`) — For each unenriched listing, visits the dealer page, extracts full spec data using an LLM, scores the car, and writes results to `car_listing_details`.

3. **Verification** (`verify_equipment.py`) — Double-checks LLM-extracted equipment against the model spec registry to catch hallucinations and misclassifications.

4. **TypeScript Regen** (`write_ts_from_db.py`) — Reads all enriched listings from the DB and regenerates the TypeScript data files in the web app's `client/src/data/` directory. Triggers a web app rebuild via the `PIPELINE_TRIGGER_SECRET` endpoint.

---

## Supported Models

| Model Key | Display Name |
|---|---|
| `812-superfast` | Ferrari 812 Superfast |
| `812-gts` | Ferrari 812 GTS |
| `f8-tributo` | Ferrari F8 Tributo |
| `458-italia` | Ferrari 458 Italia |
| `488-gtb` | Ferrari 488 GTB |
| `california-t` | Ferrari California T |
| `portofino` | Ferrari Portofino |
| `roma` | Ferrari Roma |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL connection string (same as web app) |
| `BUILT_IN_FORGE_API_URL` | Yes | Manus LLM API base URL |
| `BUILT_IN_FORGE_API_KEY` | Yes | Manus LLM API key |
| `PIPELINE_TRIGGER_SECRET` | No | Secret for web app admin panel trigger |

Copy `.env.example` to `.env` for local development.

---

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and API keys

# Run full pipeline (dry run)
python3 smart_pipeline.py --phase all --dry-run

# Run only discovery
python3 smart_pipeline.py --phase discovery

# Run only enrichment (processes one car at a time)
python3 smart_pipeline.py --phase enrich

# Regenerate TypeScript files only
python3 write_ts_from_db.py
```

---

## Railway Deployment

### 1. Create a new Railway project

1. Go to [railway.app](https://railway.app) and create a new project
2. Click **Deploy from GitHub repo**
3. Select this repository

### 2. Set environment variables

In Railway → your service → **Variables**, add:

```
DATABASE_URL=mysql://...   (copy from Manus web app secrets)
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=...  (copy from Manus web app secrets)
```

### 3. Configure as a Cron Service

Railway will automatically detect `railway.toml` and configure the service as a cron job running at `0 2 * * *` (2:00 AM UTC daily).

### 4. Verify

After the first run, check the **Deployments** tab in Railway to see the logs. You should see:
```
[INFO] Phase 1: Discovery — checking 8 models
[INFO] Phase 2: Enrichment — processing queue
[INFO] Phase 3: Verification
[INFO] Phase 4: TypeScript regen
[INFO] Pipeline complete
```

---

## File Structure

```
smart_pipeline.py        ← Orchestrator — runs all phases in sequence
discovery_scraper.py     ← Phase 1: find new/removed listings on AutoTrader
detail_scraper.py        ← Phase 2: enrich one listing with full spec + LLM
verify_equipment.py      ← Phase 3: LLM equipment verification
write_ts_from_db.py      ← Phase 4: regenerate TypeScript data files
model_spec_registry.py   ← Model spec definitions (standard vs optional equipment)
requirements.txt         ← Python dependencies
Dockerfile               ← Container build for Railway
railway.toml             ← Railway cron schedule configuration
.env.example             ← Environment variable template
logs/                    ← Local run logs (not committed)
```

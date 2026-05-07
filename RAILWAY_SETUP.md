# SupercarIQ — Railway Deployment Guide

## Overview

The SupercarIQ monorepo deploys as **three Railway services** from a single GitHub repo:

```
Railway Project: SupercarIQ
├── Service 1: supercariq-web     (web/ directory)
├── Service 2: supercariq-pipeline (pipeline/ directory)
└── Service 3: MySQL Database      (Railway managed)
```

---

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Name it `SupercarIQ`

---

## Step 2: Add MySQL Database

1. In the Railway project → **+ New Service** → **Database** → **MySQL**
2. Wait for it to provision
3. Click the MySQL service → **Connect** tab → copy the **`DATABASE_URL`** (MySQL format)

---

## Step 3: Deploy the Web App

1. **+ New Service** → **GitHub Repo** → select `rishisehgal86/SupercarIQ`
2. Set **Root Directory** to `web`
3. Railway will auto-detect the `Dockerfile` in `web/`
4. Set these **Environment Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Paste from Step 2 |
| `JWT_SECRET` | Run `openssl rand -hex 32` and paste result |
| `ADMIN_USERNAME` | Your admin username (e.g. `admin`) |
| `ADMIN_PASSWORD` | A strong password |
| `NODE_ENV` | `production` |

5. Click **Deploy**

### Database Migration (First Deploy Only)

After the first deploy, open the Railway **Shell** for the web service and run:

```bash
pnpm db:push
```

This creates all the tables from `drizzle/schema.ts`.

---

## Step 4: Deploy the Pipeline Cron

1. **+ New Service** → **GitHub Repo** → select `rishisehgal86/SupercarIQ`
2. Set **Root Directory** to `pipeline`
3. Railway will auto-detect the `Dockerfile` in `pipeline/`
4. Set these **Environment Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Same as web app (from Step 2) |
| `BUILT_IN_FORGE_API_URL` | `https://api.openai.com` |
| `BUILT_IN_FORGE_API_KEY` | Your OpenAI API key (`sk-...`) |
| `DB_API_BASE` | URL of your deployed web app (e.g. `https://supercariq-web.railway.app`) |

5. The `railway.toml` in `pipeline/` already sets the cron schedule: **07:00, 13:00, 19:00 UTC daily**
6. Click **Deploy**

---

## Step 5: Seed the Database

After both services are deployed, you need to populate the database with the existing listing data from the Manus TiDB.

Run the seed script from the Railway web service shell:

```bash
# In Railway web service shell
node dist/seed.js
```

Or alternatively, export from the Manus TiDB and import to Railway MySQL using `mysqldump`.

---

## Step 6: Configure Domain

1. In the web service → **Settings** → **Domains**
2. Either use the auto-generated `*.railway.app` domain or add a custom domain
3. Update `DB_API_BASE` in the pipeline service to match the final domain

---

## Environment Variables Summary

### Web App (`web/`)
```env
DATABASE_URL=mysql://...
JWT_SECRET=<32-byte hex>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong password>
NODE_ENV=production
```

### Pipeline (`pipeline/`)
```env
DATABASE_URL=mysql://...          # Same as web app
BUILT_IN_FORGE_API_URL=https://api.openai.com
BUILT_IN_FORGE_API_KEY=sk-...     # OpenAI API key
DB_API_BASE=https://your-app.railway.app
```

---

## Architecture Notes

- **No static TS data files** — all listing data is served live from MySQL via tRPC
- **Pipeline writes to DB** — discovery + enrichment + LLM content all write to MySQL
- **Auto-deploy** — every push to `main` branch triggers Railway rebuild of both services
- **Railway mode** — pipeline detects `RAILWAY_ENVIRONMENT` env var and skips TS/git steps
- **Local auth** — email/password with bcrypt, JWT sessions (no Manus OAuth dependency)

---

## Data Migration from Manus TiDB

To migrate existing data from the current Manus-hosted database to Railway MySQL:

1. Get the Manus TiDB connection string from the Manus project settings
2. Use `mysqldump` to export:
   ```bash
   mysqldump -h <host> -u <user> -p<pass> <dbname> \
     car_listings car_listing_details model_configs model_llm_content \
     influencer_sentiment market_daily_stats > supercariq_export.sql
   ```
3. Import to Railway MySQL:
   ```bash
   mysql -h <railway-host> -u <user> -p<pass> <dbname> < supercariq_export.sql
   ```

---

## Cron Schedule

The pipeline runs **3× daily** at:
- **07:00 UTC** (08:00 BST)
- **13:00 UTC** (14:00 BST)  
- **19:00 UTC** (20:00 BST)

Each run: Discovery → Enrich 3 listings → LLM content generation → Market stats update

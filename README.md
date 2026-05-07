# SupercarIQ

Investment-grade analysis for the UK supercar market. Every listing scored, ranked, and explained.

## Monorepo Structure

```
SupercarIQ/
├── web/          ← React + Express + tRPC web application
├── pipeline/     ← Python data pipeline (scraping, enrichment, LLM content)
└── README.md
```

## Services

### Web App (`web/`)
- **Stack**: React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL
- **Deployment**: Railway (auto-deploys on push to `main`)
- **Build**: `pnpm build` → Docker multi-stage build

### Pipeline (`pipeline/`)
- **Stack**: Python 3.11 + MySQL connector + Playwright + OpenAI
- **Deployment**: Railway Cron Service (runs 3× daily at 07:00, 13:00, 19:00 UTC)
- **Phases**: Discovery → Enrichment → LLM Content → Market Stats

## Railway Setup

1. Create a new Railway project
2. Add a **MySQL** database service
3. Add a **Web** service pointing to `web/` directory, connected to this GitHub repo
4. Add a **Cron** service pointing to `pipeline/` directory, connected to this GitHub repo
5. Set `DATABASE_URL` environment variable on both services (from Railway MySQL)
6. Set pipeline-specific env vars: `OPENAI_API_KEY`, `AT_API_KEY` (AutoTrader)

## Environment Variables

### Web App
| Variable | Description |
|---|---|
| `DATABASE_URL` | Railway MySQL connection string |
| `JWT_SECRET` | Session signing secret (generate with `openssl rand -hex 32`) |
| `ADMIN_USERNAME` | Admin panel username |
| `ADMIN_PASSWORD` | Admin panel password |

### Pipeline
| Variable | Description |
|---|---|
| `DATABASE_URL` | Railway MySQL connection string (same as web app) |
| `OPENAI_API_KEY` | OpenAI API key for LLM content generation |
| `AT_API_KEY` | AutoTrader API key for listing discovery |

## Local Development

```bash
# Web app
cd web
pnpm install
pnpm db:push
pnpm dev

# Pipeline
cd pipeline
pip install -r requirements.txt
python3 smart_pipeline.py --phase discovery --model ferrari-812-superfast
```

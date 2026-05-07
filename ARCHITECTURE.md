# SupercarIQ — Architecture Blueprint

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind 4 + shadcn/ui |
| API | tRPC 11 (type-safe, no REST boilerplate) |
| Backend | Express 4 + Node 22 |
| Database | MySQL 8 (Railway) + Drizzle ORM |
| Auth | Local auth (bcrypt passwords, JWT sessions) |
| Pipeline | Python 3.11 cron service (Railway) |
| Hosting | Railway (web + pipeline + MySQL) |
| Repo | GitHub monorepo (rishisehgal86/SupercarIQ) |

---

## Monorepo Structure

```
SupercarIQ/
├── web/                    ← React+Express web app
│   ├── client/src/
│   │   ├── pages/          ← Route-level pages
│   │   ├── components/     ← Shared UI components
│   │   ├── hooks/          ← Custom hooks
│   │   └── lib/            ← tRPC client, utils
│   ├── server/
│   │   ├── routers/        ← tRPC routers (split by domain)
│   │   ├── db.ts           ← Drizzle query helpers
│   │   └── auth.ts         ← Local auth (bcrypt + JWT)
│   ├── drizzle/
│   │   └── schema.ts       ← Single source of truth for DB
│   ├── Dockerfile
│   └── railway.toml
├── pipeline/               ← Python pipeline cron
│   ├── smart_pipeline.py   ← Main orchestrator
│   ├── discovery_scraper.py
│   ├── detail_scraper.py
│   ├── Dockerfile
│   └── railway.toml        ← cronSchedule = "0 6,18 * * *"
└── README.md
```

---

## Database Schema (Drizzle — MySQL)

### Core tables (already exist)
- `users` — local auth (email, passwordHash, role)
- `car_listings` — one row per listing (id, modelKey, askingPrice, year, colour, mileage, status)
- `car_listing_details` — enriched spec (iiv, scores, equipment, images, verdict)
- `model_llm_content` — LLM-generated analysis per model
- `influencer_sentiment` — social sentiment per model
- `model_configs` — per-model config (weights, colours, hero image)
- `market_daily_stats` — daily price/volume snapshots
- `watchlist` — user saved listings
- `report_leads` — email capture for gated content
- `pipeline_runs` — cron job audit log

### New columns needed in car_listing_details
- `magnetorheologicalSuspension` BOOLEAN
- `rearWheelSteering` BOOLEAN
- `trackPack` BOOLEAN
- `limitedEdition` BOOLEAN
- `warrantyExpiry` VARCHAR(64)
- `atelier` BOOLEAN (rename from atelierCar)
- `seats` VARCHAR(32) — "2-seat" | "2+2"
- `dealerLocation` VARCHAR(256)
- `thumbnailUrl` VARCHAR(512) — primary image URL

---

## Authentication (Local Auth)

- **Registration**: email + password (bcrypt hash, stored in `users` table)
- **Login**: POST /api/auth/login → JWT cookie (httpOnly, secure)
- **Session**: JWT verified on every tRPC request via middleware
- **Roles**: `user` | `admin` (admin set manually in DB)
- **Gate**: Non-812 reports require login (email capture replaced by account creation)
- **Admin**: /admin route, requires role=admin

---

## Routing

| Path | Page | Auth |
|---|---|---|
| / | Homepage (live model grid) | Public |
| /models | Research Hub (all models) | Public |
| /[model-slug] | Report page (unified) | Public (812) / Login (others) |
| /[model-slug]/[listing-id] | Car Detail | Same as report |
| /compare | Compare tool | Public |
| /watchlist | Watchlist | Login required |
| /sold | Sold Archive | Public |
| /finance | Finance Calculator | Public |
| /login | Login / Register | Public |
| /admin | Admin Dashboard | Admin only |
| /admin/leads | Leads list | Admin only |
| /admin/pipeline | Pipeline status | Admin only |
| /admin/models | Model config editor | Admin only |

---

## Design System (Direction B — Optimised)

### Colour palette
- Background: `#FAF8F5` (warm cream)
- Surface: `#FFFFFF` (card white)
- Border: `#E8E4DC` (warm grey)
- Text primary: `#1A1A1A`
- Text secondary: `#6B6560`
- Accent red: `#C8102E` (Ferrari red — verdicts, CTAs)
- Accent gold: `#B8960C` (premium badges)
- Dark: `#0F0F0F` (nav bar, footer)

### Typography
- Headlines: Playfair Display (serif) — 700/900
- Body: DM Sans — 400/500
- Data/labels: DM Mono — 400

### Optimisations over current design
1. **Consistent card system** — single `ListingCard` component used everywhere
2. **Verdict badges** — colour-coded pill badges (STRONG BUY=green, BUY=blue, CONSIDER=amber, AVOID=red)
3. **IIV display** — always show as "£Xk vs IIV £Yk (+£Zk)" for clarity
4. **Mobile-first** — report pages collapse to single column gracefully
5. **Skeleton loaders** — every async section has a skeleton, no layout shift
6. **Image gallery** — lazy-loaded with blur placeholder
7. **Score bars** — animated on scroll-into-view

---

## Unified Report Page Architecture

Instead of 8 separate report pages, one `ReportPage.tsx` component handles all models:

```tsx
// /[modelSlug] → ReportPage
const { data: listings } = trpc.listings.byModel.useQuery({ modelKey })
const { data: content } = trpc.modelContent.get.useQuery({ modelKey })
const { data: sentiment } = trpc.sentiment.getByModel.useQuery({ modelKey })
const { data: stats } = trpc.market.summary.useQuery({ modelKey })
const { data: config } = trpc.models.get.useQuery({ modelKey })
```

Sections (same for all models):
1. Hero — model name, verdict badge, top stat, hero image
2. Market Overview — price range, active listings, IIV gap
3. Rankings Table — all active listings ranked
4. Scoring Methodology — weight breakdown
5. Buyer's Guide — LLM content
6. Price Predictions — LLM content
7. Influencer Pulse — sentiment cards
8. The Verdict — LLM investment analysis

---

## Pipeline → DB Flow

```
Railway Cron (6am + 6pm UTC)
  └── smart_pipeline.py --phase all
        ├── Phase 1: Discovery (AT + FA scrape)
        │     └── INSERT/UPDATE car_listings
        ├── Phase 2: Enrichment (detail scraper + IIV scoring)
        │     └── INSERT/UPDATE car_listing_details
        └── Phase 3: Market stats + LLM content refresh
              └── INSERT market_daily_stats
              └── UPSERT model_llm_content (weekly)
```

No TypeScript file generation. No git commits for data. The web app reads live from DB.

---

## Local Auth Implementation

```ts
// server/auth.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Register: hash password, insert user
// Login: verify password, sign JWT, set httpOnly cookie
// Middleware: verify JWT on every tRPC request
```

JWT payload: `{ userId, email, role, iat, exp }`
Cookie: `session` (httpOnly, secure, sameSite=strict, 7-day expiry)

---

## Railway Services

| Service | Build | Start command | Env vars |
|---|---|---|---|
| web | Dockerfile (Node 22) | `node dist/index.js` | DATABASE_URL, JWT_SECRET, PORT |
| pipeline | Dockerfile (Python 3.11) | cron: `python3 smart_pipeline.py` | DATABASE_URL, OPENAI_API_KEY |
| mysql | Railway MySQL plugin | — | auto-provisioned |

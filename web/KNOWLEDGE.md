# SupercarIQ — Project Knowledge Base

This file contains standing rules and research standards that must be applied to every vehicle report on the platform. These are non-negotiable quality standards, not suggestions.

---

## Rule 1: Influencer Sentiment — Independent Wide Research Required

### Standard

For every vehicle model added to the platform, **independent wide research must be performed** for the influencer sentiment section. Findings must be curated from real, verified sources with live evidence links published in the data file.

### Scope of Research

Research must cover **all of the following channels** as a minimum:

| Channel | What to Look For |
|---|---|
| **YouTube** | Full reviews, first drives, long-term ownership videos, comparison tests |
| **X (Twitter)** | Opinions from automotive journalists, owners, and enthusiasts |
| **Instagram** | Owner posts, dealer posts, event coverage |
| **Reddit** | r/Ferrari, r/cars, r/supercars — owner experiences, buying advice threads |
| **Automotive Press** | Evo, Autocar, Top Gear Magazine, Car Magazine, PistonHeads editorial |
| **Forums** | FerrariChat, PistonHeads forums, model-specific owner clubs |
| **Auction Houses** | RM Sotheby's, Bonhams, Silverstone Auctions — lot notes and sale results |

### Evidence Standards

Every influencer entry in the `topInfluencers` array **must**:

1. **Have a real, working URL** — no placeholder IDs (e.g., `watch?v=FERRARI_F8_DOUG` is not acceptable)
2. **Be independently verified** — the URL must have been opened and confirmed to link to the correct video/article
3. **Reflect the actual content** — the `quote` field must accurately represent what the creator said, not a paraphrase or invention
4. **Include accurate metadata** — `subscribers`, `views`, and `year` must be sourced from the actual platform at time of research
5. **Cover multiple platforms** — the sentiment section must not be exclusively YouTube; X, Reddit, and press sources must be included

### Research Process

When building or updating a vehicle's sentiment data:

1. Search YouTube for `[Make] [Model] review`, `[Make] [Model] first drive`, `[Make] [Model] owner review`
2. Search X for `[Make] [Model]` filtered to automotive journalists and verified accounts
3. Search Reddit for `[Make] [Model]` in r/Ferrari, r/cars, r/supercars — read top threads
4. Search Instagram for `[Make] [Model]` — note owner sentiment and visual presentation
5. Search automotive press (Evo, Autocar, Top Gear) for editorial reviews
6. Search FerrariChat / PistonHeads forums for owner experiences
7. For each source found: open the URL, verify it works, extract a direct quote, record the metadata
8. Curate the top 8–12 sources by influence weight (subscribers × relevance × recency)
9. Write the `keyInsights` array based on patterns observed across all sources — not invented

### Why This Matters

The influencer sentiment section is one of the most credibility-sensitive parts of the platform. A buyer spending £200,000–£400,000 on a car will click the links. Broken links or fabricated quotes destroy trust instantly and permanently. Real, working links to real reviews are a core part of the platform's value proposition.

---

## Rule 2: IIV Calibration — Auction Evidence Required

Every IIV (Intrinsic Investment Value) figure must be calibrated against **at least 3 real UK auction results** from the past 24 months. Sources must include:

- RM Sotheby's UK results
- Bonhams UK results
- Silverstone Auctions results
- PistonHeads / AutoTrader completed listings (where available)

The `iivConfidence` field must reflect the quality of the evidence:
- `"high"` — 5+ comparable auction results within 12 months
- `"medium"` — 2–4 results, or results older than 12 months
- `"low"` — fewer than 2 results, or no direct comparables

---

## Rule 3: Dealer URLs — Live Listing Links Required

Every car entry's `dealerUrl` field must link to the **actual live listing** on the dealer's website or a major marketplace (PistonHeads, AutoTrader, Ferrari Approved). Generic homepage URLs (e.g., `https://www.autotrader.co.uk/cars/used/ferrari/f8-tributo`) are not acceptable for individual car entries.

When a listing expires (car is sold), update `soldDate` and optionally `soldNote` with the sale outcome. Do not delete the entry.

---

## Rule 4: Data Freshness

- Market data must be refreshed at least **monthly**
- The `LAST REFRESH` comment at the top of each data file must be updated on every refresh
- `MARKET_STATS.lastUpdated` must reflect the actual date of the last data check
- Any car that has sold must have `soldDate` populated within 7 days of sale confirmation

---

## Rule 5: Image Integrity

All car images must be:
- Hosted on the CDN (`d2xsxph8kpxj0f.cloudfront.net`) or another permanent CDN
- Confirmed to load correctly before publishing
- Representative of the actual car being listed (not a stock photo of a different spec)

---

*Last updated: March 2026*

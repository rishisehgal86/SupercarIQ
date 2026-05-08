#!/usr/bin/env python3
"""
discovery_scraper.py — Phase 1 of the Ferrari pipeline.

Scrapes AutoTrader UK and Ferrari Approved (preowned.ferrari.com) search pages
for each tracked model. Inserts new listings into car_listings, marks absent
listings as pending_sold after 3 consecutive absent days, and records price
changes in car_price_snapshots_v2.

Models tracked (modelKey → AutoTrader search URL):
  812-superfast, 812-gts, f8-tributo, 458-italia, 488-gtb,
  california-t, portofino, roma

Usage:
  python3 discovery_scraper.py [--dry-run] [--model MODEL_KEY]
"""

import argparse
import hashlib
import json
import logging
import os
import re
import sys
import time
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse, urlencode

import mysql.connector
import requests
from dotenv import load_dotenv

# ── Env ───────────────────────────────────────────────────────────────────────
PIPELINE_DIR = Path(__file__).parent
WEBAPP_DIR = PIPELINE_DIR.parent / "ferrari-812-report"

for env_path in [WEBAPP_DIR / ".env", PIPELINE_DIR / ".env"]:
    if env_path.exists():
        load_dotenv(env_path)
        break

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set.")
    sys.exit(1)

TODAY = date.today().isoformat()
log = logging.getLogger(__name__)
if not log.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        stream=sys.stdout,
    )

# ── Model registry ────────────────────────────────────────────────────────────
# AutoTrader search parameters for each model
MODELS = {
    "812-superfast": {
        "label": "Ferrari 812 Superfast",
        "at_make": "Ferrari",
        "at_model": "812 Superfast",
        "at_search_url": "https://www.autotrader.co.uk/car-search?make=Ferrari&model=812+Superfast&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc",
        "fa_model_slug": "812-superfast",
        "year_min": 2017,
        "year_max": 2023,
    },
    "812-gts": {
        "label": "Ferrari 812 GTS",
        "at_make": "Ferrari",
        "at_model": "812 GTS",
        "at_search_url": "https://www.autotrader.co.uk/car-search?make=Ferrari&model=812+GTS&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc",
        "fa_model_slug": "812-gts",
        "year_min": 2020,
        "year_max": 2023,
    },
    "f8-tributo": {
        "label": "Ferrari F8 Tributo",
        "at_make": "Ferrari",
        "at_model": "F8 Tributo",
        "at_search_url": "https://www.autotrader.co.uk/car-search?make=Ferrari&model=F8+Tributo&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc",
        "fa_model_slug": "f8-tributo",
        "year_min": 2019,
        "year_max": 2024,
    },
    "458-italia": {
        "label": "Ferrari 458 Italia",
        "at_make": "Ferrari",
        "at_model": "458 Italia",
        "at_search_url": "https://www.autotrader.co.uk/car-search?make=Ferrari&model=458+Italia&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc",
        "fa_model_slug": "458-italia",
        "year_min": 2009,
        "year_max": 2015,
    },
    "488-gtb": {
        "label": "Ferrari 488 GTB",
        "at_make": "Ferrari",
        "at_model": "488 GTB",
        "at_search_url": "https://www.autotrader.co.uk/car-search?make=Ferrari&model=488+GTB&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc",
        "fa_model_slug": "488-gtb",
        "year_min": 2015,
        "year_max": 2020,
    },
    "california-t": {
        "label": "Ferrari California T",
        "at_make": "Ferrari",
        "at_model": "California T",
        "at_search_url": "https://www.autotrader.co.uk/car-search?make=Ferrari&model=California+T&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc",
        "fa_model_slug": None,
        "year_min": 2014,
        "year_max": 2018,
    },
    "portofino": {
        "label": "Ferrari Portofino",
        "at_make": "Ferrari",
        "at_model": "Portofino",
        "at_search_url": "https://www.autotrader.co.uk/car-search?make=Ferrari&model=Portofino&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc",
        "fa_model_slug": "portofino",
        "year_min": 2017,
        "year_max": 2022,
    },
    "roma": {
        "label": "Ferrari Roma",
        "at_make": "Ferrari",
        "at_model": "Roma",
        "at_search_url": "https://www.autotrader.co.uk/car-search?make=Ferrari&model=Roma&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc",
        "fa_model_slug": "roma",
        "year_min": 2020,
        "year_max": 2025,
    },
    # ── New launch models ──────────────────────────────────────────────────────────────────────
    "488-pista": {
        "label": "Ferrari 488 Pista",
        "at_make": "Ferrari",
        "at_model": "488 Pista",
        "at_search_url": "https://www.autotrader.co.uk/car-search?make=Ferrari&model=488+Pista&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc",
        "fa_model_slug": "488-pista",
        "year_min": 2018,
        "year_max": 2020,
    },
    "sf90-stradale": {
        "label": "Ferrari SF90 Stradale",
        "at_make": "Ferrari",
        "at_model": "SF90 Stradale",
        "at_search_url": "https://www.autotrader.co.uk/car-search?make=Ferrari&model=SF90+Stradale&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc",
        "fa_model_slug": "sf90-stradale",
        "year_min": 2020,
        "year_max": 2025,
    },
    "huracan-sto": {
        "label": "Lamborghini Huracán STO",
        "at_make": "Lamborghini",
        "at_model": "Huracan",
        # AT uses 'Huracan' without accent; filter by year+price in enrichment
        "at_search_url": "https://www.autotrader.co.uk/car-search?make=Lamborghini&model=Huracan&postcode=SW1A+1AA&radius=1500&include-delivery-option=on&sort=price-asc&year-from=2021&year-to=2024",
        # Lamborghini Approved portal (lamborghini.com/en-EN/certified-pre-owned)
        "fa_model_slug": None,  # No direct FA equivalent; use specialist dealers
        "loa_search_url": "https://www.lamborghini.com/en-EN/certified-pre-owned?model=huracan-sto&country=GB",
        "year_min": 2021,
        "year_max": 2024,
    },
}

# ── DB helpers ────────────────────────────────────────────────────────────────
def parse_db_url(url: str):
    url = url.replace("mysql://", "").replace("mysql2://", "")
    user_pass, rest = url.split("@", 1)
    user, password = user_pass.split(":", 1)
    host_port, dbname = rest.split("/", 1)
    dbname = dbname.split("?")[0]
    host, port = (host_port.split(":", 1) if ":" in host_port else (host_port, "3306"))
    return dict(host=host, port=int(port), user=user, password=password, database=dbname)

def get_conn():
    kwargs = parse_db_url(DATABASE_URL)
    # Railway MySQL proxy does not use SSL; ssl_disabled=True prevents connection drops
    return mysql.connector.connect(**kwargs, ssl_disabled=False, connection_timeout=30)

# ── HTTP helpers ──────────────────────────────────────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

def fetch_page(url: str, retries: int = 3, delay: float = 5.0) -> str | None:
    """Fetch a URL with retry logic. Returns HTML text or None."""
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            if resp.status_code == 200:
                return resp.text
            elif resp.status_code == 429:
                wait = delay * (attempt + 2)
                log.warning(f"Rate limited (429) — waiting {wait}s before retry {attempt+1}/{retries}")
                time.sleep(wait)
            else:
                log.warning(f"HTTP {resp.status_code} for {url}")
                return None
        except requests.RequestException as e:
            log.warning(f"Request error (attempt {attempt+1}/{retries}): {e}")
            if attempt < retries - 1:
                time.sleep(delay)
    return None

# ── AutoTrader scraper ────────────────────────────────────────────────────────
def extract_at_listings(html: str, model_key: str) -> list[dict]:
    """
    Extract listing IDs and basic data from AutoTrader search results HTML.
    AutoTrader embeds listing data in JSON within <script> tags.
    """
    listings = []

    # Try to extract from JSON-LD or embedded data
    # AutoTrader uses window.__PRELOADED_STATE__ or similar patterns
    patterns = [
        r'"id"\s*:\s*"(\d{15,18})"',  # listing IDs in JSON
        r'/car-details/(\d{15,18})',   # in href attributes
    ]

    found_ids = set()
    for pattern in patterns:
        for match in re.finditer(pattern, html):
            found_ids.add(match.group(1))

    # Also try to extract price and basic info from JSON blobs
    # Look for price patterns near listing IDs
    price_pattern = re.compile(r'"price"\s*:\s*(\d{4,7})')
    prices = [int(m.group(1)) for m in price_pattern.finditer(html) if 10000 < int(m.group(1)) < 2000000]

    # Extract structured data from JSON blocks
    json_blocks = re.findall(r'\{[^{}]{200,}\}', html)
    listing_data = {}

    for block in json_blocks:
        try:
            data = json.loads(block)
            listing_id = None
            # Look for AT listing ID patterns
            for key in ['id', 'listingId', 'advertId']:
                val = str(data.get(key, ''))
                if re.match(r'^\d{15,18}$', val):
                    listing_id = val
                    break
            if listing_id:
                listing_data[listing_id] = data
        except (json.JSONDecodeError, TypeError):
            pass

    for listing_id in found_ids:
        data = listing_data.get(listing_id, {})
        price = data.get('price') or data.get('askingPrice')
        if isinstance(price, str):
            price = int(re.sub(r'[^\d]', '', price)) if re.search(r'\d', price) else None
        year = data.get('year') or data.get('registrationYear')
        colour = data.get('colour') or data.get('color')
        mileage = data.get('mileage') or data.get('odometerReadingMiles')
        if isinstance(mileage, str):
            mileage = int(re.sub(r'[^\d]', '', mileage)) if re.search(r'\d', mileage) else None

        listings.append({
            "id": f"{model_key}-AT-{listing_id}",
            "source_url": f"https://www.autotrader.co.uk/car-details/{listing_id}",
            "model_key": model_key,
            "source": "autotrader",
            "asking_price": int(price) if price else 0,
            "year": int(year) if year else None,
            "colour": str(colour) if colour else None,
            "mileage": int(mileage) if mileage else None,
        })

    return listings


def scrape_autotrader(model_key: str, config: dict) -> list[dict]:
    """Scrape all pages of AutoTrader search results for a model."""
    all_listings = []
    base_url = config["at_search_url"]
    page = 1
    max_pages = 10

    while page <= max_pages:
        url = base_url if page == 1 else f"{base_url}&page={page}"
        log.info(f"  AT page {page}: {url[:80]}...")
        html = fetch_page(url)
        if not html:
            log.warning(f"  Failed to fetch page {page}")
            break

        page_listings = extract_at_listings(html, model_key)
        if not page_listings:
            log.info(f"  No listings on page {page} — stopping")
            break

        # Check for duplicate IDs (means we've looped)
        new_ids = {l["id"] for l in page_listings}
        existing_ids = {l["id"] for l in all_listings}
        if new_ids.issubset(existing_ids):
            log.info(f"  Duplicate page detected — stopping at page {page}")
            break

        all_listings.extend(page_listings)
        log.info(f"  Found {len(page_listings)} listings on page {page} (total: {len(all_listings)})")

        # Check if there's a next page
        if 'page=' not in html or f'page={page+1}' not in html:
            break

        page += 1
        time.sleep(3)  # Polite delay between pages

    return all_listings


# ── Ferrari Approved scraper ──────────────────────────────────────────────────
def _fetch_fa_page(slug: str, page: int) -> dict | None:
    """
    Fetch a single page of Ferrari Approved UK search results.
    Uses the Next.js SSR page which embeds all listing data in __NEXT_DATA__.
    Returns the parsed searchResults dict or None on failure.
    """
    url = (
        f"https://preowned.ferrari.com/en-GB/r/europe/used-ferrari/great-britain/rfc"
        f"?model={slug}&page={page}"
    )
    log.info(f"  FA page {page}: {url}")
    html = fetch_page(url)
    if not html:
        return None
    match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        html, re.DOTALL
    )
    if not match:
        log.warning(f"  FA: could not find __NEXT_DATA__ on page {page}")
        return None
    try:
        data = json.loads(match.group(1))
        props = data["props"]
        # Try both possible paths: pageProps.initialState and direct initialState
        state = (
            props.get("pageProps", {}).get("initialState")
            or props.get("initialState")
        )
        if not state:
            log.warning(f"  FA: could not find initialState in __NEXT_DATA__ on page {page}")
            return None
        return state["search"]["searchResults"]
    except (KeyError, json.JSONDecodeError) as e:
        log.warning(f"  FA: failed to parse __NEXT_DATA__ on page {page}: {e}")
        return None


def _parse_fa_ad(ad: dict, model_key: str) -> dict | None:
    """
    Convert a Ferrari Approved ad dict (from __NEXT_DATA__) into a listing dict
    suitable for upsert_listing().
    """
    car_id = ad.get("id") or ad.get("vin", "")
    if not car_id:
        return None

    # Stable hash-based listing ID
    id_hash = hashlib.md5(str(car_id).encode()).hexdigest()[:8]
    listing_id = f"{model_key}-FA-{id_hash}"

    # Canonical detail page URL
    from urllib.parse import quote
    encoded_id = quote(str(car_id), safe="")
    source_url = (
        f"https://preowned.ferrari.com/en-GB/a/europe/used-ferrari/great-britain/{encoded_id}"
    )

    price = ad.get("price") or 0
    if isinstance(price, str):
        price = int(re.sub(r'[^\d]', '', price)) if re.search(r'\d', price) else 0

    year = ad.get("year")
    colour = ad.get("exteriorColor") or ad.get("trimColor")
    mileage = ad.get("odometer")
    if mileage is None:
        # Try overviewData
        for item in (ad.get("overviewData") or []):
            if item.get("slug") == "odometer":
                mileage = item.get("value")
                break

    # Normalise mileage to miles (FA uses odometerUnit field)
    odometer_unit = ad.get("odometerUnit", "mi")
    if mileage and odometer_unit == "km":
        mileage = int(int(mileage) * 0.621371)

    return {
        "id": listing_id,
        "source_url": source_url,
        "model_key": model_key,
        "source": "ferrari-approved",
        "asking_price": int(price) if price else 0,
        "year": int(year) if year else None,
        "colour": str(colour) if colour else None,
        "mileage": int(mileage) if mileage else None,
    }


def scrape_ferrari_approved(model_key: str, config: dict) -> list[dict]:
    """
    Scrape all pages of Ferrari Approved UK listings for a given model.
    Uses Playwright (headless Chromium) to correctly handle Next.js SSR
    pagination — plain HTTP requests always return the same first-page data.
    """
    slug = config.get("fa_model_slug")
    if not slug:
        log.info(f"  FA: no slug configured for {model_key} — skipping")
        return []

    from fa_playwright_scraper import scrape_ferrari_approved_playwright
    return scrape_ferrari_approved_playwright(model_key, slug)


# ── DB operations ─────────────────────────────────────────────────────────────
def batch_upsert_listings(conn, listings: list[dict], dry_run: bool = False) -> dict:
    """
    Batch insert/update listings in car_listings using a single SQL statement.
    Returns stats dict with 'new', 'updated', 'unchanged' counts.
    """
    if not listings:
        return {"new": 0, "updated": 0, "unchanged": 0}

    cur = conn.cursor(dictionary=True)

    # Fetch all existing listings for this model in one query
    ids = [l["id"] for l in listings]
    placeholders = ",".join(["%s"] * len(ids))
    cur.execute(f"SELECT id, askingPrice, year, colour, mileage, status FROM car_listings WHERE id IN ({placeholders})", ids)
    existing_map = {row["id"]: row for row in cur.fetchall()}

    stats = {"new": 0, "updated": 0, "unchanged": 0}
    new_listings = []
    price_snapshots = []
    price_changes = []  # (id, new_price, change)

    for listing in listings:
        lid = listing["id"]
        existing = existing_map.get(lid)

        if not existing:
            if dry_run:
                log.info(f"    [DRY RUN] Would insert: {lid} @ £{listing['asking_price']:,}")
            else:
                new_listings.append((
                    lid, listing["source_url"], listing["model_key"], listing["source"],
                    listing["asking_price"], listing["year"], listing["colour"], listing["mileage"],
                    TODAY, TODAY,
                ))
                price_snapshots.append((lid, listing["asking_price"], 0, TODAY))
                log.info(f"    NEW: {lid} @ £{listing['asking_price']:,}")
            stats["new"] += 1
        else:
            updates = ["lastSeenDate = %s", "consecutiveAbsentDays = 0"]
            params = [TODAY]
            changed = False

            old_price = existing["askingPrice"]
            new_price = listing["asking_price"]
            if new_price and new_price != old_price and new_price > 0:
                updates.append("askingPrice = %s")
                params.append(new_price)
                change = new_price - old_price
                price_changes.append((lid, new_price, change))
                log.info(f"    PRICE CHANGE: {lid} £{old_price:,} → £{new_price:,} ({'+' if change > 0 else ''}{change:,})")
                changed = True

            if listing["year"] and not existing["year"]:
                updates.append("year = %s"); params.append(listing["year"]); changed = True
            if listing["colour"] and not existing["colour"]:
                updates.append("colour = %s"); params.append(listing["colour"]); changed = True
            if listing["mileage"] and not existing["mileage"]:
                updates.append("mileage = %s"); params.append(listing["mileage"]); changed = True
            if existing["status"] == "pending_sold":
                updates.append("status = 'active'")
                log.info(f"    REACTIVATED: {lid}")
                changed = True

            params.append(lid)
            if not dry_run:
                cur.execute(f"UPDATE car_listings SET {', '.join(updates)} WHERE id = %s", params)
            stats["updated" if changed else "unchanged"] += 1

    # Batch insert new listings
    if new_listings and not dry_run:
        cur.executemany("""
            INSERT IGNORE INTO car_listings
              (id, sourceUrl, modelKey, source, status, askingPrice, year, colour, mileage,
               firstSeenDate, lastSeenDate, consecutiveAbsentDays)
            VALUES (%s, %s, %s, %s, 'active', %s, %s, %s, %s, %s, %s, 0)
        """, new_listings)
        log.info(f"  Batch inserted {len(new_listings)} new listings")

    # Batch insert price snapshots for new listings
    if price_snapshots and not dry_run:
        cur.executemany("""
            INSERT INTO car_price_snapshots_v2 (listingId, price, changeAmount, recordedDate)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE price = VALUES(price), changeAmount = VALUES(changeAmount)
        """, price_snapshots)

    # Record price changes
    if price_changes and not dry_run:
        cur.executemany("""
            INSERT INTO car_price_snapshots_v2 (listingId, price, changeAmount, recordedDate)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE price = VALUES(price), changeAmount = VALUES(changeAmount)
        """, [(lid, price, change, TODAY) for lid, price, change in price_changes])

    if not dry_run:
        conn.commit()

    return stats


def upsert_listing(conn, listing: dict, dry_run: bool = False) -> str:
    """Single-listing upsert (kept for compatibility). Prefer batch_upsert_listings."""
    stats = batch_upsert_listings(conn, [listing], dry_run=dry_run)
    if stats["new"]: return "new"
    if stats["updated"]: return "updated"
    return "unchanged"


def record_price_snapshot(conn, listing_id: str, price: int, change: int):
    """Record a price snapshot for a listing."""
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO car_price_snapshots_v2 (listingId, price, changeAmount, recordedDate)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE price = VALUES(price), changeAmount = VALUES(changeAmount)
    """, (listing_id, price, change, TODAY))
    conn.commit()


def mark_absent_listings(conn, model_key: str, seen_ids: set, dry_run: bool = False):
    """
    Two-step archive flow:
    1. Active listings absent 3+ consecutive days -> pending_sold
    2. Pending_sold listings still absent on next run -> archived (with archivedAt timestamp)

    This means a listing goes: active -> pending_sold -> archived across two scrape runs,
    giving at least one full scrape cycle as a grace period before archiving.
    """
    cur = conn.cursor(dictionary=True)

    # Step 1: Archive any pending_sold listings that are still absent this run
    cur.execute(
        "SELECT id, consecutiveAbsentDays FROM car_listings WHERE modelKey = %s AND status = 'pending_sold'",
        (model_key,)
    )
    pending = cur.fetchall()

    archived_count = 0
    for row in pending:
        if row["id"] not in seen_ids:
            # Still absent -- move to archived
            if not dry_run:
                cur.execute(
                    "UPDATE car_listings SET status = 'archived', archivedAt = NOW(), consecutiveAbsentDays = %s WHERE id = %s",
                    ((row["consecutiveAbsentDays"] or 0) + 1, row["id"])
                )
                conn.commit()
            log.info(f"    ARCHIVED: {row['id']} (confirmed gone)")
            archived_count += 1
        # If it reappeared, batch_upsert_listings will reactivate it (status = 'active')

    # Step 2: Mark active listings absent 3+ days as pending_sold
    cur.execute(
        "SELECT id, consecutiveAbsentDays FROM car_listings WHERE modelKey = %s AND status = 'active'",
        (model_key,)
    )
    active = cur.fetchall()

    marked_sold = 0
    for row in active:
        if row["id"] not in seen_ids:
            new_absent = (row["consecutiveAbsentDays"] or 0) + 1
            if new_absent >= 3:
                if not dry_run:
                    cur.execute(
                        "UPDATE car_listings SET status = 'pending_sold', consecutiveAbsentDays = %s WHERE id = %s",
                        (new_absent, row["id"])
                    )
                    conn.commit()
                log.info(f"    PENDING SOLD: {row['id']} (absent {new_absent} days)")
                marked_sold += 1
            else:
                if not dry_run:
                    cur.execute(
                        "UPDATE car_listings SET consecutiveAbsentDays = %s WHERE id = %s",
                        (new_absent, row["id"])
                    )
                    conn.commit()
                log.info(f"    ABSENT {new_absent}/3: {row['id']}")

    return marked_sold, archived_count


def update_market_daily_stats(conn, model_key: str, dry_run: bool = False):
    """Record today's market stats for the model."""
    cur = conn.cursor()
    cur.execute("""
        SELECT COUNT(*) as active_count,
               AVG(askingPrice) as avg_price,
               MIN(askingPrice) as min_price,
               MAX(askingPrice) as max_price
        FROM car_listings
        WHERE modelKey = %s AND status = 'active'
    """, (model_key,))
    row = cur.fetchone()
    if not row or not row[0]:
        return

    active_count, avg_price, min_price, max_price = row

    # Count new listings today
    cur.execute("""
        SELECT COUNT(*) FROM car_listings
        WHERE modelKey = %s AND firstSeenDate = %s
    """, (model_key, TODAY))
    new_today = cur.fetchone()[0]

    # Count sold today
    cur.execute("""
        SELECT COUNT(*) FROM car_listings
        WHERE modelKey = %s AND soldDate = %s
    """, (model_key, TODAY))
    sold_today = cur.fetchone()[0]

    if not dry_run:
        cur.execute("""
            INSERT INTO market_daily_stats
              (modelKey, statDate, activeCount, avgPrice, minPrice, maxPrice, newListings, soldCount)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
              activeCount = VALUES(activeCount),
              avgPrice = VALUES(avgPrice),
              minPrice = VALUES(minPrice),
              maxPrice = VALUES(maxPrice),
              newListings = VALUES(newListings),
              soldCount = VALUES(soldCount)
        """, (model_key, TODAY, active_count, int(avg_price or 0), min_price, max_price, new_today, sold_today))
        conn.commit()

    log.info(f"  Market stats: {active_count} active, avg £{int(avg_price or 0):,}, {new_today} new today")


# ── Main ──────────────────────────────────────────────────────────────────────
def run_discovery(model_key: str, config: dict, dry_run: bool = False) -> dict:
    """Run discovery for a single model. Returns stats dict."""
    log.info(f"\n{'='*60}")
    log.info(f"Discovery: {config['label']} ({model_key})")
    log.info(f"{'='*60}")

    # Scrape Ferrari Approved only (AutoTrader removed — blocked by bot detection)
    fa_listings = scrape_ferrari_approved(model_key, config)

    all_listings = fa_listings
    log.info(f"Total found: {len(all_listings)} (FA: {len(fa_listings)})")

    if not all_listings:
        log.warning(f"No listings found for {model_key} — skipping DB update")
        return {"new": 0, "updated": 0, "unchanged": 0, "marked_sold": 0, "archived": 0}

    conn = get_conn()
    stats = {"new": 0, "updated": 0, "unchanged": 0, "marked_sold": 0, "archived": 0}

    # Filter out listings with no/invalid price
    valid_listings = [l for l in all_listings if l.get("asking_price") and l["asking_price"] >= 5000]
    seen_ids = {l["id"] for l in valid_listings}

    # Batch upsert all listings in a single DB round-trip
    batch_stats = batch_upsert_listings(conn, valid_listings, dry_run=dry_run)
    stats.update(batch_stats)

    # Mark absent listings and archive confirmed-gone listings
    marked_sold, archived_count = mark_absent_listings(conn, model_key, seen_ids, dry_run=dry_run)
    stats["marked_sold"] = marked_sold
    stats["archived"] = archived_count

    # Update market stats
    update_market_daily_stats(conn, model_key, dry_run=dry_run)

    conn.close()

    log.info(f"Results: {stats['new']} new, {stats['updated']} updated, "
             f"{stats['unchanged']} unchanged, {stats['marked_sold']} marked pending_sold, "
             f"{stats['archived']} archived")
    return stats


def main():
    parser = argparse.ArgumentParser(description="Ferrari Pipeline — Discovery Scraper")
    parser.add_argument("--dry-run", action="store_true", help="Print what would happen without writing to DB")
    parser.add_argument("--model", help="Only scrape a specific model key (e.g. 812-superfast)")
    args = parser.parse_args()

    models_to_run = {args.model: MODELS[args.model]} if args.model and args.model in MODELS else MODELS

    total_stats = {"new": 0, "updated": 0, "unchanged": 0, "marked_sold": 0, "archived": 0}

    for model_key, config in models_to_run.items():
        try:
            stats = run_discovery(model_key, config, dry_run=args.dry_run)
            for k, v in stats.items():
                total_stats[k] = total_stats.get(k, 0) + v
            time.sleep(10)  # Polite delay between models
        except Exception as e:
            log.error(f"Error processing {model_key}: {e}")
            import traceback
            traceback.print_exc()

    log.info(f"\n{'='*60}")
    log.info(f"Discovery complete — {len(models_to_run)} models scanned")
    log.info(f"Total: {total_stats['new']} new listings found")
    log.info(f"       {total_stats['updated']} listings updated")
    log.info(f"       {total_stats['marked_sold']} listings marked pending_sold")
    log.info(f"       {total_stats['archived']} listings archived")
    log.info(f"{'='*60}")

    # Print summary for smart_pipeline.py to parse
    print(f"{total_stats['new']} new listings found across {len(models_to_run)} models (Ferrari Approved only)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""
fa_playwright_scraper.py — Ferrari Approved (preowned.ferrari.com) scraper.

KEY INSIGHT (May 2026): The model-specific URL pattern DOES filter server-side:
  https://preowned.ferrari.com/en-GB/r/europe/used-ferrari/great-britain/{slug}/rfcm
  
This returns ONLY listings for that model — far more efficient than scraping all
185 GB listings and filtering client-side.

Previous approach (deprecated): Fetch ALL pages, filter by carName client-side.
New approach: Use model-specific URL, paginate only within that model's results.

Model slug mappings (FA URL slug → our model_key):
  812-superfast  → 812-superfast
  812-gts        → 812-gts
  f8-tributo     → f8-tributo
  458-italia     → 458-italia
  488-gtb        → 488-gtb
  488-pista      → 488-pista
  sf90-stradale  → sf90-stradale
  portofino      → portofino
  roma           → roma

Usage (from discovery_scraper.py):
    from fa_playwright_scraper import scrape_ferrari_approved_playwright
    listings = scrape_ferrari_approved_playwright(model_key, fa_slug)
    # fa_slug = None means model is not on Ferrari Approved (e.g. Lamborghini)
"""

import asyncio
import hashlib
import json
import logging
import re
import time

log = logging.getLogger(__name__)

FA_BASE = "https://preowned.ferrari.com/en-GB/r/europe/used-ferrari/great-britain"

# Map from our model_key to the Ferrari Approved URL slug.
# None means the model is not listed on Ferrari Approved.
MODEL_FA_SLUGS: dict[str, str | None] = {
    "812-superfast": "812-superfast",
    "812-gts": "812-gts",
    "f8-tributo": "f8-tributo",
    "f8-spider": "f8-spider",
    "458-italia": "458-italia",
    "488-gtb": "488-gtb",
    "488-spider": "488-spider",
    "488-pista": "488-pista",
    "sf90-stradale": "sf90-stradale",
    "sf90": "sf90-stradale",
    "portofino": "portofino",
    "roma": "roma",
    "296-gtb": "296-gtb",
    "296-gts": "296-gts",
    "purosangue": "purosangue",
    "california-t": None,  # Not on Ferrari Approved
    "huracan-sto": None,   # Lamborghini — not on Ferrari Approved
}

# Fallback: carName values for client-side verification (accuracy check)
MODEL_CAR_NAMES: dict[str, list[str]] = {
    "812-superfast": ["812 Superfast"],
    "812-gts": ["812 GTS"],
    "f8-tributo": ["F8 Tributo"],
    "f8-spider": ["F8 Spider"],
    "458-italia": ["458 Italia"],
    "488-gtb": ["488 GTB"],
    "488-spider": ["488 Spider"],
    "488-pista": ["488 Pista", "488 Pista Spider"],
    "sf90-stradale": ["SF90 Stradale", "SF90 Spider"],
    "sf90": ["SF90 Stradale", "SF90 Spider"],
    "portofino": ["Ferrari Portofino", "Ferrari Portofino M"],
    "roma": ["Ferrari Roma", "Ferrari Roma Spider"],
    "296-gtb": ["296 GTB"],
    "296-gts": ["296 GTS"],
    "purosangue": ["Purosangue"],
    "california-t": ["Ferrari California T", "California T"],
    "huracan-sto": [],
}


def _matches_model(car_name: str, model_key: str) -> bool:
    """Verify carName matches expected model — used as accuracy check."""
    expected = MODEL_CAR_NAMES.get(model_key, [])
    if not expected:
        return True  # No filter for models without known carName
    car_name_lower = car_name.lower()
    return any(exp.lower() in car_name_lower for exp in expected)


def _parse_fa_ad(ad: dict, model_key: str) -> dict | None:
    """Convert a Ferrari Approved ad dict into a listing dict for batch_upsert_listings."""
    car_id = ad.get("id") or ad.get("vin", "")
    if not car_id:
        return None

    id_hash = hashlib.md5(str(car_id).encode()).hexdigest()[:8]
    listing_id = f"{model_key}-FA-{id_hash}"

    from urllib.parse import quote
    encoded_id = quote(str(car_id), safe="")
    source_url = (
        f"https://preowned.ferrari.com/en-GB/a/europe/used-ferrari/great-britain/{encoded_id}"
    )

    price = ad.get("price") or 0
    if isinstance(price, str):
        price = int(re.sub(r"[^\d]", "", price)) if re.search(r"\d", price) else 0

    year = ad.get("year")
    colour = ad.get("exteriorColor") or ad.get("trimColor")

    mileage = ad.get("odometer")
    if mileage is None:
        for item in (ad.get("overviewData") or []):
            if item.get("slug") == "odometer":
                mileage = item.get("value")
                break

    odometer_unit = ad.get("odometerUnit", "mi")
    if mileage and odometer_unit == "km":
        mileage = int(int(mileage) * 0.621371)

    # Dealer name
    dealer = None
    dealer_info = ad.get("dealer") or {}
    if isinstance(dealer_info, dict):
        dealer = dealer_info.get("name") or dealer_info.get("dealerName")

    return {
        "id": listing_id,
        "source_url": source_url,
        "model_key": model_key,
        "source": "ferrari-approved",
        "asking_price": int(price) if price else 0,
        "year": int(year) if year else None,
        "colour": str(colour) if colour else None,
        "mileage": int(mileage) if mileage else None,
        "dealer_name": dealer,
    }


async def _scrape_async(model_key: str, fa_slug: str) -> list[dict]:
    """
    Async Playwright scraper for Ferrari Approved UK listings.

    Uses the model-specific URL for efficient server-side filtering.
    Paginates only within that model's results.
    """
    from playwright.async_api import async_playwright

    all_listings: list[dict] = []
    seen_ids: set[str] = set()
    mismatches: int = 0

    # Build model-specific base URL
    model_base_url = f"{FA_BASE}/{fa_slug}/rfcm"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="en-GB",
        )
        page = await context.new_page()

        # ── Page 1 ────────────────────────────────────────────────────────────
        log.info(f"  FA: scraping {model_key} from {model_base_url}")
        try:
            await page.goto(model_base_url, wait_until="domcontentloaded", timeout=45000)
            await page.wait_for_timeout(4000)
        except Exception as e:
            log.warning(f"  FA: page 1 load error for {model_key}: {e}")
            await browser.close()
            return []

        page_data = await _extract_next_data(page)
        if not page_data:
            log.warning(f"  FA: could not extract __NEXT_DATA__ for {model_key}")
            await browser.close()
            return []

        ads = page_data.get("ads", [])
        pagination = page_data.get("pagination", {})
        total_pages = pagination.get("pages", 1)
        total = pagination.get("total", 0)
        log.info(f"  FA: {total} {model_key} listings across {total_pages} pages")

        for ad in ads:
            car_name = ad.get("carName", "")
            if not _matches_model(car_name, model_key):
                mismatches += 1
                log.warning(f"  FA: unexpected carName '{car_name}' on {model_key} page — skipping")
                continue
            listing = _parse_fa_ad(ad, model_key)
            if listing and listing["id"] not in seen_ids:
                seen_ids.add(listing["id"])
                all_listings.append(listing)

        # ── Pages 2..N ────────────────────────────────────────────────────────
        for pl in range(1, total_pages):
            page_url = f"{model_base_url}?pl={pl}"
            log.info(f"  FA: page {pl + 1}/{total_pages}: {page_url}")
            try:
                await page.goto(page_url, wait_until="domcontentloaded", timeout=45000)
                await page.wait_for_timeout(3000)
            except Exception as e:
                log.warning(f"  FA: page {pl + 1} load error: {e}")
                continue

            page_data = await _extract_next_data(page)
            if not page_data:
                log.warning(f"  FA: no data on page {pl + 1}, skipping")
                continue

            page_ads = page_data.get("ads", [])
            new_count = 0
            for ad in page_ads:
                car_name = ad.get("carName", "")
                if not _matches_model(car_name, model_key):
                    mismatches += 1
                    log.warning(f"  FA: unexpected carName '{car_name}' on {model_key} page — skipping")
                    continue
                listing = _parse_fa_ad(ad, model_key)
                if listing and listing["id"] not in seen_ids:
                    seen_ids.add(listing["id"])
                    all_listings.append(listing)
                    new_count += 1

            log.info(f"    page {pl + 1}: {new_count} new listings (total: {len(all_listings)})")

        await browser.close()

    if mismatches:
        log.warning(f"  FA: {mismatches} unexpected model mismatches on {model_key} pages (accuracy issue)")
    log.info(f"  FA: scraped {len(all_listings)} unique {model_key} listings from Ferrari Approved GB")
    return all_listings


async def _extract_next_data(page) -> dict | None:
    """Extract searchResults from __NEXT_DATA__ script tag via JavaScript."""
    return await page.evaluate("""
        () => {
            const el = document.getElementById('__NEXT_DATA__');
            if (!el) return null;
            try {
                const data = JSON.parse(el.textContent);
                const props = data?.props || {};
                const state = props?.pageProps?.initialState || props?.initialState;
                const results = state?.search?.searchResults;
                if (results?.ads?.length > 0) return results;
            } catch (e) {}
            return null;
        }
    """)


def scrape_ferrari_approved_playwright(model_key: str, slug: str | None) -> list[dict]:
    """
    Synchronous entry point for the discovery pipeline.

    Args:
        model_key: Our internal model key (e.g. '812-superfast')
        slug: Ferrari Approved URL slug. If None, model is not on FA — returns [].
    """
    # Resolve slug: use provided slug, or look up from MODEL_FA_SLUGS
    fa_slug = slug or MODEL_FA_SLUGS.get(model_key)
    if not fa_slug:
        log.info(f"  FA: {model_key} not on Ferrari Approved — skipping")
        return []

    try:
        return asyncio.run(_scrape_async(model_key, fa_slug))
    except Exception as e:
        log.error(f"  FA: fatal error for {model_key}: {e}")
        return []

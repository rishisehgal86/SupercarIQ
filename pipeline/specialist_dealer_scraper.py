"""
specialist_dealer_scraper.py — UK Specialist Dealer Scraper
============================================================
Scrapes UK supercar specialist dealers for listings across ALL supported models.

ARCHITECTURE
------------
Adding a new car model to the platform requires ONLY adding a ModelSpec to
model_registry.py.  This scraper reads model specs from there and applies
them uniformly to every dealer.

Adding a new dealer requires ONLY adding an entry to dealer_registry.py.
The generic scraper will handle it automatically.

MODEL GATING (strict — data accuracy is paramount)
-----------
Every listing candidate goes through three layers:
  Layer 1 — Title/URL keyword gate: ALL required_terms must appear, NONE of
             forbidden_terms may appear (case-insensitive, accent-normalised).
  Layer 2 — Year guard: if a year is extracted, it must be within [year_min,
             year_max] for the model.  Listings with no year are accepted but
             flagged for enrichment.
  Layer 3 — Price guard: if a price is extracted, it must be within
             [price_min, price_max].  Out-of-range prices are rejected.

Any rejection is logged at DEBUG level with the exact reason.
"""

from __future__ import annotations

import hashlib
import logging
import re
import time
from typing import Optional

import requests
from bs4 import BeautifulSoup

from model_registry import MODEL_REGISTRY, ModelSpec, get_model
from dealer_registry import DEALER_REGISTRY, get_romans_stock_url

logger = logging.getLogger(__name__)

# ── Request headers (bot-avoidance) ──────────────────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
}

REQUEST_DELAY = 3.0  # seconds between requests


def fetch_page(url: str, retries: int = 3, delay: float = REQUEST_DELAY) -> Optional[str]:
    """Fetch a page with retry logic and polite delays."""
    for attempt in range(retries):
        try:
            time.sleep(delay + (attempt * 2))
            resp = requests.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
            if resp.status_code == 200:
                return resp.text
            elif resp.status_code == 429:
                logger.warning(f"Rate limited on {url}, waiting 60s...")
                time.sleep(60)
            else:
                logger.warning(f"HTTP {resp.status_code} for {url}")
        except Exception as e:
            logger.warning(f"Fetch error for {url}: {e}")
    return None


def make_listing_id(source_prefix: str, model_key: str, url: str) -> str:
    """Generate a stable listing ID from source prefix + URL hash."""
    h = hashlib.md5(url.encode()).hexdigest()[:8]
    prefix = re.sub(r"[^A-Z0-9]", "", source_prefix.upper())[:4]
    return f"{model_key}-{prefix}-{h}"


def normalise_price(price_str: str) -> Optional[int]:
    """Extract integer GBP price from a string like '£245,000'."""
    if not price_str:
        return None
    if any(kw in price_str.upper() for kw in ["POA", "SOLD", "AGREED", "OFFER", "CALL", "ENQUIRE"]):
        return None
    digits = re.sub(r"[^\d]", "", price_str)
    val = int(digits) if digits else None
    # Supercar sanity range: £30k–£10m
    if val and (val < 30_000 or val > 10_000_000):
        return None
    return val


def normalise_mileage(mileage_str: str) -> Optional[int]:
    """Extract integer mileage from a string like '12,345 miles'."""
    if not mileage_str:
        return None
    digits = re.sub(r"[^\d]", "", mileage_str)
    val = int(digits) if digits else None
    if val is not None and (val < 0 or val > 300_000):
        return None
    return val


# ── Model gating ─────────────────────────────────────────────────────────────

def _normalise_text(text: str) -> str:
    """Lowercase, strip accents, collapse whitespace."""
    text = text.lower()
    for src, dst in {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
                     "ü": "u", "ñ": "n", "ã": "a", "â": "a"}.items():
        text = text.replace(src, dst)
    return re.sub(r"\s+", " ", text).strip()


def gate_listing(
    title: str,
    model_key: str,
    url: str = "",
    year: Optional[int] = None,
    price: Optional[int] = None,
) -> tuple[bool, str]:
    """
    Three-layer strict model gate.  Returns (accepted: bool, reason: str).
    reason is empty string on success, rejection reason on failure.
    """
    spec = get_model(model_key)
    if not spec:
        # Unknown model — basic keyword fallback
        kw = model_key.replace("-", " ")
        if kw in _normalise_text(title):
            return True, ""
        return False, f"unknown model '{model_key}' — keyword '{kw}' not found"

    combined = _normalise_text(f"{title} {url}")

    # Layer 1a: All required terms must be present
    for term in spec.required_terms:
        if term.lower() not in combined:
            return False, f"required term '{term}' not found in '{combined[:80]}'"

    # Layer 1b: No forbidden terms may appear (word-boundary match to avoid substring false positives)
    for term in spec.forbidden_terms:
        # Build a word-boundary-aware pattern: 'rs' should not match inside 'porsche'
        pattern = r'(?<![a-z0-9])' + re.escape(term.lower()) + r'(?![a-z0-9])'
        if re.search(pattern, combined):
            return False, f"forbidden term '{term}' found in '{combined[:80]}'"

    # Layer 2: Year guard
    if year is not None:
        if not (spec.year_min <= year <= spec.year_max):
            return False, f"year {year} outside [{spec.year_min}–{spec.year_max}]"

    # Layer 3: Price guard
    if price is not None:
        if not (spec.price_min <= price <= spec.price_max):
            return False, f"price £{price:,} outside [£{spec.price_min:,}–£{spec.price_max:,}]"

    return True, ""


# ── Bespoke scrapers ──────────────────────────────────────────────────────────

def scrape_amari(model_key: str) -> list[dict]:
    """
    Scrape Amari Supercars for a specific model.
    Works for any model key — gating is applied via model_registry.
    """
    url = "https://www.amarisupercars.com/for-sale/"
    html = fetch_page(url)
    if not html:
        logger.warning("  Amari: failed to fetch stock page")
        return []

    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select("a.stock-item")
    logger.info(f"  Amari: {len(cards)} total stock items")

    results = []
    seen_urls: set[str] = set()
    for card in cards:
        try:
            listing_url = card.get("href", "")
            if not listing_url:
                continue
            if not listing_url.startswith("http"):
                listing_url = f"https://www.amarisupercars.com{listing_url}"
            if listing_url in seen_urls:
                continue
            seen_urls.add(listing_url)

            title_el = card.select_one("h3.alt-font, h2.alt-font, h3, h2")
            title = title_el.get_text(strip=True) if title_el else ""

            price_el = card.select_one("span.price, .price")
            price_str = price_el.get_text(strip=True) if price_el else ""
            price = normalise_price(price_str)

            feature_cells = card.select("div.car-p-features div[class*='col-']")
            cell_texts = [c.get_text(strip=True) for c in feature_cells if c.get_text(strip=True)]

            year = None
            mileage = None
            colour = None
            for i, text in enumerate(cell_texts):
                if re.search(r"\b(19|20)\d{2}\b", text) and "/" in text:
                    year = int(re.search(r"\b(19|20)\d{2}\b", text).group(0))
                elif "miles" in text.lower() or (re.match(r"^[\d,]+$", text) and len(text) > 2):
                    mileage = normalise_mileage(text)
                elif i == 1 and not colour:
                    colour = text

            ok, reason = gate_listing(title, model_key, listing_url, year, price)
            if not ok:
                logger.debug(f"  Amari SKIP: {title!r} — {reason}")
                continue

            results.append({
                "listing_id": make_listing_id("AMARI", model_key, listing_url),
                "model_key": model_key,
                "source": "specialist-dealer",
                "dealer": "Amari Supercars",
                "dealer_type": "independent-specialist",
                "source_url": listing_url,
                "asking_price": price,
                "year": year,
                "mileage": mileage,
                "colour": colour,
                "title": title,
                "status": "active",
            })
            logger.info(f"  Amari ACCEPT: {title!r} — {price_str}")
        except Exception as e:
            logger.debug(f"  Amari card parse error: {e}")

    logger.info(f"  Amari: {len(results)} accepted for {model_key}")
    return results


def scrape_joe_macari(model_key: str) -> list[dict]:
    """
    Scrape Joe Macari for a specific model.
    Works for any model key — gating is applied via model_registry.
    """
    url = "https://www.joemacari.com/cars-for-sale/"
    html = fetch_page(url)
    if not html:
        logger.warning("  Joe Macari: failed to fetch stock page")
        return []

    soup = BeautifulSoup(html, "html.parser")
    stock_links = soup.select("a[href*='/stock/']")
    logger.info(f"  Joe Macari: {len(stock_links)} static stock links")

    results = []
    seen_urls: set[str] = set()
    for link_el in stock_links:
        try:
            listing_url = link_el.get("href", "")
            if not listing_url.startswith("http"):
                listing_url = f"https://www.joemacari.com{listing_url}"
            if listing_url in seen_urls:
                continue
            seen_urls.add(listing_url)

            title = link_el.get_text(strip=True)
            if not title:
                slug = listing_url.rstrip("/").split("/")[-1]
                title = slug.replace("-", " ").title()

            year_match = re.search(r"/stock/(\d{4})/", listing_url) or \
                         re.search(r"\b(20\d{2}|19\d{2})\b", title)
            year = int(year_match.group(1)) if year_match else None

            ok, reason = gate_listing(title, model_key, listing_url, year, None)
            if not ok:
                logger.debug(f"  Joe Macari SKIP: {title!r} — {reason}")
                continue

            results.append({
                "listing_id": make_listing_id("JMAC", model_key, listing_url),
                "model_key": model_key,
                "source": "specialist-dealer",
                "dealer": "Joe Macari",
                "dealer_type": "independent-specialist",
                "source_url": listing_url,
                "asking_price": None,  # Enrichment will get price
                "year": year,
                "mileage": None,
                "colour": None,
                "title": title,
                "status": "active",
            })
            logger.info(f"  Joe Macari ACCEPT: {title!r} ({year})")
        except Exception as e:
            logger.debug(f"  Joe Macari link parse error: {e}")

    logger.info(f"  Joe Macari: {len(results)} accepted for {model_key}")
    return results


def scrape_romans(model_key: str) -> list[dict]:
    """
    Scrape Romans International for a specific model.
    Uses model_registry to determine the correct make slug for the URL.
    Works for Ferrari, Lamborghini, McLaren, Porsche, Aston Martin, etc.
    """
    spec = get_model(model_key)
    make_slug = spec.make_slug if spec else "ferrari"
    url = get_romans_stock_url(make_slug)

    html = fetch_page(url)
    if not html:
        logger.warning(f"  Romans: failed to fetch {url}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    vehicle_list = soup.select("div.vehicle") or soup.select(".listing__list-item")
    logger.info(f"  Romans [{make_slug}]: {len(vehicle_list)} vehicle cards")

    results = []
    for item in vehicle_list:
        try:
            link_el = item.select_one("a[href]")
            if not link_el:
                continue
            listing_url = link_el.get("href", "")
            if not listing_url.startswith("http"):
                listing_url = f"https://www.romansinternational.co.uk{listing_url}"

            # Build title from structured elements
            parts = [
                item.select_one(".vehicle__make"),
                item.select_one(".vehicle__model"),
                item.select_one(".vehicle__model-variant"),
            ]
            title = " ".join(el.get_text(strip=True) for el in parts if el)
            if not title:
                title_el = item.select_one(".vehicle__title, h2, h3")
                title = title_el.get_text(strip=True) if title_el else link_el.get_text(strip=True)

            price_el = item.select_one(".vehicle__price, [class*='price']")
            price_str = price_el.get_text(strip=True) if price_el else ""
            price = normalise_price(price_str)

            data_items = item.select(".vehicle__technical-data-item")
            data_texts = [d.get_text(strip=True) for d in data_items]

            year = None
            mileage = None
            colour = None
            for text in data_texts:
                if re.search(r"\b(19|20)\d{2}\b", text):
                    year = int(re.search(r"\b(19|20)\d{2}\b", text).group(0))
                elif "miles" in text.lower() or "km" in text.lower():
                    mileage = normalise_mileage(text)
                elif re.match(r"^[A-Za-z][A-Za-z\s]+$", text) and len(text) > 2 and not colour:
                    colour = text

            if not year:
                ym = re.search(r"\b(20\d{2}|19\d{2})\b", title)
                if ym:
                    year = int(ym.group(1))

            ok, reason = gate_listing(title, model_key, listing_url, year, price)
            if not ok:
                logger.debug(f"  Romans SKIP: {title!r} — {reason}")
                continue

            results.append({
                "listing_id": make_listing_id("RMNS", model_key, listing_url),
                "model_key": model_key,
                "source": "specialist-dealer",
                "dealer": "Romans International",
                "dealer_type": "independent-specialist",
                "source_url": listing_url,
                "asking_price": price,
                "year": year,
                "mileage": mileage,
                "colour": colour,
                "title": title,
                "status": "active",
            })
            logger.info(f"  Romans ACCEPT: {title!r} — {price_str}")
        except Exception as e:
            logger.debug(f"  Romans card parse error: {e}")

    logger.info(f"  Romans: {len(results)} accepted for {model_key}")
    return results


def scrape_tom_hartley(model_key: str) -> list[dict]:
    """
    Scrape Tom Hartley Jnr for a specific model.
    Works for any model key — gating is applied via model_registry.
    """
    url = "https://www.tomhartleyjnr.com/current-stock/"
    html = fetch_page(url)
    if not html:
        logger.warning("  Tom Hartley Jnr: failed to fetch stock page")
        return []

    soup = BeautifulSoup(html, "html.parser")
    listing_links = soup.select("a[href*='/car/stock/']")
    logger.info(f"  Tom Hartley Jnr: {len(listing_links)} total listing links")

    results = []
    seen_urls: set[str] = set()
    for link_el in listing_links:
        try:
            listing_url = link_el.get("href", "")
            if not listing_url.startswith("http"):
                listing_url = f"https://www.tomhartleyjnr.com{listing_url}"
            if listing_url in seen_urls:
                continue
            seen_urls.add(listing_url)

            title_el = link_el.select_one("h1, h2, h3")
            title = title_el.get_text(strip=True) if title_el else link_el.get_text(strip=True)
            title = re.sub(r"\s+", " ", title).strip()

            # Skip SOLD items
            if "SOLD" in link_el.get_text().upper():
                continue

            price_match = re.search(r"£[\d,]+", link_el.get_text())
            price = normalise_price(price_match.group(0)) if price_match else None

            year_match = re.search(r"/car/stock/(\d{4})/", listing_url) or \
                         re.search(r"\b(20\d{2}|19\d{2})\b", title)
            year = int(year_match.group(1)) if year_match else None

            ok, reason = gate_listing(title, model_key, listing_url, year, price)
            if not ok:
                logger.debug(f"  Tom Hartley SKIP: {title!r} — {reason}")
                continue

            results.append({
                "listing_id": make_listing_id("THJR", model_key, listing_url),
                "model_key": model_key,
                "source": "specialist-dealer",
                "dealer": "Tom Hartley Jnr",
                "dealer_type": "independent-specialist",
                "source_url": listing_url,
                "asking_price": price,
                "year": year,
                "mileage": None,
                "colour": None,
                "title": title,
                "status": "active",
            })
            logger.info(f"  Tom Hartley ACCEPT: {title!r} ({year})")
        except Exception as e:
            logger.debug(f"  Tom Hartley link parse error: {e}")

    logger.info(f"  Tom Hartley Jnr: {len(results)} accepted for {model_key}")
    return results


# ── Generic dealer scraper ────────────────────────────────────────────────────

def scrape_generic_dealer(
    dealer_name: str,
    stock_url: str,
    model_key: str,
    dealer_type: str = "independent-specialist",
) -> list[dict]:
    """
    Generic scraper for any dealer in the registry without a bespoke scraper.

    Strategy:
    1. Fetch the stock listing page.
    2. Collect all anchor tags that look like individual car listing pages.
    3. Pre-filter candidates using URL + anchor text against the strict model gate.
    4. Fetch each candidate page and re-gate on the full page title.
    5. Extract price, year, mileage from the page.

    This is intentionally conservative — it is better to miss a listing than to
    accept the wrong model.
    """
    html = fetch_page(stock_url)
    if not html:
        logger.warning(f"  {dealer_name}: failed to fetch {stock_url}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    base_url = "/".join(stock_url.split("/")[:3])

    # Patterns that suggest an individual car listing page
    car_page_patterns = [
        r"/stock/", r"/car/", r"/vehicle/", r"/used/", r"/for-sale/",
        r"/inventory/", r"/listing/", r"/details/", r"/cars/",
    ]
    all_links = soup.select("a[href]")
    candidate_links: list[tuple[str, str]] = []
    seen: set[str] = set()
    for a in all_links:
        href = a.get("href", "")
        if not href or href in ("#", "/") or href.startswith(("mailto:", "tel:", "javascript:")):
            continue
        if not href.startswith("http"):
            href = f"{base_url}{href}" if href.startswith("/") else f"{base_url}/{href}"
        if href in seen or href == stock_url:
            continue
        seen.add(href)
        if any(re.search(pat, href, re.IGNORECASE) for pat in car_page_patterns):
            candidate_links.append((href, a.get_text(strip=True)))

    logger.info(f"  {dealer_name}: {len(candidate_links)} candidate car-page links")

    results = []
    for listing_url, anchor_text in candidate_links:
        try:
            # Quick pre-filter — skip if neither URL nor anchor text could match
            url_ok, _ = gate_listing("", model_key, listing_url)
            title_ok, _ = gate_listing(anchor_text, model_key, "")
            if not url_ok and not title_ok:
                continue

            # Fetch the individual listing page
            time.sleep(REQUEST_DELAY)
            page_html = fetch_page(listing_url, retries=2, delay=1.0)
            if not page_html:
                continue

            page_soup = BeautifulSoup(page_html, "html.parser")

            # Extract title from page heading
            h1 = page_soup.select_one("h1")
            title = h1.get_text(strip=True) if h1 else anchor_text

            # Extract price
            price_str = ""
            for sel in ["[class*='price']", "[class*='Price']", ".price", "#price"]:
                el = page_soup.select_one(sel)
                if el:
                    price_str = el.get_text(strip=True)
                    break
            if not price_str:
                pm = re.search(r"£[\d,]{4,}", page_html)
                price_str = pm.group(0) if pm else ""
            price = normalise_price(price_str)

            # Extract year
            year = None
            ym = re.search(r"\b(20\d{2}|19\d{2})\b", title) or \
                 re.search(r"\b(20\d{2}|19\d{2})\b", page_html[:5000])
            if ym:
                year = int(ym.group(1))

            # Extract mileage
            mileage = None
            mm = re.search(r"([\d,]+)\s*(?:miles|mi\b)", page_html[:5000], re.IGNORECASE)
            if mm:
                mileage = normalise_mileage(mm.group(1))

            # Final gate with full title and URL
            ok, reason = gate_listing(title, model_key, listing_url, year, price)
            if not ok:
                logger.debug(f"  {dealer_name} SKIP: {title!r} — {reason}")
                continue

            prefix = re.sub(r"[^A-Z]", "", dealer_name.upper())[:4]
            results.append({
                "listing_id": make_listing_id(prefix, model_key, listing_url),
                "model_key": model_key,
                "source": "specialist-dealer",
                "dealer": dealer_name,
                "dealer_type": dealer_type,
                "source_url": listing_url,
                "asking_price": price,
                "year": year,
                "mileage": mileage,
                "colour": None,
                "title": title,
                "status": "active",
            })
            logger.info(f"  {dealer_name} ACCEPT: {title!r} — {price_str}")
        except Exception as e:
            logger.debug(f"  {dealer_name} page parse error for {listing_url}: {e}")

    logger.info(f"  {dealer_name}: {len(results)} accepted for {model_key}")
    return results


# ── Bespoke scraper dispatch ──────────────────────────────────────────────────

# Maps dealer registry keys to their bespoke scraper functions
BESPOKE_SCRAPERS: dict[str, callable] = {
    "amari supercars": scrape_amari,
    "amari supercars (gb)": scrape_amari,
    "joe macari": scrape_joe_macari,
    "joe macari performance cars": scrape_joe_macari,
    "romans international": scrape_romans,
    "tom hartley": scrape_tom_hartley,
    "tom hartley jnr": scrape_tom_hartley,
}


def scrape_all_specialist_dealers(model_key: str) -> list[dict]:
    """
    Run all registered specialist dealer scrapers for a given model key.

    Works for any model in MODEL_REGISTRY — Ferrari, Lamborghini, McLaren,
    Porsche, Aston Martin, etc.

    Order:
    1. Bespoke scrapers (Amari, Joe Macari, Romans, Tom Hartley)
    2. Generic scraper for all other registry dealers (non-Ferrari-Approved)

    Returns a deduplicated list of raw listing dicts ready for DB upsert.
    """
    if model_key not in MODEL_REGISTRY:
        logger.error(f"Unknown model key: {model_key}. Add it to model_registry.py first.")
        return []

    all_results: list[dict] = []
    seen_urls: set[str] = set()
    bespoke_run: set[str] = set()

    logger.info(f"\n{'='*50}")
    logger.info(f"Specialist dealer scrape: {MODEL_REGISTRY[model_key].label}")
    logger.info(f"{'='*50}")

    # Tier 1: Bespoke scrapers (run each unique scraper function once)
    for dealer_key, scraper_fn in BESPOKE_SCRAPERS.items():
        fn_id = id(scraper_fn)
        if fn_id in bespoke_run:
            continue
        bespoke_run.add(fn_id)
        try:
            results = scraper_fn(model_key)
            added = 0
            for r in results:
                url = r.get("source_url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_results.append(r)
                    added += 1
            if added:
                logger.info(f"  {dealer_key.title()}: +{added} listings")
        except Exception as e:
            logger.error(f"  {dealer_key.title()} bespoke scraper failed: {e}")

    # Tier 2: Generic scraper for all other registry dealers
    for reg_key, entry in DEALER_REGISTRY.items():
        # Skip if handled by bespoke scraper
        if reg_key in BESPOKE_SCRAPERS:
            continue
        # Skip Ferrari/Lamborghini Approved — handled by FA scraper in discovery_scraper.py
        if entry["dealer_type"] == "ferrari-approved":
            continue
        stock_url = entry.get("stock_url", "")
        if not stock_url or "{make_slug}" in stock_url:
            continue  # Templated URL — skip (handled by bespoke scraper)

        try:
            results = scrape_generic_dealer(
                dealer_name=entry["name"],
                stock_url=stock_url,
                model_key=model_key,
                dealer_type=entry["dealer_type"],
            )
            added = 0
            for r in results:
                url = r.get("source_url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_results.append(r)
                    added += 1
            if added:
                logger.info(f"  {entry['name']} (generic): +{added} listings")
        except Exception as e:
            logger.error(f"  {entry['name']} generic scraper failed: {e}")

    logger.info(f"\nTotal specialist dealer listings for {model_key}: {len(all_results)}")
    return all_results


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    import json

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Specialist Dealer Scraper")
    parser.add_argument("--model", default="812-superfast",
                        help=f"Model key. Available: {', '.join(MODEL_REGISTRY.keys())}")
    parser.add_argument("--debug", action="store_true", help="Enable DEBUG logging")
    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.model not in MODEL_REGISTRY:
        print(f"Unknown model: {args.model}")
        print(f"Available: {', '.join(MODEL_REGISTRY.keys())}")
        exit(1)

    print(f"\nTesting specialist dealer scraper for: {MODEL_REGISTRY[args.model].label}")
    results = scrape_all_specialist_dealers(args.model)
    print(f"\n=== RESULTS ({len(results)} listings) ===")
    for r in results:
        price_str = f"£{r['asking_price']:,}" if r.get("asking_price") else "POA"
        print(f"  [{r['dealer']}] {r['title']} — {price_str} ({r.get('year')}, {r.get('mileage')}mi)")
    if results:
        print("\nFirst result detail:")
        print(json.dumps(results[0], indent=2, default=str))

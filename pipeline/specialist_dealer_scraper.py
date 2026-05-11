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

# Playwright is used as fallback when HTTP is blocked (403, SSL errors, JS-rendered pages)
try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

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

REQUEST_DELAY = 1.5  # seconds between requests (reduced from 3.0 to keep discovery within 30-min budget)


def _fetch_with_playwright(url: str, timeout_ms: int = 30_000, extra_wait_ms: int = 0) -> Optional[str]:
    """Fetch a page using a headless Chromium browser. Bypasses bot detection and handles JS rendering.
    extra_wait_ms: additional milliseconds to wait after page load (for JS-heavy DMS sites like Dragon2000).
    """
    if not PLAYWRIGHT_AVAILABLE:
        logger.warning("Playwright not available — cannot use browser fetch")
        return None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=[
                "--no-sandbox", "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
            ])
            ctx = browser.new_context(
                user_agent=HEADERS["User-Agent"],
                locale="en-GB",
                viewport={"width": 1280, "height": 800},
            )
            page = ctx.new_page()
            page.set_extra_http_headers({k: v for k, v in HEADERS.items() if k != "User-Agent"})
            page.goto(url, timeout=timeout_ms, wait_until="domcontentloaded")
            # Wait briefly for any lazy-loaded content
            try:
                page.wait_for_load_state("networkidle", timeout=5_000)
            except Exception:
                pass
            # Extra wait for JS-heavy DMS sites (Dragon2000 etc.)
            if extra_wait_ms > 0:
                page.wait_for_timeout(extra_wait_ms)
            html = page.content()
            browser.close()
            return html
    except Exception as e:
        logger.warning(f"Playwright fetch failed for {url}: {type(e).__name__}: {str(e)[:120]}")
        return None


def fetch_page(
    url: str,
    retries: int = 2,
    delay: float = REQUEST_DELAY,
    force_playwright: bool = False,
    playwright_wait_ms: int = 0,
) -> Optional[str]:
    """
    Fetch a page with smart fallback:
    1. If force_playwright=True, go straight to headless browser.
    2. Otherwise try HTTP first (fast). On 403 / SSL error / connection error,
       automatically fall back to Playwright headless browser.
    Max 2 HTTP attempts, then 1 Playwright attempt.
    playwright_wait_ms: extra wait after page load (for Dragon2000/JS-heavy DMS sites).
    """
    if force_playwright:
        logger.debug(f"Playwright-forced fetch: {url}")
        return _fetch_with_playwright(url, extra_wait_ms=playwright_wait_ms)

    last_status = None
    use_playwright_fallback = False

    for attempt in range(retries):
        try:
            time.sleep(delay if attempt == 0 else delay + 4)
            resp = requests.get(url, headers=HEADERS, timeout=20, allow_redirects=True, verify=True)
            if resp.status_code == 200:
                return resp.text
            elif resp.status_code == 403:
                logger.debug(f"HTTP 403 for {url} — will try Playwright")
                use_playwright_fallback = True
                break
            elif resp.status_code == 429:
                logger.warning(f"Rate limited on {url}, waiting 30s...")
                time.sleep(30)
            else:
                last_status = resp.status_code
                logger.warning(f"HTTP {resp.status_code} for {url}")
        except requests.exceptions.SSLError:
            logger.debug(f"SSL error for {url} — will try Playwright")
            use_playwright_fallback = True
            break
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            logger.debug(f"Connection error for {url}: {type(e).__name__} — will try Playwright")
            use_playwright_fallback = True
            break
        except Exception as e:
            logger.warning(f"Fetch error for {url}: {e}")

    if use_playwright_fallback or (last_status and last_status not in (404, 410)):
        if PLAYWRIGHT_AVAILABLE:
            logger.info(f"  Falling back to Playwright for {url}")
            return _fetch_with_playwright(url)

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
    Their site is JS-rendered so we use Playwright.
    Works for any model key — gating is applied via model_registry.
    """
    url = "https://www.joemacari.com/cars-for-sale/"
    # Joe Macari's site is JS-rendered — use Playwright directly
    html = fetch_page(url, force_playwright=True)
    if not html:
        logger.warning("  Joe Macari: failed to fetch stock page")
        return []

    soup = BeautifulSoup(html, "html.parser")
    # Their listing cards link to /stock/<slug>/<id>/
    stock_links = soup.select("a[href*='/stock/']")
    # Filter out nav-level links (need at least 4 path segments: /stock/slug/id)
    stock_links = [a for a in stock_links
                   if len(a.get("href", "").rstrip("/").split("/")) >= 4]
    logger.info(f"  Joe Macari: {len(stock_links)} car page links found")

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

            # Extract title from heading inside the card, or derive from URL slug
            # Joe Macari URLs: /stock/<make-model-slug>/<id>/
            title_el = link_el.select_one("h1, h2, h3, h4, [class*='title'], [class*='name']")
            title = title_el.get_text(strip=True) if title_el else link_el.get_text(strip=True)
            title = re.sub(r"\s+", " ", title).strip()
            if not title or len(title) < 5:
                # Derive from URL slug: /stock/ferrari-812-superfast/12345 -> 'Ferrari 812 Superfast'
                parts = listing_url.rstrip("/").split("/")
                # slug is the second-to-last segment (before the numeric ID)
                slug_part = parts[-2] if parts[-1].isdigit() else parts[-1]
                title = slug_part.replace("-", " ").title()

            # Extract price from card
            price_el = link_el.select_one("[class*='price'], [class*='Price']")
            price_str = price_el.get_text(strip=True) if price_el else ""
            if not price_str:
                pm = re.search(r"£[\d,]+", link_el.get_text())
                price_str = pm.group(0) if pm else ""
            price = normalise_price(price_str)

            year_match = re.search(r"/stock/(\d{4})/", listing_url) or \
                         re.search(r"\b(20\d{2}|19\d{2})\b", title)
            year = int(year_match.group(1)) if year_match else None

            ok, reason = gate_listing(title, model_key, listing_url, year, price)
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
                "asking_price": price,
                "year": year,
                "mileage": None,
                "colour": None,
                "title": title,
                "status": "active",
            })
            logger.info(f"  Joe Macari ACCEPT: {title!r} ({year}) — {price_str}")
        except Exception as e:
            logger.debug(f"  Joe Macari link parse error: {e}")

    logger.info(f"  Joe Macari: {len(results)} accepted for {model_key}")
    return results


def scrape_romans(model_key: str) -> list[dict]:
    """
    Scrape Romans International for a specific model.
    New URL structure: /used/cars/<make>/ with links to /used/cars/<make>/<model>/<id>
    Works for Ferrari, Lamborghini, McLaren, Porsche, Aston Martin, etc.
    """
    spec = get_model(model_key)
    make_slug = spec.make_slug if spec else "ferrari"
    # New URL structure (2025+)
    url = f"https://www.romansinternational.com/used/cars/{make_slug}/"

    html = fetch_page(url, force_playwright=True)
    if not html:
        logger.warning(f"  Romans: failed to fetch {url}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    # New structure: links to /used/cars/<make>/<model-slug>/--<id>
    all_links = soup.select(f'a[href*="/used/cars/{make_slug}/"]')
    # Filter to detail pages (5+ path segments: /used/cars/ferrari/model/--id)
    detail_links = [a for a in all_links
                    if len(a.get("href", "").rstrip("/").split("/")) >= 5
                    and "--" in a.get("href", "")]
    # Deduplicate by href
    seen_hrefs: set[str] = set()
    unique_links = []
    for a in detail_links:
        h = a.get("href", "")
        if h not in seen_hrefs:
            seen_hrefs.add(h)
            unique_links.append(a)
    logger.info(f"  Romans [{make_slug}]: {len(unique_links)} unique vehicle links")

    results = []
    for link_el in unique_links:
        try:
            listing_url = link_el.get("href", "")
            if not listing_url.startswith("http"):
                listing_url = f"https://www.romansinternational.com{listing_url}"

            # Extract title from link text (e.g. 'FerrariF12 TDF' or 'Ferrari812 Superfast')
            raw_text = link_el.get_text(strip=True)
            # Clean up concatenated make+model:
            # 'FerrariF12 TDF' -> 'Ferrari F12 TDF' (letter-uppercase boundary)
            # 'Ferrari812 Superfast' -> 'Ferrari 812 Superfast' (letter-digit boundary)
            title = re.sub(r"([a-z])([A-Z0-9])", r"\1 \2", raw_text).strip()
            if not title or title.lower() in ("view vehicle", ""):
                # Derive from URL slug: /used/cars/ferrari/812-superfast/--4665
                parts = listing_url.rstrip("/").split("/")
                # model slug is at index -2 (before --id)
                model_part = parts[-2] if parts[-1].startswith("--") else parts[-1]
                make_part = make_slug.title()
                title = f"{make_part} {model_part.replace('-', ' ').title()}"

            # Extract price — look in parent container
            parent = link_el.parent
            price_str = ""
            if parent:
                price_el = parent.select_one("[class*='price'], [class*='Price']")
                if not price_el:
                    pm = re.search(r"£[\d,]+", parent.get_text())
                    price_str = pm.group(0) if pm else ""
                else:
                    price_str = price_el.get_text(strip=True)
            price = normalise_price(price_str)

            # Extract year from title or URL
            ym = re.search(r"\b(20\d{2}|19\d{2})\b", title + listing_url)
            year = int(ym.group(1)) if ym else None

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
                "mileage": None,  # Enrichment will fetch from detail page
                "colour": None,
                "title": title,
                "status": "active",
            })
            logger.info(f"  Romans ACCEPT: {title!r} — {price_str or 'POA'}")
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
    force_playwright: bool = False,
    playwright_wait_ms: int = 0,
) -> list[dict]:
    """
    Generic scraper for any dealer in the registry without a bespoke scraper.

    Strategy:
    1. Fetch the stock listing page (HTTP first, Playwright fallback).
    2. Collect all anchor tags that look like individual car listing pages.
    3. Pre-filter candidates using URL + anchor text against the strict model gate.
    4. Fetch each candidate page and re-gate on the full page title.
    5. Extract price, year, mileage from the page.

    This is intentionally conservative — it is better to miss a listing than to
    accept the wrong model.
    """
    html = fetch_page(stock_url, force_playwright=force_playwright, playwright_wait_ms=playwright_wait_ms)
    if not html:
        logger.warning(f"  {dealer_name}: failed to fetch {stock_url}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    base_url = "/".join(stock_url.split("/")[:3])

    # Patterns that suggest an individual car listing page
    # Covers: Redline (/car/<slug>/), Dragon2000 (/used-car/<slug>/), WordPress (/stock/<slug>/),
    #         Romans (/used/cars/<make>/<model>/), generic (/vehicle/, /listing/, /details/)
    #         Kaaimans (/current-stock/<slug>/), European Prestige (/stock/for-sale/details/<slug>/<id>)
    car_page_patterns = [
        r"/stock/[^/]+", r"/car/[^/]+", r"/vehicle/[^/]+", r"/used-car/[^/]+",
        r"/used/cars/[^/]+/[^/]+", r"/for-sale/[^/]+", r"/inventory/[^/]+",
        r"/listing/[^/]+", r"/details/[^/]+", r"/cars/[^/]+",
        r"/vehicle-details/[^/]+",  # DMB Collection (Dragon2000 DMS)
        r"/current-stock/[^/]+",    # Kaaimans International
        r"/stock/for-sale/details/[^/]+",  # European Prestige UK
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

            # Extract title from page heading; fall back to slug-derived title
            h1 = page_soup.select_one("h1")
            title = h1.get_text(strip=True) if h1 else ""
            if not title:
                # Derive title from URL slug (e.g. /car/ferrari-812-superfast-20240101/ → Ferrari 812 Superfast)
                slug_match = re.search(r"/([a-z0-9-]+)/?$", listing_url)
                if slug_match:
                    slug = slug_match.group(1)
                    # Remove trailing ID-like numeric suffix
                    slug = re.sub(r"-\d{8,}$", "", slug)
                    title = slug.replace("-", " ").title()
            if not title:
                title = anchor_text

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
    seen_base_urls: set[str] = set()  # Prevent scraping the same site twice via registry aliases
    bespoke_run: set[str] = set()

    logger.info(f"\n{'='*50}")
    logger.info(f"Specialist dealer scrape: {MODEL_REGISTRY[model_key].label}")
    logger.info(f"{'='*50}")

    DEALER_TIMEOUT_SECS = 90  # Hard timeout per dealer — prevents any single site from hanging the run

    def _run_with_timeout(fn, *args, label="dealer", timeout=DEALER_TIMEOUT_SECS):
        """Run fn(*args) in a thread with a hard timeout. Returns [] on timeout or error."""
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(fn, *args)
            try:
                return future.result(timeout=timeout)
            except concurrent.futures.TimeoutError:
                logger.warning(f"  {label}: TIMEOUT after {timeout}s — skipping")
                return []
            except Exception as e:
                logger.error(f"  {label}: ERROR — {e}")
                return []

    # Tier 1: Bespoke scrapers (run each unique scraper function once)
    for dealer_key, scraper_fn in BESPOKE_SCRAPERS.items():
        fn_id = id(scraper_fn)
        if fn_id in bespoke_run:
            continue
        bespoke_run.add(fn_id)
        results = _run_with_timeout(scraper_fn, model_key, label=dealer_key.title())
        added = 0
        for r in results:
            url = r.get("source_url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_results.append(r)
                added += 1
        if added:
            logger.info(f"  {dealer_key.title()}: +{added} listings")

    # Tier 2: Generic scraper for all other registry dealers
    for reg_key, entry in DEALER_REGISTRY.items():
        # Skip if handled by bespoke scraper
        if reg_key in BESPOKE_SCRAPERS:
            continue
        # Skip Ferrari/Lamborghini Approved — handled by FA scraper in discovery_scraper.py
        if entry["dealer_type"] == "ferrari-approved":
            continue
        # Skip unsupported scrapers
        if entry.get("scraper") == "unsupported":
            continue
        stock_url = entry.get("stock_url", "")
        if not stock_url:
            continue

        # Skip dealers whose 'makes' list explicitly excludes this model's make
        # (e.g. Ryland stocks Lamborghini/McLaren/Porsche but NO Ferrari)
        dealer_makes = entry.get("makes")
        if dealer_makes:
            model_make = MODEL_REGISTRY[model_key].make.lower()
            if not any(m.lower() in model_make or model_make in m.lower() for m in dealer_makes):
                logger.debug(f"  Skipping {entry['name']} — make {model_make!r} not in dealer makes {dealer_makes}")
                continue

        # Skip aliases pointing to the same base_url as an already-scraped dealer
        # (e.g. "kaaimans" and "kaaimans international" both point to kaaimans.com)
        dealer_base_url = entry.get("base_url", "").rstrip("/")
        if dealer_base_url and dealer_base_url in seen_base_urls:
            logger.debug(f"  Skipping alias {reg_key!r} — {dealer_base_url} already scraped")
            continue
        if dealer_base_url:
            seen_base_urls.add(dealer_base_url)

        # Resolve make-aware URLs (e.g. Redline: /ferrari-cars-for-sale/)
        if entry.get("make_aware") and "{make_slug}" in stock_url:
            make_slug = MODEL_REGISTRY[model_key].make.lower()
            stock_url = stock_url.replace("{make_slug}", make_slug)

        def _generic(stock_url=stock_url, entry=entry):
            return scrape_generic_dealer(
                dealer_name=entry["name"],
                stock_url=stock_url,
                model_key=model_key,
                dealer_type=entry["dealer_type"],
                force_playwright=entry.get("playwright_required", False),
                playwright_wait_ms=entry.get("playwright_wait_ms", 0),
            )

        results = _run_with_timeout(_generic, label=entry["name"])
        added = 0
        for r in results:
            url = r.get("source_url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_results.append(r)
                added += 1
        if added:
            logger.info(f"  {entry['name']} (generic): +{added} listings")

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

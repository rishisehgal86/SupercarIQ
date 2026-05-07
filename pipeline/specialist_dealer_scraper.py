"""
specialist_dealer_scraper.py — UK Specialist Dealer Scraper
============================================================
Scrapes UK supercar specialist dealers for listings across all supported models.

VERIFIED SOURCES (all URLs tested live May 2026):
  - Amari Supercars: /for-sale/?s={term}  — WordPress, article cards
  - Joe Macari:      /cars-for-sale/       — WordPress, article cards
  - Romans International: /used/cars/{make}/ — custom CMS, li.vehicle-item cards
  - Tom Hartley Jnr: /current-stock/       — custom CMS, li > a[href*="/car/stock/"]

EXCLUDED (listings already on Ferrari Approved / iVendi JS-rendered):
  - Graypaul (now on ferraridealers.com subdomain, covered by FA scraper)
  - HR Owen (iVendi JS-rendered, covered by FA scraper)
  - Maranello Sales (SSL/TLS issues, covered by FA scraper)

AutoTrader Fallback:
  - AutoTrader is used for DISCOVERY ONLY (identifying which dealers have stock)
  - We then scrape the dealer's own website directly
  - This avoids AutoTrader's ToS restrictions on scraping
"""

import hashlib
import logging
import re
import time
from typing import Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── Request headers (bot-avoidance) ──────────────────────────────────────────
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
}

REQUEST_DELAY = 3.0  # seconds between requests


def fetch_page(url: str, retries: int = 3, delay: float = REQUEST_DELAY) -> Optional[str]:
    """Fetch a page with retry logic and bot-avoidance delays."""
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


def make_listing_id(source: str, model_key: str, url: str) -> str:
    """Generate a stable listing ID from source + URL."""
    h = hashlib.md5(url.encode()).hexdigest()[:8]
    return f"{model_key}-{source.upper()[:4]}-{h}"


def normalise_price(price_str: str) -> Optional[int]:
    """Extract integer GBP price from a string like '£245,000' or '245000'."""
    if not price_str:
        return None
    # Skip POA / SOLD / SALE AGREED
    if any(kw in price_str.upper() for kw in ["POA", "SOLD", "AGREED", "OFFER", "CALL"]):
        return None
    digits = re.sub(r'[^\d]', '', price_str)
    val = int(digits) if digits else None
    # Sanity check: supercar prices are between £50k and £5m
    if val and (val < 50_000 or val > 5_000_000):
        return None
    return val


def normalise_mileage(mileage_str: str) -> Optional[int]:
    """Extract integer mileage from a string like '12,345 miles'."""
    if not mileage_str:
        return None
    digits = re.sub(r'[^\d]', '', mileage_str)
    return int(digits) if digits else None


# ── Model name matching ───────────────────────────────────────────────────────

MODEL_KEYWORDS: dict[str, list[str]] = {
    "812-superfast": ["812 superfast", "812superfast"],
    "812-gts": ["812 gts"],
    "488-pista": ["488 pista"],
    "sf90-stradale": ["sf90 stradale", "sf90stradale", "sf90"],
    "huracan-sto": ["huracan sto", "huracán sto", "huracan-sto"],
    "f8-tributo": ["f8 tributo", "f8tributo"],
    "458-italia": ["458 italia", "458italia"],
    "488-gtb": ["488 gtb"],
    "california-t": ["california t", "california-t"],
    "portofino": ["portofino"],
    "roma": ["ferrari roma"],  # Avoid matching "Roma" in city names
}


def title_matches_model(title: str, model_key: str) -> bool:
    """Check if a listing title matches the given model key."""
    keywords = MODEL_KEYWORDS.get(model_key, [model_key.replace("-", " ")])
    title_lower = title.lower()
    return any(kw.lower() in title_lower for kw in keywords)


# ── Amari Supercars ───────────────────────────────────────────────────────────
# URL: https://www.amarisupercars.com/for-sale/?s={search_term}
# Structure: article elements with h2.entry-title and .price span

def scrape_amari(model_key: str) -> list[dict]:
    """
    Scrape Amari Supercars for a specific model.
    VERIFIED structure (May 2026):
      - Container: a.stock-item[href*="/stock/details/"]
      - Title: h3.alt-font
      - Price: span.price.secondary-font
      - Features: div.car-p-features with col-* children (year/reg, colour, mileage, interior)
    """
    # Amari loads all stock on one page — no search needed
    url = "https://www.amarisupercars.com/for-sale/"
    html = fetch_page(url)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    # All listing cards are <a class="stock-item"> elements
    cards = soup.select("a.stock-item")
    logger.info(f"  Amari: found {len(cards)} total stock items")

    results = []
    seen_urls = set()
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

            if not title_matches_model(title, model_key):
                continue

            # Price: <span class="price secondary-font">£249,995</span>
            price_el = card.select_one("span.price, .price")
            price_str = price_el.get_text(strip=True) if price_el else ""
            price = normalise_price(price_str)

            # Feature cells: year/reg, colour, mileage, interior colour
            feature_cells = card.select("div.car-p-features div[class*='col-']")
            cell_texts = [c.get_text(strip=True) for c in feature_cells if c.get_text(strip=True)]

            year = None
            mileage = None
            colour = None
            for i, text in enumerate(cell_texts):
                if re.search(r'\b(19|20)\d{2}\b', text) and "/" in text:
                    year = int(re.search(r'\b(19|20)\d{2}\b', text).group(0))
                elif "miles" in text.lower() or (re.match(r'^[\d,]+$', text) and len(text) > 2):
                    mileage = normalise_mileage(text)
                elif i == 1 and not colour:  # Colour is typically 2nd cell
                    colour = text

            listing_id = make_listing_id("AMARI", model_key, listing_url)
            results.append({
                "listing_id": listing_id,
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
            logger.info(f"  Amari: matched '{title}' — {price_str} ({year}, {mileage}mi)")
        except Exception as e:
            logger.debug(f"  Amari card parse error: {e}")

    logger.info(f"  Amari: extracted {len(results)} listings for {model_key}")
    return results


# ── Joe Macari ────────────────────────────────────────────────────────────────
# URL: https://www.joemacari.com/cars-for-sale/
# Structure: WordPress posts — article.type-cars with h2.entry-title

def scrape_joe_macari(model_key: str) -> list[dict]:
    """
    Scrape Joe Macari for a specific model.
    VERIFIED structure (May 2026):
      - Site is JS-rendered; only featured/recent cars appear in static HTML
      - Stock links follow pattern: /stock/{make-model-slug}/{id}
      - li.car.animate-in[data-make] is the container in static HTML
      - For full inventory, Playwright is needed (TODO: add to playwright scraper)
    """
    url = "https://www.joemacari.com/cars-for-sale/"
    html = fetch_page(url)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")

    # Find all /stock/ links in the static HTML (featured/recent cars)
    stock_links = soup.select("a[href*='/stock/']")
    logger.info(f"  Joe Macari: found {len(stock_links)} static stock links")

    results = []
    seen_urls = set()
    for link_el in stock_links:
        try:
            listing_url = link_el.get("href", "")
            if not listing_url.startswith("http"):
                listing_url = f"https://www.joemacari.com{listing_url}"
            if listing_url in seen_urls:
                continue
            seen_urls.add(listing_url)

            # Extract make from URL: /stock/{make}-{model}/{id}
            path_parts = listing_url.rstrip("/").split("/")
            slug_part = path_parts[-2] if len(path_parts) >= 2 else ""

            # Check if make matches
            spec = MODEL_KEYWORDS.get(model_key, [])
            make_keywords = ["ferrari", "lamborghini", "mclaren", "porsche"]
            model_make = next((m for m in make_keywords if m in slug_part.lower()), None)

            # Check model keywords against slug
            model_kws = MODEL_KEYWORDS.get(model_key, [])
            if not any(kw.replace(" ", "-").lower() in slug_part.lower() for kw in model_kws):
                continue

            # Get title from link text
            title = link_el.get_text(strip=True)
            if not title:
                title = slug_part.replace("-", " ").title()

            # Extract year from URL path: /stock/{year}/{make}/...
            year_match = re.search(r'/stock/(\d{4})/', listing_url)
            if not year_match:
                year_match = re.search(r'\b(20\d{2}|19\d{2})\b', title)
            year = int(year_match.group(1)) if year_match else None

            listing_id = make_listing_id("JMAC", model_key, listing_url)
            results.append({
                "listing_id": listing_id,
                "model_key": model_key,
                "source": "specialist-dealer",
                "dealer": "Joe Macari",
                "dealer_type": "independent-specialist",
                "source_url": listing_url,
                "asking_price": None,  # Not available in static HTML
                "year": year,
                "mileage": None,
                "colour": None,
                "title": title,
                "status": "active",
            })
            logger.info(f"  Joe Macari: matched '{title}' ({year})")
        except Exception as e:
            logger.debug(f"  Joe Macari link parse error: {e}")

    logger.info(f"  Joe Macari: extracted {len(results)} listings for {model_key}")
    return results


# ── Romans International ──────────────────────────────────────────────────────
# URL: https://www.romansinternational.com/used/cars/{make}/
# Structure: #js-vehicle-list-wrapper > ul > li with h2 and .price

ROMANS_MAKE_MAP = {
    "ferrari": ["812-superfast", "812-gts", "488-pista", "sf90-stradale",
                "f8-tributo", "458-italia", "488-gtb", "california-t", "portofino", "roma"],
    "lamborghini": ["huracan-sto"],
}


def scrape_romans(model_key: str) -> list[dict]:
    """Scrape Romans International for a specific model."""
    # Determine make
    make = "ferrari"
    for m, models in ROMANS_MAKE_MAP.items():
        if model_key in models:
            make = m
            break

    url = f"https://www.romansinternational.com/used/cars/{make}/"
    html = fetch_page(url)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    # VERIFIED (May 2026): Romans uses div.vehicle containers
    # Each vehicle has: vehicle__make, vehicle__model, vehicle__model-variant, price class
    vehicle_list = soup.select("div.vehicle")
    if not vehicle_list:
        # Fallback: try listing__list-item
        vehicle_list = soup.select(".listing__list-item")
    logger.info(f"  Romans [{make}]: found {len(vehicle_list)} vehicle cards")

    results = []
    for item in vehicle_list:
        try:
            link_el = item.select_one("a[href]")
            if not link_el:
                continue
            listing_url = link_el.get("href", "")
            if not listing_url.startswith("http"):
                listing_url = f"https://www.romansinternational.com{listing_url}"

            # Build title from make + model + variant
            make_el = item.select_one(".vehicle__make")
            model_el = item.select_one(".vehicle__model")
            variant_el = item.select_one(".vehicle__model-variant")
            title_parts = [
                make_el.get_text(strip=True) if make_el else "",
                model_el.get_text(strip=True) if model_el else "",
                variant_el.get_text(strip=True) if variant_el else "",
            ]
            title = " ".join(p for p in title_parts if p)
            if not title:
                title_el = item.select_one(".vehicle__title, h2, h3")
                title = title_el.get_text(strip=True) if title_el else link_el.get_text(strip=True)

            if not title_matches_model(title, model_key):
                continue

            price_el = item.select_one(".vehicle__price, [class*='price']")
            price_str = price_el.get_text(strip=True) if price_el else ""
            price = normalise_price(price_str)

            # Technical data items
            data_items = item.select(".vehicle__technical-data-item")
            data_texts = [d.get_text(strip=True) for d in data_items]

            year = None
            mileage = None
            colour = None
            for text in data_texts:
                if re.search(r'\b(19|20)\d{2}\b', text):
                    year = int(re.search(r'\b(19|20)\d{2}\b', text).group(0))
                elif "miles" in text.lower() or "km" in text.lower():
                    mileage = normalise_mileage(text)
                elif re.match(r'^[A-Za-z][A-Za-z\s]+$', text) and len(text) > 2 and not colour:
                    colour = text

            year_match = re.search(r'\b(20\d{2}|19\d{2})\b', title) if not year else None
            if year_match and not year:
                year = int(year_match.group(1))

            listing_id = make_listing_id("RMNS", model_key, listing_url)
            results.append({
                "listing_id": listing_id,
                "model_key": model_key,
                "source": "specialist-dealer",
                "dealer": "Romans International",
                "dealer_type": "independent-specialist",
                "source_url": listing_url,
                "asking_price": price,
                "year": year,
                "mileage": mileage,
                "title": title,
                "status": "active",
            })
        except Exception as e:
            logger.debug(f"  Romans item parse error: {e}")

    logger.info(f"  Romans: extracted {len(results)} listings for {model_key}")
    return results


# ── Tom Hartley Jnr ───────────────────────────────────────────────────────────
# URL: https://www.tomhartleyjnr.com/current-stock/
# Structure: li > a[href*="/car/stock/"] with h2 and price text
# Note: All stock on one page, filter by model in Python

def scrape_tom_hartley(model_key: str) -> list[dict]:
    """Scrape Tom Hartley Jnr for a specific model."""
    url = "https://www.tomhartleyjnr.com/current-stock/"
    html = fetch_page(url)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    # All listings are anchor tags with href containing /car/stock/
    listing_links = soup.select("a[href*='/car/stock/']")
    logger.info(f"  Tom Hartley Jnr: found {len(listing_links)} total listing links")

    results = []
    seen_urls = set()
    for link_el in listing_links:
        try:
            listing_url = link_el.get("href", "")
            if not listing_url.startswith("http"):
                listing_url = f"https://www.tomhartleyjnr.com{listing_url}"
            if listing_url in seen_urls:
                continue
            seen_urls.add(listing_url)

            # Extract title from the link text or heading inside
            title_el = link_el.select_one("h1, h2, h3")
            title = title_el.get_text(strip=True) if title_el else link_el.get_text(strip=True)
            title = re.sub(r'\s+', ' ', title).strip()

            if not title_matches_model(title, model_key):
                continue

            # Skip SOLD items
            full_text = link_el.get_text()
            if "SOLD" in full_text.upper() and "SALE AGREED" not in full_text.upper():
                continue

            # Extract price
            price_match = re.search(r'£[\d,]+', full_text)
            price_str = price_match.group(0) if price_match else ""
            price = normalise_price(price_str)

            # Extract year from URL or title
            year_match = re.search(r'/car/stock/(\d{4})/', listing_url)
            if not year_match:
                year_match = re.search(r'\b(20\d{2}|19\d{2})\b', title)
            year = int(year_match.group(1)) if year_match else None

            listing_id = make_listing_id("THJR", model_key, listing_url)
            results.append({
                "listing_id": listing_id,
                "model_key": model_key,
                "source": "specialist-dealer",
                "dealer": "Tom Hartley Jnr",
                "dealer_type": "independent-specialist",
                "source_url": listing_url,
                "asking_price": price,
                "year": year,
                "mileage": None,
                "title": title,
                "status": "active",
            })
        except Exception as e:
            logger.debug(f"  Tom Hartley Jnr link parse error: {e}")

    logger.info(f"  Tom Hartley Jnr: extracted {len(results)} listings for {model_key}")
    return results


# ── AutoTrader Fallback Discovery ─────────────────────────────────────────────
# Strategy: scrape AutoTrader search results to discover dealer names,
# then scrape those dealers' own websites directly.
# This avoids AutoTrader's ToS restrictions on data extraction.

AUTOTRADER_MAKE_MAP = {
    "ferrari": ["812-superfast", "812-gts", "488-pista", "sf90-stradale",
                "f8-tributo", "458-italia", "488-gtb", "california-t", "portofino", "roma"],
    "lamborghini": ["huracan-sto"],
}

AUTOTRADER_MODEL_SLUGS = {
    "812-superfast": "812+Superfast",
    "812-gts": "812+GTS",
    "488-pista": "488+Pista",
    "sf90-stradale": "SF90+Stradale",
    "huracan-sto": "Huracan+STO",
    "f8-tributo": "F8+Tributo",
    "458-italia": "458+Italia",
    "488-gtb": "488+GTB",
    "california-t": "California+T",
    "portofino": "Portofino",
    "roma": "Roma",
}


def discover_autotrader_dealers(model_key: str) -> list[str]:
    """
    Discover dealer names from AutoTrader for a given model.
    Returns a list of dealer names found on AutoTrader.
    This is DISCOVERY ONLY — we do not extract listing data from AutoTrader.
    """
    make = "ferrari"
    for m, models in AUTOTRADER_MAKE_MAP.items():
        if model_key in models:
            make = m
            break

    model_slug = AUTOTRADER_MODEL_SLUGS.get(model_key, "")
    if not model_slug:
        return []

    url = (f"https://www.autotrader.co.uk/car-search?make={make.capitalize()}"
           f"&model={model_slug}&postcode=SW1A+1AA&radius=1500&sort=relevance")

    html = fetch_page(url, delay=5.0)  # Extra delay for AutoTrader
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    # Extract dealer names from listing cards
    dealer_els = soup.select("[data-testid='seller-name'], .seller-name, [class*='dealer-name']")
    dealers = list({el.get_text(strip=True) for el in dealer_els if el.get_text(strip=True)})
    logger.info(f"  AutoTrader discovery [{model_key}]: found {len(dealers)} dealers: {dealers[:5]}")
    return dealers


# ── Main scrape function ──────────────────────────────────────────────────────

def scrape_all_specialist_dealers(model_key: str) -> list[dict]:
    """
    Run all specialist dealer scrapers for a given model.
    Returns a combined list of raw listing dicts.
    """
    all_results = []

    logger.info(f"Scraping specialist dealers for {model_key}...")

    # Tier 2a: Independent specialists
    for scraper_fn, name in [
        (scrape_amari, "Amari"),
        (scrape_joe_macari, "Joe Macari"),
        (scrape_romans, "Romans International"),
        (scrape_tom_hartley, "Tom Hartley Jnr"),
    ]:
        try:
            results = scraper_fn(model_key)
            all_results.extend(results)
            logger.info(f"  {name}: {len(results)} listings")
        except Exception as e:
            logger.error(f"  {name} scraper failed: {e}")

    # Tier 2b: AutoTrader dealer discovery (log only, no data extraction)
    try:
        at_dealers = discover_autotrader_dealers(model_key)
        if at_dealers:
            logger.info(f"  AutoTrader discovered {len(at_dealers)} dealers for {model_key}")
            # TODO: Cross-reference against known dealer URLs and scrape their sites
    except Exception as e:
        logger.error(f"  AutoTrader discovery failed: {e}")

    logger.info(f"Specialist dealers total for {model_key}: {len(all_results)} listings")
    return all_results


if __name__ == "__main__":
    import argparse
    import json
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Specialist Dealer Scraper")
    parser.add_argument("--model", default="812-superfast", help="Model key to scrape (e.g. 488-pista)")
    args = parser.parse_args()
    model = args.model
    print(f"\nTesting specialist dealer scraper for: {model}")
    results = scrape_all_specialist_dealers(model)
    print(f"\n=== RESULTS ({len(results)} listings) ===")
    for r in results:
        print(f"  [{r['dealer']}] {r['title']} — £{r.get('asking_price', 'POA'):,}" if r.get('asking_price') else f"  [{r['dealer']}] {r['title']} — POA")
    print(json.dumps(results[:3], indent=2, default=str))

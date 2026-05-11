"""
dealer_registry.py — Curated UK Supercar Dealer Registry
=========================================================
Maps AutoTrader dealer names → direct website URLs + scraper config.

This registry is the single source of truth for:
  1. Which dealers we know about
  2. How to scrape their own websites directly
  3. How to classify them (official Ferrari dealer vs independent specialist)

When enriching an AutoTrader listing:
  - Look up the dealer name in DEALER_REGISTRY (case-insensitive)
  - If found → use the dealer's own website URL to scrape full spec data
  - If not found → attempt to follow the AutoTrader "visit dealer" link
  - If no dealer page accessible → mark listing as 'incomplete_data'

Scraper types:
  - "ferraridealers"  : Official Ferrari dealer on ferraridealers.com subdomain
  - "specialist"      : Independent specialist with custom bespoke scraper
  - "generic"         : Generic dealer — use LLM on whatever page we can find

Dealer types:
  - "ferrari-approved"        : Official Ferrari dealer
  - "independent-specialist"  : Known independent supercar specialist
  - "general-dealer"          : General prestige/used car dealer

stock_url notes:
  - If `make_aware: True`, the stock_url is a template with {make_slug} placeholder.
    Use get_make_aware_stock_url(dealer_key, make_slug) to resolve it.
  - If `playwright_required: True`, always use Playwright (skip HTTP attempt).
"""

from __future__ import annotations
import re
from typing import Optional

# ── Registry ──────────────────────────────────────────────────────────────────
# Key: normalised dealer name (lowercase, stripped)
# Value: dict with scraper config

DEALER_REGISTRY: dict[str, dict] = {

    # ── Official Ferrari Dealers (ferraridealers.com subdomains) ──────────────

    "graypaul nottingham": {
        "name": "Graypaul Nottingham",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://nottingham.ferraridealers.com",
        "stock_url": "https://nottingham.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Sytner Group — official Ferrari dealer East Midlands",
    },
    "graypaul birmingham": {
        "name": "Graypaul Birmingham",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://birmingham.ferraridealers.com",
        "stock_url": "https://birmingham.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Sytner Group — official Ferrari dealer West Midlands",
    },
    "graypaul edinburgh": {
        "name": "Graypaul Edinburgh",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://edinburgh.ferraridealers.com",
        "stock_url": "https://edinburgh.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Sytner Group — official Ferrari dealer Scotland",
    },
    "graypaul glasgow": {
        "name": "Graypaul Glasgow",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://glasgow.ferraridealers.com",
        "stock_url": "https://glasgow.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Sytner Group — official Ferrari dealer Glasgow/Renfrew",
    },
    "graypaul": {
        "name": "Graypaul",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://nottingham.ferraridealers.com",
        "stock_url": "https://nottingham.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Graypaul fallback (no specific location)",
    },
    "h.r. owen london": {
        "name": "H.R. Owen London",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://london-hrowen.ferraridealers.com",
        "stock_url": "https://london-hrowen.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "HR Owen official Ferrari dealer London",
    },
    "h.r. owen hatfield": {
        "name": "H.R. Owen Hatfield",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://hatfield-hrowen.ferraridealers.com",
        "stock_url": "https://hatfield-hrowen.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "HR Owen official Ferrari dealer Hatfield",
    },
    "hr owen": {
        "name": "HR Owen",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://london-hrowen.ferraridealers.com",
        "stock_url": "https://london-hrowen.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "HR Owen fallback (no specific location)",
    },
    "stratstone manchester": {
        "name": "Stratstone Manchester",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://manchester.ferraridealers.com",
        "stock_url": "https://manchester.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Stratstone official Ferrari dealer Wilmslow/Manchester",
    },
    "stratstone colchester": {
        "name": "Stratstone Colchester",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://colchester.ferraridealers.com",
        "stock_url": "https://colchester.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Stratstone official Ferrari dealer Colchester",
    },
    "stratstone": {
        "name": "Stratstone",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://manchester.ferraridealers.com",
        "stock_url": "https://manchester.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Stratstone fallback (no specific location)",
    },
    "carrs ferrari": {
        "name": "Carrs Ferrari",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://exeter.ferraridealers.com",
        "stock_url": "https://exeter.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Official Ferrari dealer Exeter",
    },
    "meridien modena ferrari": {
        "name": "Meridien Modena Ferrari",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://southampton.ferraridealers.com",
        "stock_url": "https://southampton.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Official Ferrari dealer Southampton",
    },
    "meridien modena": {
        "name": "Meridien Modena",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://southampton.ferraridealers.com",
        "stock_url": "https://southampton.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Official Ferrari dealer Southampton (short name)",
    },
    "maranello sales": {
        "name": "Maranello Sales",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://surrey.ferraridealers.com",
        "stock_url": "https://surrey.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Official Ferrari dealer Surrey",
    },
    "dick lovett swindon": {
        "name": "Dick Lovett Swindon",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://swindon.ferraridealers.com",
        "stock_url": "https://swindon.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Official Ferrari dealer Swindon",
    },
    "dick lovett": {
        "name": "Dick Lovett",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://swindon.ferraridealers.com",
        "stock_url": "https://swindon.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Dick Lovett fallback",
    },
    "jct600 leeds": {
        "name": "JCT600 Leeds",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://leeds.ferraridealers.com",
        "stock_url": "https://leeds.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "JCT600 official Ferrari dealer Leeds",
    },
    "jct600": {
        "name": "JCT600",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://leeds.ferraridealers.com",
        "stock_url": "https://leeds.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "JCT600 fallback (no specific location)",
    },
    "charles hurst": {
        "name": "Charles Hurst",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://belfast.ferraridealers.com",
        "stock_url": "https://belfast.ferraridealers.com/en-GB/r/used-ferrari/f",
        "notes": "Official Ferrari dealer Belfast, Northern Ireland",
    },
    "ferrari approved": {
        "name": "Ferrari Approved",
        "dealer_type": "ferrari-approved",
        "scraper": "ferraridealers",
        "base_url": "https://preowned.ferrari.com",
        "stock_url": "https://preowned.ferrari.com/en-GB/r/europe/used-ferrari/great-britain/rfcd",
        "notes": "Generic Ferrari Approved fallback",
    },

    # ── Independent Specialists ───────────────────────────────────────────────

    "amari supercars": {
        "name": "Amari Supercars",
        "dealer_type": "independent-specialist",
        "scraper": "specialist",
        "base_url": "https://www.amarisupercars.com",
        "stock_url": "https://www.amarisupercars.com/for-sale/",
        "search_param": "s",
        "notes": "WordPress site, article cards",
    },
    "amari supercars (gb)": {
        "name": "Amari Supercars",
        "dealer_type": "independent-specialist",
        "scraper": "specialist",
        "base_url": "https://www.amarisupercars.com",
        "stock_url": "https://www.amarisupercars.com/for-sale/",
        "search_param": "s",
        "notes": "AutoTrader variant name for Amari",
    },
    "joe macari": {
        "name": "Joe Macari",
        "dealer_type": "independent-specialist",
        "scraper": "specialist",
        "base_url": "https://www.joemacari.com",
        "stock_url": "https://www.joemacari.com/cars-for-sale/",
        "notes": "WordPress site — car detail pages at /stock/<slug>/<id>",
    },
    "joe macari performance cars": {
        "name": "Joe Macari",
        "dealer_type": "independent-specialist",
        "scraper": "specialist",
        "base_url": "https://www.joemacari.com",
        "stock_url": "https://www.joemacari.com/cars-for-sale/",
        "notes": "AutoTrader variant name for Joe Macari",
    },
    "romans international": {
        "name": "Romans International",
        "dealer_type": "independent-specialist",
        "scraper": "specialist",
        "base_url": "https://www.romansinternational.com",
        # stock_url is make-aware — use get_romans_stock_url(make_slug) instead
        "stock_url": "https://www.romansinternational.com/used/cars/{make_slug}/",
        "make_aware": True,
        "notes": "New URL structure (2025+): /used/cars/<make>/<model>/--<id>. URL is templated.",
    },
    "tom hartley jnr": {
        "name": "Tom Hartley Jnr",
        "dealer_type": "independent-specialist",
        "scraper": "specialist",
        "base_url": "https://www.tomhartleyjnr.com",
        "stock_url": "https://www.tomhartleyjnr.com/current-stock/",
        "notes": "Custom CMS, li > a[href*='/car/stock/']",
    },
    "bell sport & classic": {
        "name": "Bell Sport & Classic",
        "dealer_type": "independent-specialist",
        "scraper": "unsupported",
        "base_url": "https://www.bellsportandclassic.co.uk",
        "stock_url": "https://www.bellsportandclassic.co.uk/used-cars-for-sale/",
        "notes": "Dragon2000 DMS SPA — car links not in static DOM, requires click-through navigation. Specialises in classic/vintage Ferraris (pre-2000). Not worth scraping for modern models.",
    },
    # Note: "bell sport and classic" is an alias — handled by normalise_dealer_name()
    "redline specialist cars": {
        "name": "Redline Specialist Cars",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://redlinespecialistcars.co.uk",
        # Single /cars/ page for all makes (258 results). No make-specific pages exist.
        "stock_url": "https://redlinespecialistcars.co.uk/cars/",
        "notes": "Single all-makes stock page /cars/. Car detail links at /car/<make>-<model>-<id>/",
    },
    "dmb collection": {
        "name": "DMB Collection",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.dmbcollection.co.uk",
        "stock_url": "https://www.dmbcollection.co.uk/used-cars-for-sale/",
        "playwright_required": True,
        "playwright_wait_ms": 4000,
        "notes": "Dragon2000 DMS — JS-rendered, requires Playwright + 4s wait. Car links at /used-car/<slug>/",
    },
    "kaaimans international": {
        "name": "Kaaimans International",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.kaaimans.com",
        "stock_url": "https://www.kaaimans.com/current-stock/",
        "playwright_required": True,
        "playwright_wait_ms": 3000,
        "notes": "JS-rendered site (Nottinghamshire). Stocks Ferrari (12 Cilindri, 458 Speciale, 599 GTO), Aston Martin, Lamborghini. Car links at /current-stock/<slug>/",
    },
    "kaaimans": {
        "name": "Kaaimans International",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.kaaimans.com",
        "stock_url": "https://www.kaaimans.com/current-stock/",
        "playwright_required": True,
        "playwright_wait_ms": 3000,
        "notes": "Short name alias for Kaaimans International",
    },
    "european prestige uk": {
        "name": "European Prestige UK",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.europeanprestige.co.uk",
        "stock_url": "https://www.europeanprestige.co.uk/stock/for-sale",
        "notes": "Orpington, Kent. Stocks Ferrari (812 Superfast, 812 GTS, F8 Tributo, 296 GTB, 458 Speciale), Lamborghini, McLaren, Porsche. Car detail URLs at /stock/for-sale/details/<slug>/<id>",
    },
    "ryland specialist cars": {
        "name": "Ryland Specialist Cars",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.ryland.co.uk",
        "stock_url": "https://www.ryland.co.uk/specialist-cars/used-cars/",
        "makes": ["lamborghini", "mclaren", "porsche", "bentley", "rolls-royce", "lotus", "maserati"],
        "notes": "Solihull. Franchise dealer group — Lamborghini, McLaren, Porsche, Bentley, Rolls-Royce, Lotus, Maserati. NO Ferrari.",
    },
    "alexanders prestige": {
        "name": "Alexanders Prestige",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.alexandersprestige.co.uk",
        "stock_url": "https://www.alexandersprestige.co.uk/used-cars/",
        "notes": "Knutsford, Cheshire. Stocks Ferrari (12Cilindri, Purosangue, 296 GTS), Lamborghini, Porsche, Aston Martin. Static HTML. Car detail URLs at /vehicle/{year}-{reg}-{make}-{model}/",
    },
    "bramley motor cars": {
        "name": "Bramley Motor Cars",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.bramley.com",
        "stock_url": "https://www.bramley.com/stock",
        "notes": "Surrey. Stocks Ferrari (430 Scuderia), McLaren, Porsche, Aston Martin. Static HTML. Car detail URLs at /stock/{year}-{make}-{model}/{id}",
    },
    "bramley": {
        "name": "Bramley Motor Cars",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.bramley.com",
        "stock_url": "https://www.bramley.com/stock",
        "notes": "Short name alias for Bramley Motor Cars",
    },
    "tom hartley": {
        "name": "Tom Hartley",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.tomhartley.com",
        "stock_url": "https://www.tomhartley.com/used/",
        "notes": "Derbyshire. Tom Hartley Senior (separate from Tom Hartley Jnr). Stocks ultra-rare Ferrari (SF90 XX, 599 SA Aperta), Lamborghini, Aston Martin, Porsche. Static HTML. Car detail URLs at /used-car-details/{slug}/id-{id}/",
    },
    # ── Removed dealers (do not re-add without verifying) ────────────────────
    # "premier gt"              — SSL certificate broken at server level (EOF on TLS handshake)
    # "shaks specialist cars"   — Cloudflare bot challenge, completely blocks all scrapers
    # "storm performance"       — DNS not resolving (dead domain)
    # "jim hallam"              — DNS not resolving (dead domain)
    # "bramshaw bespoke"        — DNS not resolving (dead domain)
    # "ventura collection"      — Not a car dealer (furniture company)
    # "morgan cars"             — Does not stock Ferrari/Lamborghini/McLaren
    # "oakmoore car company"    — Domain resolves but stock page URL unknown; homepage Cloudflare-blocked
    # "foskers"                 — Classic Ferrari only (pre-2000 models), not relevant for modern supercars
    # "hexagon classics"        — Classic cars only (pre-1990s), not relevant for modern supercars
    # "the supercar rooms"      — JS-rendered + bot protection (Cloudflare), cannot scrape reliably
    # "scott hardy automotive"  — Cloudflare bot challenge, completely blocks all scrapers
    # "grange cars"             — Franchise Lamborghini/McLaren/Porsche dealer (JS-rendered); no Ferrari; low priority
    # "jct600"                  — Official Ferrari franchise dealer; already covered via leeds.ferraridealers.com
}


def get_romans_stock_url(make_slug: str) -> str:
    """Return the Romans International stock URL for a given make slug."""
    return f"https://www.romansinternational.com/used/cars/{make_slug}/"


def get_make_aware_stock_url(dealer_key: str, make_slug: str) -> Optional[str]:
    """
    Resolve a make-aware stock URL for a given dealer and make slug.
    Returns None if the dealer is not in the registry or not make-aware.
    """
    entry = DEALER_REGISTRY.get(dealer_key)
    if not entry or not entry.get("make_aware"):
        return None
    template = entry.get("stock_url", "")
    if "{make_slug}" not in template:
        return None
    return template.replace("{make_slug}", make_slug)


def lookup_dealer(dealer_name: str) -> Optional[dict]:
    """
    Look up a dealer by name (case-insensitive, normalised).
    Returns the registry entry or None if not found.
    """
    key = normalise_dealer_name(dealer_name)
    return DEALER_REGISTRY.get(key)


def normalise_dealer_name(name: str) -> str:
    """Normalise a dealer name for registry lookup."""
    name = name.lower().strip()
    # Normalise punctuation variants
    name = name.replace("&", "and")
    name = re.sub(r"['\"\.,]", "", name)
    name = re.sub(r"\s+", " ", name)
    return name

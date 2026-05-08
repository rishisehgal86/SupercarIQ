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
    "tom hartley": {
        "name": "Tom Hartley Jnr",
        "dealer_type": "independent-specialist",
        "scraper": "specialist",
        "base_url": "https://www.tomhartleyjnr.com",
        "stock_url": "https://www.tomhartleyjnr.com/current-stock/",
        "notes": "Custom CMS, li > a[href*='/car/stock/']",
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
        # make_aware: True — stock URL uses {make_slug}-cars-for-sale/ pattern
        "stock_url": "https://redlinespecialistcars.co.uk/{make_slug}-cars-for-sale/",
        "make_aware": True,
        "notes": "Make-specific stock pages: /ferrari-cars-for-sale/, /lamborghini-cars-for-sale/ etc. Car detail links at /car/<make>-<model>-<id>/",
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
    # ── Removed dealers (do not re-add without verifying) ────────────────────
    # "premier gt"              — SSL certificate broken at server level (EOF on TLS handshake)
    # "shaks specialist cars"   — Cloudflare bot challenge, completely blocks all scrapers
    # "european prestige uk"    — DNS not resolving (dead domain)
    # "storm performance"       — DNS not resolving (dead domain)
    # "jim hallam"              — DNS not resolving (dead domain)
    # "bramshaw bespoke"        — DNS not resolving (dead domain)
    # "ventura collection"      — Not a car dealer (furniture company)
    # "morgan cars"             — Does not stock Ferrari/Lamborghini/McLaren
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

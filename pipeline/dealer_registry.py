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
  - "hrowen"          : HR Owen (official Ferrari dealer, own site)
  - "stratstone"      : Stratstone (official Ferrari dealer, own site)
  - "specialist"      : Independent specialist with custom site
  - "generic"         : Generic dealer — use LLM on whatever page we can find

Dealer types:
  - "ferrari-approved"        : Official Ferrari dealer
  - "independent-specialist"  : Known independent supercar specialist
  - "general-dealer"          : General prestige/used car dealer
"""

from __future__ import annotations
import re
from typing import Optional

# ── Registry ──────────────────────────────────────────────────────────────────
# Key: normalised dealer name (lowercase, stripped)
# Value: dict with scraper config
#
# Fields:
#   name          : canonical display name
#   dealer_type   : classification
#   scraper       : which scraper strategy to use
#   base_url      : root URL of the dealer's own website
#   stock_url     : URL of their used/stock listing page (if known)
#   search_param  : query param to filter by model (if applicable)
#   notes         : any notes about the dealer or scraper

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
        "notes": "WordPress site, article cards",
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
        "base_url": "https://www.romansinternational.co.uk",
        # stock_url is make-aware — use get_romans_stock_url(make_slug) instead
        "stock_url": "https://www.romansinternational.co.uk/used/cars/{make_slug}/",
        "notes": "Custom CMS, li.vehicle-item cards. URL is templated — replace {make_slug}.",
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
        "scraper": "specialist",
        "base_url": "https://www.bellsportandclassic.co.uk",
        "stock_url": "https://www.bellsportandclassic.co.uk/used-cars-for-sale/",
        "notes": "Ferrari specialist St Albans",
    },
    "bell sport and classic": {
        "name": "Bell Sport & Classic",
        "dealer_type": "independent-specialist",
        "scraper": "specialist",
        "base_url": "https://www.bellsportandclassic.co.uk",
        "stock_url": "https://www.bellsportandclassic.co.uk/used-cars-for-sale/",
        "notes": "AutoTrader variant name",
    },
    "shaks specialist cars": {
        "name": "Shaks Specialist Cars",
        "dealer_type": "independent-specialist",
        "scraper": "specialist",
        "base_url": "https://www.s-s-c.co.uk",
        "stock_url": "https://www.s-s-c.co.uk/stock/used-cars-in-huddersfield-west-yorkshire",
        "notes": "Huddersfield-based supercar specialist",
    },
    "redline specialist cars": {
        "name": "Redline Specialist Cars",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.redlinespecialistcars.co.uk",
        "stock_url": "https://www.redlinespecialistcars.co.uk/used-cars/",
        "notes": "Independent specialist — generic scraper",
    },
    "premier gt limited": {
        "name": "Premier GT",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.premiergt.co.uk",
        "stock_url": "https://www.premiergt.co.uk/used-cars/",
        "notes": "Independent specialist",
    },
    "premier gt": {
        "name": "Premier GT",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.premiergt.co.uk",
        "stock_url": "https://www.premiergt.co.uk/used-cars/",
        "notes": "Independent specialist",
    },
    "ventura collection": {
        "name": "Ventura Collection",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.venturacollection.co.uk",
        "stock_url": "https://www.venturacollection.co.uk/stock/",
        "notes": "Independent specialist",
    },
    "dmb collection": {
        "name": "DMB Collection",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.dmbcollection.co.uk",
        "stock_url": "https://www.dmbcollection.co.uk/used-cars/",
        "notes": "Independent specialist",
    },
    "european prestige uk": {
        "name": "European Prestige UK",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.europeanprestigeuk.com",
        "stock_url": "https://www.europeanprestigeuk.com/used-cars/",
        "notes": "Independent prestige dealer",
    },
    "morgan cars": {
        "name": "Morgan Cars",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.morgancars.co.uk",
        "stock_url": "https://www.morgancars.co.uk/used-cars/",
        "notes": "Independent specialist",
    },
    "storm performance": {
        "name": "Storm Performance",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.stormperformance.co.uk",
        "stock_url": "https://www.stormperformance.co.uk/used-cars/",
        "notes": "Independent specialist",
    },
    "jim hallam": {
        "name": "Jim Hallam",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.jimhallam.co.uk",
        "stock_url": "https://www.jimhallam.co.uk/used-cars/",
        "notes": "Independent specialist",
    },
    "auto100.co.uk": {
        "name": "Auto100",
        "dealer_type": "independent-specialist",
        "scraper": "generic",
        "base_url": "https://www.auto100.co.uk",
        "stock_url": "https://www.auto100.co.uk/used-cars/",
        "notes": "Independent specialist",
    },
    "bramley": {
        "name": "Bramley",
        "dealer_type": "general-dealer",
        "scraper": "generic",
        "base_url": "https://www.bramley.co.uk",
        "stock_url": "https://www.bramley.co.uk/used-cars/",
        "notes": "General dealer",
    },
    "bramshaw bespoke vehicles": {
        "name": "Bramshaw Bespoke Vehicles",
        "dealer_type": "general-dealer",
        "scraper": "generic",
        "base_url": "https://www.bramshawbespoke.co.uk",
        "stock_url": "https://www.bramshawbespoke.co.uk/used-cars/",
        "notes": "General dealer",
    },
}


def get_romans_stock_url(make_slug: str) -> str:
    """Return the Romans International stock URL for a given make slug."""
    return f"https://www.romansinternational.co.uk/used/cars/{make_slug}/"


def lookup_dealer(dealer_name: str) -> Optional[dict]:
    """
    Look up a dealer by name (case-insensitive, normalised).
    Returns the registry entry or None if not found.
    """
    if not dealer_name:
        return None
    key = dealer_name.strip().lower()
    # Direct match
    if key in DEALER_REGISTRY:
        return DEALER_REGISTRY[key]
    # Partial match — check if any registry key is contained in the name
    for reg_key, entry in DEALER_REGISTRY.items():
        if reg_key in key or key in reg_key:
            return entry
    return None


def get_dealer_stock_url(dealer_name: str) -> Optional[str]:
    """Return the stock listing URL for a known dealer, or None."""
    entry = lookup_dealer(dealer_name)
    return entry["stock_url"] if entry else None


def get_dealer_type(dealer_name: str) -> str:
    """Return the dealer type string for a known dealer, or 'general-dealer'."""
    entry = lookup_dealer(dealer_name)
    return entry["dealer_type"] if entry else "general-dealer"


def is_known_dealer(dealer_name: str) -> bool:
    """Return True if the dealer is in the registry."""
    return lookup_dealer(dealer_name) is not None


def list_all_dealers() -> list[dict]:
    """Return all registry entries as a list."""
    return list(DEALER_REGISTRY.values())


if __name__ == "__main__":
    # Quick test
    test_names = [
        "Graypaul Nottingham", "HR Owen", "Amari Supercars (GB)",
        "Tom Hartley", "Romans International", "Unknown Dealer XYZ",
        "Stratstone Manchester", "Bell Sport & Classic", "Shaks Specialist Cars",
    ]
    print(f"{'Dealer Name':<35} {'Found':<6} {'Type':<25} {'Scraper'}")
    print("-" * 80)
    for name in test_names:
        entry = lookup_dealer(name)
        if entry:
            print(f"{name:<35} {'YES':<6} {entry['dealer_type']:<25} {entry['scraper']}")
        else:
            print(f"{name:<35} {'NO':<6} {'—':<25} —")

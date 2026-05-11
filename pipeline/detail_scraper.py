#!/usr/bin/env python3
"""
detail_scraper.py — Phase 2 of the Ferrari pipeline.

For each listing ID in the queue file, this script:
1. Fetches the AutoTrader listing page (or Ferrari Approved page)
2. Navigates to the dealer's own website to scrape full spec details
3. Uses the LLM to extract structured spec data from the page content
4. Scores the car using the model-specific scoring framework
5. Writes the enriched data to car_listing_details in the DB

Usage:
  python3 detail_scraper.py --queue /path/to/queue.json [--dry-run]
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

import asyncio

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
LLM_API_URL = os.environ.get("BUILT_IN_FORGE_API_URL", "")
LLM_API_KEY = os.environ.get("BUILT_IN_FORGE_API_KEY", "")

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
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
            if resp.status_code == 200:
                return resp.text
            elif resp.status_code == 429:
                wait = delay * (attempt + 2)
                log.warning(f"Rate limited — waiting {wait}s")
                time.sleep(wait)
            else:
                log.warning(f"HTTP {resp.status_code} for {url}")
                return None
        except requests.RequestException as e:
            log.warning(f"Request error (attempt {attempt+1}/{retries}): {e}")
            if attempt < retries - 1:
                time.sleep(delay)
    return None


def fetch_page_playwright(url: str, wait_ms: int = 3000) -> str | None:
    """
    Fetch a page using a headless Chromium browser via Playwright.
    Used for sites that block plain HTTP requests (e.g. Ferrari Approved
    preowned.ferrari.com which returns 403 via CloudFront for non-browser requests).
    Returns the full rendered HTML, or None on failure.
    """
    async def _fetch() -> str | None:
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            log.warning("Playwright not installed — falling back to requests")
            return fetch_page(url)

        try:
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
                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=45000)
                    await page.wait_for_timeout(wait_ms)
                    html = await page.content()
                    return html
                except Exception as e:
                    log.warning(f"Playwright page load error for {url}: {e}")
                    return None
                finally:
                    await browser.close()
        except Exception as e:
            log.warning(f"Playwright launch error: {e}")
            return None

    return asyncio.run(_fetch())

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
    return mysql.connector.connect(**kwargs, ssl_disabled=False)

def parse_json(val):
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return None

# ── LLM spec extraction ───────────────────────────────────────────────────────
SPEC_EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "dealer": {"type": "string", "description": "Dealer name (e.g. 'Graypaul Birmingham')"},
        "dealer_type": {
            "type": "string",
            "enum": ["ferrari-approved", "independent-specialist", "general-dealer"],
            "description": "Type of dealer"
        },
        "dealer_city": {"type": "string", "description": "City where dealer is located"},
        "dealer_url": {"type": "string", "description": "Dealer website URL"},
        "year": {"type": "integer", "description": "Registration year"},
        "colour": {"type": "string", "description": "Exterior colour (exact name from listing)"},
        "interior": {"type": "string", "description": "Interior colour/material"},
        "mileage": {"type": "integer", "description": "Mileage in miles"},
        "owner_count": {"type": "integer", "description": "Number of previous owners"},
        "service_history": {
            "type": "string",
            "enum": ["full-ferrari", "partial", "unknown"],
            "description": "Service history type"
        },
        "accident_history": {"type": "boolean", "description": "Whether car has accident history"},
        "gpf_status": {
            "type": "string",
            "enum": ["none", "fitted", "borderline"],
            "description": "GPF/OPF status. Pre-2019 = none, 2019+ = fitted, borderline if unclear"
        },
        "carbon_pack": {"type": "boolean", "description": "Carbon fibre exterior pack fitted"},
        "ccb": {"type": "boolean", "description": "Carbon ceramic brakes fitted"},
        "suspension_lift": {"type": "boolean", "description": "Front suspension lift system fitted"},
        "atelier_car": {"type": "boolean", "description": "Ferrari Atelier/Tailor Made bespoke spec"},
        "equipment_list": {
            "type": "array",
            "items": {"type": "string"},
            "description": "All optional equipment items listed, exactly as they appear in the listing"
        },
        "images": {
            "type": "array",
            "items": {"type": "string"},
            "description": "URLs of all car images found on the page"
        },
        "key_strengths": {
            "type": "array",
            "items": {"type": "string"},
            "description": "2-4 key selling points or strengths of this specific car"
        },
        "key_weaknesses": {
            "type": "array",
            "items": {"type": "string"},
            "description": "1-3 potential concerns or weaknesses of this specific car"
        },
        "data_confidence": {
            "type": "string",
            "enum": ["high", "medium", "estimated"],
            "description": "Confidence in extracted data quality"
        }
    },
    "required": [
        "dealer", "dealer_type", "year", "colour", "mileage",
        "owner_count", "service_history", "accident_history",
        "gpf_status", "carbon_pack", "ccb", "suspension_lift",
        "atelier_car", "equipment_list", "images",
        "key_strengths", "key_weaknesses", "data_confidence"
    ],
    "additionalProperties": False
}

def extract_spec_with_llm(listing_id: str, model_key: str, source_url: str,
                           page_content: str, dealer_page_content: str = None) -> dict | None:
    """Use LLM to extract structured spec data from page content."""
    if not LLM_API_URL or not LLM_API_KEY:
        log.warning("LLM API not configured — skipping LLM extraction")
        return None

    combined_content = f"=== AutoTrader/Source Listing ===\n{page_content[:6000]}"
    if dealer_page_content:
        combined_content += f"\n\n=== Dealer Website ===\n{dealer_page_content[:4000]}"

    system_prompt = f"""You are a Ferrari specialist extracting structured data from car listings.
Extract all available specification data for this {model_key.replace('-', ' ').title()} listing.

Key rules:
- GPF status: Pre-2019 cars = "none". 2019+ cars = "fitted". If year is unclear = "borderline".
- Ferrari Approved dealers (Graypaul, Meridien, JCT600, Stratstone, HR Owen, Dick Lovett, Rybrook) = "ferrari-approved"
- Well-known Ferrari specialists (Romans, Talacrest, DK Engineering, Foskers) = "independent-specialist"
- All others = "general-dealer"
- Carbon ceramic brakes (CCB/Brembo CCB) are standard on 812 Superfast — mark ccb=true for all 812s
- Extract ALL equipment items exactly as listed, including standard items
- Images: extract all full-resolution image URLs from the page
- Be conservative with key_strengths/weaknesses — only include genuinely notable points"""

    user_prompt = f"""Listing ID: {listing_id}
Model: {model_key}
Source URL: {source_url}

Page content:
{combined_content}

Extract all specification data for this Ferrari listing."""

    try:
        resp = requests.post(
            f"{LLM_API_URL}/v1/chat/completions",
            headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
            json={
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "car_spec_extraction",
                        "strict": True,
                        "schema": SPEC_EXTRACTION_SCHEMA,
                    }
                },
                "temperature": 0.1,
            },
            timeout=60,
        )
        if resp.status_code != 200:
            log.error(f"LLM API error {resp.status_code}: {resp.text[:200]}")
            return None
        result = resp.json()
        content = result["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception as e:
        log.error(f"LLM extraction failed: {e}")
        return None


# ── Scoring engine ────────────────────────────────────────────────────────────
# Model-specific scoring weights and IIV reference prices
MODEL_SCORING = {
    "812-superfast": {
        "iiv_base": 235000,
        "iiv_range": 50000,
        "gpf_weight": 20,
        "ccb_bonus": 3,
        "carbon_pack_bonus": 4,
        "atelier_bonus": 6,
        "fa_dealer_bonus": 8,
        "low_mileage_threshold": 5000,
        "high_mileage_threshold": 20000,
    },
    "812-gts": {
        "iiv_base": 380000,
        "iiv_range": 70000,
        "gpf_weight": 15,
        "ccb_bonus": 3,
        "carbon_pack_bonus": 4,
        "atelier_bonus": 8,
        "fa_dealer_bonus": 8,
        "low_mileage_threshold": 3000,
        "high_mileage_threshold": 15000,
    },
    "f8-tributo": {
        "iiv_base": 220000,
        "iiv_range": 60000,
        "gpf_weight": 10,
        "ccb_bonus": 5,
        "carbon_pack_bonus": 4,
        "atelier_bonus": 6,
        "fa_dealer_bonus": 8,
        "low_mileage_threshold": 5000,
        "high_mileage_threshold": 20000,
    },
    "458-italia": {
        "iiv_base": 130000,
        "iiv_range": 40000,
        "gpf_weight": 0,
        "ccb_bonus": 5,
        "carbon_pack_bonus": 3,
        "atelier_bonus": 5,
        "fa_dealer_bonus": 7,
        "low_mileage_threshold": 10000,
        "high_mileage_threshold": 30000,
    },
    "488-gtb": {
        "iiv_base": 175000,
        "iiv_range": 50000,
        "gpf_weight": 5,
        "ccb_bonus": 5,
        "carbon_pack_bonus": 3,
        "atelier_bonus": 5,
        "fa_dealer_bonus": 7,
        "low_mileage_threshold": 5000,
        "high_mileage_threshold": 20000,
    },
    "california-t": {
        "iiv_base": 90000,
        "iiv_range": 25000,
        "gpf_weight": 0,
        "ccb_bonus": 3,
        "carbon_pack_bonus": 2,
        "atelier_bonus": 4,
        "fa_dealer_bonus": 6,
        "low_mileage_threshold": 10000,
        "high_mileage_threshold": 30000,
    },
    "portofino": {
        "iiv_base": 110000,
        "iiv_range": 30000,
        "gpf_weight": 5,
        "ccb_bonus": 3,
        "carbon_pack_bonus": 2,
        "atelier_bonus": 4,
        "fa_dealer_bonus": 6,
        "low_mileage_threshold": 5000,
        "high_mileage_threshold": 25000,
    },
    "roma": {
        "iiv_base": 180000,
        "iiv_range": 40000,
        "gpf_weight": 5,
        "ccb_bonus": 5,
        "carbon_pack_bonus": 3,
        "atelier_bonus": 5,
        "fa_dealer_bonus": 7,
        "low_mileage_threshold": 3000,
        "high_mileage_threshold": 15000,
    },
}

# Desirable colours by model (affect IIV)
DESIRABLE_COLOURS = {
    "812-superfast": ["Rosso Corsa", "Giallo Modena", "Blu Tour de France", "Grigio Silverstone", "Bianco Avus"],
    "812-gts": ["Rosso Corsa", "Giallo Modena", "Blu Tour de France", "Grigio Silverstone"],
    "f8-tributo": ["Rosso Corsa", "Giallo Modena", "Blu Tour de France", "Rosso Ferrari"],
    "458-italia": ["Rosso Corsa", "Giallo Modena", "Bianco Avus", "Grigio Silverstone"],
    "488-gtb": ["Rosso Corsa", "Giallo Modena", "Bianco Avus", "Blu Tour de France"],
    "california-t": ["Rosso Corsa", "Bianco Avus", "Grigio Silverstone"],
    "portofino": ["Rosso Corsa", "Bianco Avus", "Grigio Silverstone"],
    "roma": ["Rosso Corsa", "Grigio Titanio", "Blu Corsa", "Bianco Cervino"],
}

SPECIAL_COLOURS = ["Tailor Made", "Atelier", "Special Order", "Unique", "One-off"]


def score_car(spec: dict, listing: dict, model_key: str) -> dict:
    """
    Calculate investment scores for a car based on its spec.
    Returns scores dict, IIV, and investment verdict.
    """
    cfg = MODEL_SCORING.get(model_key, MODEL_SCORING["812-superfast"])
    scores = {}

    # GPF score (0-10)
    gpf = spec.get("gpf_status", "none")
    if gpf == "none":
        scores["gpf"] = 10
    elif gpf == "borderline":
        scores["gpf"] = 5
    else:
        scores["gpf"] = 0

    # Engine condition (estimated from mileage and service history)
    mileage = listing.get("mileage") or spec.get("mileage") or 0
    sh = spec.get("service_history", "unknown")
    if sh == "full-ferrari" and mileage < 10000:
        scores["engineCondition"] = 9
    elif sh == "full-ferrari":
        scores["engineCondition"] = 7
    elif sh == "partial":
        scores["engineCondition"] = 5
    else:
        scores["engineCondition"] = 3

    # Owner history (0-10)
    owners = spec.get("owner_count") or 1
    if owners == 1:
        scores["ownerHistory"] = 10
    elif owners == 2:
        scores["ownerHistory"] = 7
    elif owners == 3:
        scores["ownerHistory"] = 4
    else:
        scores["ownerHistory"] = 2

    # Service history (0-10)
    if sh == "full-ferrari":
        scores["serviceHistory"] = 10
    elif sh == "partial":
        scores["serviceHistory"] = 5
    else:
        scores["serviceHistory"] = 2

    # Accident free (0-10)
    scores["accidentFree"] = 0 if spec.get("accident_history") else 10

    # Colour score (0-10)
    colour = (listing.get("colour") or spec.get("colour") or "").lower()
    desirable = [c.lower() for c in DESIRABLE_COLOURS.get(model_key, [])]
    special = [c.lower() for c in SPECIAL_COLOURS]
    if any(s in colour for s in special):
        scores["colour"] = 10
    elif any(d in colour for d in desirable):
        scores["colour"] = 8
    else:
        scores["colour"] = 5

    # Carbon pack (0-10)
    scores["carbonPack"] = 8 if spec.get("carbon_pack") else 5

    # Seats (0-10) — default 5 (standard)
    equipment = [e.lower() for e in (spec.get("equipment_list") or [])]
    has_racing_seats = any("racing" in e or "sport seat" in e for e in equipment)
    scores["seats"] = 8 if has_racing_seats else 5

    # Interior (0-10)
    interior = (spec.get("interior") or "").lower()
    if "alcantara" in interior or "carbon" in interior:
        scores["interior"] = 9
    elif interior:
        scores["interior"] = 6
    else:
        scores["interior"] = 5

    # CCB (0-10)
    scores["carbonCeramicBrakes"] = 8 if spec.get("ccb") else 5

    # Suspension lift (0-10)
    scores["suspensionLift"] = 8 if spec.get("suspension_lift") else 5

    # MagneRide (0-10) — detect from equipment
    has_magneride = any("magneride" in e or "magne-ride" in e or "magnetorheological" in e for e in equipment)
    scores["magnetorheological"] = 8 if has_magneride else 5

    # Rear wheel steering (0-10) — detect from equipment
    has_rws = any("rear wheel steer" in e or "4ws" in e for e in equipment)
    scores["rearWheelSteering"] = 8 if has_rws else 5

    # Atelier (0-10)
    scores["atelier"] = 10 if spec.get("atelier_car") else 5

    # Track pack (0-10)
    has_track_pack = any("track" in e and "pack" in e for e in equipment)
    scores["trackPack"] = 9 if has_track_pack else 5

    # Limited edition (0-10) — default 5
    scores["limitedEdition"] = 5

    # Mileage score (0-10)
    low_t = cfg["low_mileage_threshold"]
    high_t = cfg["high_mileage_threshold"]
    if mileage <= low_t:
        scores["mileage"] = 10
    elif mileage >= high_t:
        scores["mileage"] = 2
    else:
        scores["mileage"] = max(2, 10 - int((mileage - low_t) / (high_t - low_t) * 8))

    # Warranty (0-10)
    dealer_type = spec.get("dealer_type", "general-dealer")
    if dealer_type == "ferrari-approved":
        scores["warranty"] = 9
    elif dealer_type == "independent-specialist":
        scores["warranty"] = 6
    else:
        scores["warranty"] = 3

    # Storage quality (0-10) — estimated
    scores["storageQuality"] = 7 if sh == "full-ferrari" else 5

    # Price score (0-10) — relative to IIV
    asking_price = listing.get("askingPrice") or 0
    iiv_base = cfg["iiv_base"]
    if asking_price > 0:
        ratio = asking_price / iiv_base
        if ratio < 0.85:
            scores["price"] = 10
        elif ratio < 0.95:
            scores["price"] = 8
        elif ratio < 1.05:
            scores["price"] = 6
        elif ratio < 1.15:
            scores["price"] = 4
        else:
            scores["price"] = 2
    else:
        scores["price"] = 5

    # Weighted total score (simplified weights)
    WEIGHTS = {
        "gpf": 20, "engineCondition": 10, "ownerHistory": 8, "serviceHistory": 10,
        "accidentFree": 8, "colour": 6, "carbonPack": 4, "seats": 2, "interior": 3,
        "carbonCeramicBrakes": 5, "suspensionLift": 3, "magnetorheological": 3,
        "rearWheelSteering": 2, "atelier": 4, "trackPack": 3, "limitedEdition": 2,
        "mileage": 8, "warranty": 6, "storageQuality": 3, "price": 10,
    }
    total = sum(scores.get(k, 5) * w for k, w in WEIGHTS.items())
    max_total = sum(10 * w for w in WEIGHTS.values())
    total_score = round(total / max_total * 100, 1)

    # IIV calculation
    iiv_base = cfg["iiv_base"]
    iiv_range = cfg["iiv_range"]
    # Adjust IIV based on spec
    iiv_adj = 0
    if gpf == "none":
        iiv_adj += iiv_range * 0.10
    if spec.get("carbon_pack"):
        iiv_adj += cfg["carbon_pack_bonus"] * 1000
    if spec.get("ccb"):
        iiv_adj += cfg["ccb_bonus"] * 1000
    if spec.get("atelier_car"):
        iiv_adj += cfg["atelier_bonus"] * 1000
    if dealer_type == "ferrari-approved":
        iiv_adj += cfg["fa_dealer_bonus"] * 1000
    if mileage <= low_t:
        iiv_adj += iiv_range * 0.05
    elif mileage >= high_t:
        iiv_adj -= iiv_range * 0.05
    if scores.get("colour", 5) >= 8:
        iiv_adj += iiv_range * 0.03

    iiv = int(iiv_base + iiv_adj)
    iiv_low = int(iiv * 0.92)
    iiv_high = int(iiv * 1.08)

    # Price variance
    price_variance = iiv - asking_price if asking_price else 0
    price_variance_pct = round(price_variance / iiv * 100, 1) if iiv else 0

    # Investment verdict
    if total_score >= 70 and price_variance > 10000:
        verdict = "strong-buy"
    elif total_score >= 60 or price_variance > 5000:
        verdict = "buy"
    elif total_score >= 45:
        verdict = "consider"
    else:
        verdict = "avoid"

    return {
        "scores": scores,
        "total_score": total_score,
        "iiv": iiv,
        "iiv_low": iiv_low,
        "iiv_high": iiv_high,
        "price_variance": price_variance,
        "price_variance_pct": price_variance_pct,
        "investment_verdict": verdict,
    }


# ── Dealer registry integration ─────────────────────────────────────────────
try:
    from dealer_registry import DEALER_REGISTRY
except ImportError:
    DEALER_REGISTRY = {}


def get_dealer_url_from_registry(dealer_name: str) -> str | None:
    """
    Look up a dealer's direct website URL from the registry.
    Matches on normalised dealer name (case-insensitive, strips punctuation).
    Returns the stock_url if found, else None.
    """
    if not dealer_name:
        return None
    norm = dealer_name.lower().strip()
    for key, config in DEALER_REGISTRY.items():
        reg_name = config.get("name", key).lower()
        # Exact or substring match
        if norm in reg_name or reg_name in norm:
            stock_url = config.get("stock_url")
            if stock_url:
                log.info(f"  Registry match: '{dealer_name}' → {stock_url}")
                return stock_url
    return None


# ── Page content extraction ───────────────────────────────────────────────────
def extract_text_from_html(html: str) -> str:
    """Extract readable text from HTML, removing scripts and styles."""
    # Remove script and style blocks
    html = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', html)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:15000]  # Limit to 15k chars


def extract_images_from_html(html: str, base_url: str = "") -> list[str]:
    """Extract image URLs from HTML."""
    images = []
    # Find img src attributes
    for match in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE):
        src = match.group(1)
        if any(ext in src.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
            if src.startswith('//'):
                src = 'https:' + src
            elif src.startswith('/') and base_url:
                parsed = urlparse(base_url)
                src = f"{parsed.scheme}://{parsed.netloc}{src}"
            if src.startswith('http'):
                images.append(src)
    # Also find JSON-embedded image URLs
    for match in re.finditer(r'"(https?://[^"]+\.(?:jpg|jpeg|png|webp))"', html):
        images.append(match.group(1))
    # Deduplicate while preserving order
    seen = set()
    unique = []
    for img in images:
        if img not in seen and 'logo' not in img.lower() and 'icon' not in img.lower():
            seen.add(img)
            unique.append(img)
    return unique[:20]  # Max 20 images


def find_dealer_url_in_html(html: str) -> str | None:
    """Try to find a link to the dealer's own website in the AutoTrader listing."""
    # AutoTrader often has a "Visit dealer website" link
    patterns = [
        r'href=["\']([^"\']+)["\'][^>]*>(?:Visit|View)\s+(?:dealer|website)',
        r'data-dealer-url=["\']([^"\']+)["\']',
        r'"dealerWebsite"\s*:\s*"([^"]+)"',
        r'"website"\s*:\s*"([^"]+)"',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            url = match.group(1)
            if url.startswith('http') and 'autotrader' not in url.lower():
                return url
    return None


# ── Incomplete data gate ─────────────────────────────────────────────────────
INCOMPLETE_DATA_REASONS = [
    # (condition_fn, reason_string)
    # All conditions must be True for the listing to be marked incomplete
]

def is_incomplete_spec(spec: dict, dealer_page_fetched: bool) -> tuple[bool, str]:
    """
    Determine if a spec extraction result is too poor to display publicly.
    Returns (is_incomplete, reason).

    A listing is considered incomplete if ALL of the following are true:
      - data_confidence is 'estimated' (LLM couldn't find real data)
      - equipment_list is empty (no options extracted)
      - no dealer page was successfully fetched

    The rationale: if we have at least one of (dealer page, equipment list, high confidence)
    then we have enough to show the listing. If we have none, it's just a skeleton.
    """
    confidence = spec.get("data_confidence", "estimated")
    equipment = spec.get("equipment_list") or []
    has_dealer = bool(spec.get("dealer") and spec["dealer"].strip())

    if confidence == "estimated" and len(equipment) == 0 and not dealer_page_fetched:
        return True, f"estimated confidence, no equipment, no dealer page"
    if confidence == "estimated" and not has_dealer and not dealer_page_fetched:
        return True, f"estimated confidence, no dealer name, no dealer page"
    return False, ""


def mark_listing_incomplete(conn, listing_id: str, reason: str) -> None:
    """Log that a listing has incomplete spec data.
    
    Note: We intentionally do NOT change the listing status here — the listing
    remains 'active' so it stays visible on the site. Incomplete enrichment means
    we'll retry on the next pipeline run.
    """
    log.warning(f"  Incomplete spec for {listing_id}: {reason} — will retry on next run")


# ── Main enrichment function ──────────────────────────────────────────────────
def enrich_listing(listing_id: str, dry_run: bool = False) -> bool:
    """Enrich a single listing. Returns True on success."""
    conn = get_conn()
    cur = conn.cursor(dictionary=True)

    # Fetch listing from DB
    cur.execute("SELECT * FROM car_listings WHERE id = %s", (listing_id,))
    listing = cur.fetchone()
    if not listing:
        log.error(f"Listing {listing_id} not found in DB")
        conn.close()
        return False

    model_key = listing["modelKey"]
    source_url = listing["sourceUrl"]
    source = listing.get("source", "autotrader")
    log.info(f"Enriching {listing_id} ({model_key}) source={source} — {source_url}")

    # Step 1: Fetch the source listing page
    # Ferrari Approved (preowned.ferrari.com) detail page URLs expire within ~24h and
    # the detail pages themselves contain minimal spec data. The correct approach is:
    #   1. Re-scrape the FA search page to get fresh listing data (price, year, colour,
    #      mileage, dealer name) — this is fast (~10s) and always up to date.
    #   2. Use the dealer name to look up the dealer's own website in the registry.
    #   3. Fetch the dealer's website as the primary source of spec data.
    # We do NOT fetch the FA detail page at all — it's either 404 or contains no spec.
    log.info(f"  Fetching source page: {source_url}")

    # For FA listings: re-scrape FA search page, get dealer name, fetch dealer site
    fa_fresh_listing = None  # Will hold fresh FA listing data if available
    if source == "ferrari-approved":
        log.info(f"  Ferrari Approved listing — re-scraping FA search page for fresh data")
        try:
            from fa_playwright_scraper import scrape_ferrari_approved_playwright, MODEL_FA_SLUGS
            fa_slug = MODEL_FA_SLUGS.get(model_key)
            if fa_slug:
                fresh_listings = scrape_ferrari_approved_playwright(model_key, fa_slug)
                fa_fresh_listing = next((l for l in fresh_listings if l["id"] == listing_id), None)
                if fa_fresh_listing:
                    log.info(f"  FA fresh data: dealer={fa_fresh_listing.get('dealer_name')}, "
                             f"price=£{fa_fresh_listing.get('asking_price', 0):,}, "
                             f"year={fa_fresh_listing.get('year')}, colour={fa_fresh_listing.get('colour')}")
                else:
                    log.warning(f"  Listing {listing_id} not found in fresh FA scrape — may be sold/removed")
                    # Mark as archived since it's no longer on FA
                    if not dry_run:
                        cur2 = conn.cursor()
                        cur2.execute(
                            "UPDATE car_listings SET status = 'archived', archivedAt = NOW() WHERE id = %s",
                            (listing_id,)
                        )
                        conn.commit()
                    conn.close()
                    return False
            else:
                log.warning(f"  No FA slug for {model_key} — will try stored URL")
        except Exception as e:
            log.warning(f"  FA re-scrape failed: {e} — will try stored URL")

    # For non-FA sources, fetch the source page normally
    source_html = None
    source_text = ""
    source_images = []
    if source != "ferrari-approved":
        source_html = fetch_page(source_url)
        if not source_html:
            log.error(f"  Failed to fetch source page")
            conn.close()
            return False
        source_text = extract_text_from_html(source_html)
        source_images = extract_images_from_html(source_html, source_url)
    else:
        # For FA: build a synthetic source_text from the fresh FA listing data
        # This gives the LLM the basic facts (price, year, colour, mileage, dealer)
        if fa_fresh_listing:
            source_text = (
                f"Ferrari Approved listing\n"
                f"Model: Ferrari {model_key.replace('-', ' ').title()}\n"
                f"Year: {fa_fresh_listing.get('year', 'Unknown')}\n"
                f"Colour: {fa_fresh_listing.get('colour', 'Unknown')}\n"
                f"Mileage: {fa_fresh_listing.get('mileage', 'Unknown')} miles\n"
                f"Price: £{fa_fresh_listing.get('asking_price', 0):,}\n"
                f"Dealer: {fa_fresh_listing.get('dealer_name', 'Unknown')}\n"
                f"Source: Ferrari Approved UK (preowned.ferrari.com)\n"
            )

    # Step 2: Find and fetch dealer website
    # Priority order:
    #   1. For FA: use dealer_name from fresh FA scrape → registry lookup
    #   2. For AutoTrader: registry lookup from HTML, then HTML link extraction
    #   3. For specialist-dealer: source_url IS the dealer page
    dealer_url = None
    dealer_text = None
    dealer_images = []
    dealer_page_fetched = False

    if source == "specialist-dealer":
        # The source URL is already the dealer's own page — use it directly
        dealer_text = source_text
        dealer_images = source_images
        dealer_page_fetched = True
        log.info(f"  Specialist dealer source — using source page as dealer page")
    elif source == "ferrari-approved" and fa_fresh_listing:
        # Use dealer name from fresh FA scrape for registry lookup
        fa_dealer_name = fa_fresh_listing.get("dealer_name")
        if fa_dealer_name:
            registry_url = get_dealer_url_from_registry(fa_dealer_name)
            if registry_url:
                dealer_url = registry_url
                log.info(f"  FA dealer registry lookup: '{fa_dealer_name}' → {dealer_url}")
            else:
                log.warning(f"  FA dealer '{fa_dealer_name}' not found in registry — no dealer page")
        if dealer_url:
            log.info(f"  Fetching FA dealer page: {dealer_url}")
            time.sleep(2)
            dealer_html = fetch_page(dealer_url)
            # ferraridealers.com subdomains block plain HTTP — fall back to Playwright
            if not dealer_html and "ferraridealers.com" in dealer_url:
                log.info(f"  Plain HTTP blocked, retrying with Playwright: {dealer_url}")
                dealer_html = fetch_page_playwright(dealer_url, wait_ms=4000)
            if dealer_html:
                dealer_text = extract_text_from_html(dealer_html)
                dealer_images = extract_images_from_html(dealer_html, dealer_url)
                dealer_page_fetched = True
                log.info(f"  FA dealer page fetched ({len(dealer_images)} images)")
            else:
                log.warning(f"  FA dealer page fetch failed: {dealer_url}")
    else:
        # AutoTrader or other: extract dealer name from HTML, then registry lookup
        dealer_name_match = re.search(
            r'(?:dealer|sold by|listed by)[:\s]+([A-Z][\w\s&]+?)(?:\n|\.|,|\|)',
            source_text, re.IGNORECASE
        )
        if dealer_name_match:
            candidate = dealer_name_match.group(1).strip()
            registry_url = get_dealer_url_from_registry(candidate)
            if registry_url:
                dealer_url = registry_url
                log.info(f"  Registry lookup: '{candidate}' → {dealer_url}")

        # Fall back to HTML link extraction
        if not dealer_url:
            dealer_url = find_dealer_url_in_html(source_html)
            if dealer_url:
                log.info(f"  HTML link extraction: {dealer_url}")

        if dealer_url:
            log.info(f"  Fetching dealer page: {dealer_url}")
            time.sleep(3)  # Polite delay
            dealer_html = fetch_page(dealer_url)
            if dealer_html:
                dealer_text = extract_text_from_html(dealer_html)
                dealer_images = extract_images_from_html(dealer_html, dealer_url)
                dealer_page_fetched = True
                log.info(f"  Dealer page fetched ({len(dealer_images)} images)")
            else:
                log.warning(f"  Dealer page fetch failed: {dealer_url}")

    # Combine images (dealer images first as they're usually better quality)
    all_images = dealer_images + [img for img in source_images if img not in dealer_images]
    all_images = all_images[:15]  # Cap at 15 images

    # Step 3: LLM extraction
    log.info(f"  Running LLM extraction...")
    spec = extract_spec_with_llm(
        listing_id, model_key, source_url,
        source_text, dealer_text
    )

    if not spec:
        # Fallback: basic extraction from HTML patterns
        log.warning(f"  LLM extraction failed — using basic extraction")
        spec = {
            "dealer": "",
            "dealer_type": "general-dealer",
            "dealer_city": "",
            "dealer_url": dealer_url or "",
            "year": listing.get("year"),
            "colour": listing.get("colour") or "",
            "interior": "",
            "mileage": listing.get("mileage") or 0,
            "owner_count": 1,
            "service_history": "unknown",
            "accident_history": False,
            "gpf_status": "fitted" if (listing.get("year") or 0) >= 2019 else "none",
            "carbon_pack": False,
            "ccb": model_key in ["812-superfast", "812-gts"],  # Standard on 812
            "suspension_lift": False,
            "atelier_car": False,
            "equipment_list": [],
            "images": all_images,
            "key_strengths": [],
            "key_weaknesses": [],
            "data_confidence": "estimated",
        }

    # Merge images from scraping with LLM-extracted images
    llm_images = spec.get("images") or []
    merged_images = list(dict.fromkeys(llm_images + all_images))[:15]
    spec["images"] = merged_images

    # Step 3b: Incomplete data gate
    # If we couldn't get real spec data, mark the listing as incomplete_data
    # and skip writing to car_listing_details. The listing will be hidden from
    # the public site until it can be re-enriched.
    incomplete, reason = is_incomplete_spec(spec, dealer_page_fetched)
    if incomplete:
        if dry_run:
            log.info(f"  [DRY RUN] Would mark as incomplete_data: {reason}")
        else:
            mark_listing_incomplete(conn, listing_id, reason)
        conn.close()
        return False  # Return False so the caller knows enrichment was not completed

    # Step 4: Score the car
    log.info(f"  Scoring car...")
    scoring = score_car(spec, listing, model_key)

    if dry_run:
        log.info(f"  [DRY RUN] Would write to DB:")
        log.info(f"    Score: {scoring['total_score']}, IIV: £{scoring['iiv']:,}, Verdict: {scoring['investment_verdict']}")
        log.info(f"    Dealer: {spec.get('dealer')}, Type: {spec.get('dealer_type')}")
        log.info(f"    Images: {len(merged_images)}, Equipment: {len(spec.get('equipment_list', []))}")
        log.info(f"    Data confidence: {spec.get('data_confidence')}, Dealer page: {dealer_page_fetched}")
        conn.close()
        return True

    # Step 5: Write to DB
    log.info(f"  Writing to DB...")
    cur.execute("""
        INSERT INTO car_listing_details
          (listingId, iiv, iivLow, iivHigh, priceVariance, priceVariancePct,
           totalScore, `rank`, investmentVerdict, gpfStatus, interior, dealer, dealerType,
           ownerCount, serviceHistory, accidentHistory, carbonPack, ccb, suspensionLift,
           atelierCar, dataConfidence, equipmentJson, imagesJson, scoresJson,
           keyStrengths, keyWeaknesses)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
          iiv = VALUES(iiv), iivLow = VALUES(iivLow), iivHigh = VALUES(iivHigh),
          priceVariance = VALUES(priceVariance), priceVariancePct = VALUES(priceVariancePct),
          totalScore = VALUES(totalScore), investmentVerdict = VALUES(investmentVerdict),
          gpfStatus = VALUES(gpfStatus), interior = VALUES(interior),
          dealer = VALUES(dealer), dealerType = VALUES(dealerType),
          ownerCount = VALUES(ownerCount), serviceHistory = VALUES(serviceHistory),
          accidentHistory = VALUES(accidentHistory), carbonPack = VALUES(carbonPack),
          ccb = VALUES(ccb), suspensionLift = VALUES(suspensionLift),
          atelierCar = VALUES(atelierCar), dataConfidence = VALUES(dataConfidence),
          equipmentJson = VALUES(equipmentJson), imagesJson = VALUES(imagesJson),
          scoresJson = VALUES(scoresJson), keyStrengths = VALUES(keyStrengths),
          keyWeaknesses = VALUES(keyWeaknesses)
    """, (
        listing_id,
        scoring["iiv"], scoring["iiv_low"], scoring["iiv_high"],
        scoring["price_variance"], scoring["price_variance_pct"],
        scoring["total_score"],
        scoring["investment_verdict"],
        spec.get("gpf_status", "none"),
        spec.get("interior", ""),
        spec.get("dealer", ""),
        spec.get("dealer_type", "general-dealer"),
        spec.get("owner_count") or 1,
        spec.get("service_history", "unknown"),
        bool(spec.get("accident_history", False)),
        bool(spec.get("carbon_pack", False)),
        bool(spec.get("ccb", False)),
        bool(spec.get("suspension_lift", False)),
        bool(spec.get("atelier_car", False)),
        spec.get("data_confidence", "estimated"),
        json.dumps(spec.get("equipment_list") or []),
        json.dumps(merged_images),
        json.dumps(scoring["scores"]),
        json.dumps(spec.get("key_strengths") or []),
        json.dumps(spec.get("key_weaknesses") or []),
    ))

    # Also update car_listings with enriched colour/year/mileage if available
    updates = []
    params = []
    if spec.get("colour") and not listing.get("colour"):
        updates.append("colour = %s")
        params.append(spec["colour"])
    if spec.get("year") and not listing.get("year"):
        updates.append("year = %s")
        params.append(spec["year"])
    if spec.get("mileage") and not listing.get("mileage"):
        updates.append("mileage = %s")
        params.append(spec["mileage"])
    if updates:
        params.append(listing_id)
        cur.execute(f"UPDATE car_listings SET {', '.join(updates)} WHERE id = %s", params)

    conn.commit()
    conn.close()

    log.info(f"  Done: score={scoring['total_score']}, IIV=£{scoring['iiv']:,}, "
             f"verdict={scoring['investment_verdict']}, images={len(merged_images)}")
    return True


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Ferrari Pipeline — Detail Scraper")
    parser.add_argument("--queue", required=True, help="Path to JSON file containing list of listing IDs")
    parser.add_argument("--dry-run", action="store_true", help="Print what would happen without writing to DB")
    args = parser.parse_args()

    queue_path = Path(args.queue)
    if not queue_path.exists():
        log.error(f"Queue file not found: {queue_path}")
        sys.exit(1)

    with open(queue_path) as f:
        listing_ids = json.load(f)

    if not isinstance(listing_ids, list):
        log.error("Queue file must contain a JSON array of listing IDs")
        sys.exit(1)

    log.info(f"Processing {len(listing_ids)} listing(s) from queue")
    success = 0
    failed = 0

    for listing_id in listing_ids:
        try:
            ok = enrich_listing(listing_id, dry_run=args.dry_run)
            if ok:
                success += 1
            else:
                failed += 1
        except Exception as e:
            log.error(f"Error enriching {listing_id}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
        time.sleep(5)  # Polite delay between listings

    log.info(f"Complete: {success} succeeded, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

"""
fa_listing_enricher.py
======================
Playwright-based enrichment for Ferrari Approved individual listing pages.

Strategy:
  1. Fetch the FA search results page to get the full ad data including options/equipment
  2. For each listing, extract the full equipment list from the __NEXT_DATA__ JSON
  3. Use LLM to parse the equipment list and score against the 812 Superfast IIV framework
  4. Upsert enriched data into car_listing_details in Railway MySQL

The FA site uses encrypted IDs that expire, so we re-fetch all ads from the search
results (which contain the full equipment data) rather than visiting individual pages.
"""

import asyncio
import json
import logging
import os
import re
import sys

log = logging.getLogger(__name__)

BASE_URL = "https://preowned.ferrari.com/en-GB/r/europe/used-ferrari/great-britain/rfc"

# ── 812 Superfast IIV Scoring Framework ──────────────────────────────────────
# Weights match the frontend scoring model
SCORING_WEIGHTS = {
    "gpf": 20,           # GPF status (pre-GPF = full marks)
    "mileage": 15,       # Mileage vs market average (~8,000 mi)
    "colour": 12,        # Colour desirability
    "ownerHistory": 12,  # Number of owners
    "serviceHistory": 10, # Service history quality
    "price": 15,         # Price vs IIV
    "accidentFree": 10,  # Accident-free history
    "carbonCeramicBrakes": 3,  # Standard on 812 — always full marks
    "suspensionLift": 5, # Front axle lift (desirable option)
    "atelierCar": 8,     # Atelier bespoke spec
    "carbonPack": 5,     # Carbon fibre pack
    "daytonaSeats": 5,   # Daytona racing seats
}

# Colour desirability tiers for 812 Superfast
COLOUR_TIERS = {
    "special": [
        "canna di fucile", "argento nurburgring", "blu tour de france",
        "blu hembery", "blu helen", "giallo triplo strato", "verde british",
        "rosso fuoco", "matte", "special order"
    ],
    "desirable": [
        "rosso corsa", "grigio silverstone", "nero daytona", "bianco avus",
        "rosso scuderia", "blu pozzi", "grigio titanio"
    ],
    # Everything else = standard
}


def get_colour_tier(colour: str) -> str:
    c = colour.lower()
    for name in COLOUR_TIERS["special"]:
        if name in c:
            return "special"
    for name in COLOUR_TIERS["desirable"]:
        if name in c:
            return "desirable"
    return "standard"


def score_listing(listing: dict, equipment: list[str]) -> dict:
    """
    Score a 812 Superfast listing against the IIV framework.
    Returns a dict with all score components and derived values.
    """
    year = listing.get("year") or 2019
    mileage = listing.get("mileage") or 0
    price = listing.get("asking_price") or 0
    colour = listing.get("colour") or ""
    equip_lower = [e.lower() for e in equipment]

    def has_option(*keywords) -> bool:
        return any(
            any(kw.lower() in e for kw in keywords)
            for e in equip_lower
        )

    # ── GPF Status ────────────────────────────────────────────────────────────
    if year <= 2018:
        gpf_status = "none"
        gpf_score = SCORING_WEIGHTS["gpf"]  # Full marks
    elif year == 2019:
        gpf_status = "borderline"
        gpf_score = round(SCORING_WEIGHTS["gpf"] * 0.6)
    else:
        gpf_status = "fitted"
        gpf_score = 0

    # ── Mileage ───────────────────────────────────────────────────────────────
    avg_mileage = 8000
    if mileage <= 3000:
        mileage_score = SCORING_WEIGHTS["mileage"]
    elif mileage <= avg_mileage:
        mileage_score = round(SCORING_WEIGHTS["mileage"] * (1 - (mileage - 3000) / (avg_mileage - 3000) * 0.4))
    elif mileage <= 15000:
        mileage_score = round(SCORING_WEIGHTS["mileage"] * 0.5 * (1 - (mileage - avg_mileage) / (15000 - avg_mileage)))
    else:
        mileage_score = 0

    # ── Colour ────────────────────────────────────────────────────────────────
    tier = get_colour_tier(colour)
    colour_score = {
        "special": SCORING_WEIGHTS["colour"],
        "desirable": round(SCORING_WEIGHTS["colour"] * 0.75),
        "standard": round(SCORING_WEIGHTS["colour"] * 0.4),
    }[tier]

    # ── Owner History (FA cars typically 1-2 owners) ──────────────────────────
    owner_count = 1
    if has_option("2 owner", "two owner", "2nd owner", "second owner"):
        owner_count = 2
    elif has_option("3 owner", "three owner"):
        owner_count = 3
    owner_score = {1: SCORING_WEIGHTS["ownerHistory"], 2: round(SCORING_WEIGHTS["ownerHistory"] * 0.6), 3: 0}.get(owner_count, 0)

    # ── Service History (FA = always full Ferrari) ────────────────────────────
    service_score = SCORING_WEIGHTS["serviceHistory"]  # FA = full Ferrari always

    # ── Price vs IIV ──────────────────────────────────────────────────────────
    # Base IIV: £246,000 for a standard 2020 812 Superfast
    base_iiv = 246000
    if gpf_status == "none":
        base_iiv += 10000
    elif gpf_status == "borderline":
        base_iiv += 4000
    if mileage <= 3000:
        base_iiv += 8000
    elif mileage <= 6000:
        base_iiv += 4000
    elif mileage > 15000:
        base_iiv -= 8000
    if tier == "special":
        base_iiv += 12000
    elif tier == "desirable":
        base_iiv += 4000
    if has_option("atelier"):
        base_iiv += 8000
    if has_option("daytona seat", "racing seat"):
        base_iiv += 5000
    if has_option("front lift", "suspension lift", "front axle lift"):
        base_iiv += 3000
    if has_option("carbon pack", "carbon fibre pack", "carbon fiber pack"):
        base_iiv += 4000

    iiv = base_iiv
    iiv_low = iiv - 15000
    iiv_high = iiv + 15000
    variance = iiv - price
    variance_pct = round(variance / iiv * 100, 1)

    if variance > 15000:
        price_score = SCORING_WEIGHTS["price"]
        verdict = "strong-buy"
    elif variance > 5000:
        price_score = round(SCORING_WEIGHTS["price"] * 0.8)
        verdict = "buy"
    elif variance >= 0:
        price_score = round(SCORING_WEIGHTS["price"] * 0.5)
        verdict = "consider"
    else:
        price_score = round(SCORING_WEIGHTS["price"] * max(0, 1 + variance / iiv))
        verdict = "avoid"

    # ── Options ───────────────────────────────────────────────────────────────
    accident_free = not has_option("accident", "damage", "repaired")
    accident_score = SCORING_WEIGHTS["accidentFree"] if accident_free else 0

    ccb = True  # Standard on all 812 Superfasts
    ccb_score = SCORING_WEIGHTS["carbonCeramicBrakes"]

    suspension_lift = has_option("front lift", "suspension lift", "front axle lift", "manettino lift")
    lift_score = SCORING_WEIGHTS["suspensionLift"] if suspension_lift else 0

    atelier = has_option("atelier")
    atelier_score = SCORING_WEIGHTS["atelierCar"] if atelier else 0

    carbon_pack = has_option("carbon pack", "carbon fibre pack", "carbon fiber pack", "carbon interior")
    carbon_score = SCORING_WEIGHTS["carbonPack"] if carbon_pack else 0

    daytona_seats = has_option("daytona seat", "racing seat", "carbon seat")
    daytona_score = SCORING_WEIGHTS["daytonaSeats"] if daytona_seats else 0

    # ── Total Score ───────────────────────────────────────────────────────────
    total_score = (
        gpf_score + mileage_score + colour_score + owner_score +
        service_score + price_score + accident_score + ccb_score +
        lift_score + atelier_score + carbon_score + daytona_score
    )

    # ── Key Strengths / Weaknesses ────────────────────────────────────────────
    strengths = ["Ferrari Approved certified", "Full Ferrari service history", "Carbon Ceramic Brakes (standard)"]
    weaknesses = []

    if gpf_status == "none":
        strengths.append("Pre-GPF — original exhaust note preserved")
    if tier == "special":
        strengths.append(f"Rare special-order colour: {colour}")
    elif tier == "desirable":
        strengths.append(f"Desirable colour: {colour}")
    if suspension_lift:
        strengths.append("Front axle lift fitted — practical for daily use")
    if atelier:
        strengths.append("Atelier bespoke specification")
    if daytona_seats:
        strengths.append("Daytona racing seats")
    if carbon_pack:
        strengths.append("Carbon fibre pack")
    if mileage <= 5000:
        strengths.append(f"Low mileage: {mileage:,} miles")

    if gpf_status == "fitted":
        weaknesses.append("GPF fitted — reduced exhaust character")
    if mileage > 15000:
        weaknesses.append(f"Higher mileage: {mileage:,} miles")
    if tier == "standard":
        weaknesses.append(f"Standard colour ({colour}) — lower resale premium")
    if variance < 0:
        weaknesses.append(f"Priced above IIV by £{abs(variance):,}")
    if owner_count > 1:
        weaknesses.append(f"{owner_count} previous owners")

    # Determine interior from equipment list
    interior = "Cuoio"  # Default FA interior
    for e in equipment:
        el = e.lower()
        if "cuoio" in el:
            interior = "Cuoio"
            break
        elif "nero" in el and "interior" in el:
            interior = "Nero"
            break
        elif "rosso" in el and "interior" in el:
            interior = "Rosso Ferrari"
            break
        elif "blu" in el and "interior" in el:
            interior = "Blu"
            break
        elif "beige" in el:
            interior = "Beige"
            break

    return {
        "gpfStatus": gpf_status,
        "ownerCount": owner_count,
        "serviceHistory": "full-ferrari",
        "accidentHistory": not accident_free,
        "ccb": ccb,
        "suspensionLift": suspension_lift,
        "atelierCar": atelier,
        "carbonPack": carbon_pack,
        "daytonaSeats": daytona_seats,
        "interior": interior,
        "dealerType": "ferrari-approved",
        "dealer": "Ferrari Approved",
        "dataConfidence": "scraped" if equipment else "estimated",
        "iiv": iiv,
        "iivLow": iiv_low,
        "iivHigh": iiv_high,
        "priceVariance": variance,
        "priceVariancePct": variance_pct,
        "totalScore": total_score,
        "investmentVerdict": verdict,
        "keyStrengths": strengths[:5],
        "keyWeaknesses": weaknesses[:3],
        "colourCategory": tier,
        "scoresJson": {
            "gpf": gpf_score,
            "mileage": mileage_score,
            "colour": colour_score,
            "ownerHistory": owner_score,
            "serviceHistory": service_score,
            "price": price_score,
            "accidentFree": accident_score,
            "carbonCeramicBrakes": ccb_score,
            "suspensionLift": lift_score,
            "atelierCar": atelier_score,
            "carbonPack": carbon_score,
            "daytonaSeats": daytona_score,
        },
    }


async def _fetch_all_fa_ads_with_equipment() -> list[dict]:
    """
    Fetch ALL Ferrari Approved GB listings including full equipment data
    from the __NEXT_DATA__ JSON on each page.
    """
    from playwright.async_api import async_playwright

    all_ads = []
    seen_ids = set()

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

        # Page 1
        log.info("  Fetching FA page 1 (all GB listings with equipment data)")
        try:
            await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=45000)
            await page.wait_for_timeout(4000)
        except Exception as e:
            log.warning(f"  FA page 1 load error: {e}")
            await browser.close()
            return []

        page_data = await _extract_next_data(page)
        if not page_data:
            log.warning("  Could not extract __NEXT_DATA__ from FA page 1")
            await browser.close()
            return []

        ads = page_data.get("ads", [])
        pagination = page_data.get("pagination", {})
        total_pages = pagination.get("pages", 1)
        log.info(f"  FA: {pagination.get('total', 0)} total GB listings across {total_pages} pages")

        for ad in ads:
            if ad.get("id") not in seen_ids:
                seen_ids.add(ad.get("id"))
                all_ads.append(ad)

        # Pages 2..N
        for pl in range(1, total_pages):
            page_url = f"{BASE_URL}?pl={pl}"
            log.info(f"  FA page {pl + 1}/{total_pages}")
            try:
                await page.goto(page_url, wait_until="domcontentloaded", timeout=45000)
                await page.wait_for_timeout(3000)
            except Exception as e:
                log.warning(f"  FA page {pl + 1} load error: {e}")
                continue

            page_data = await _extract_next_data(page)
            if not page_data:
                continue

            for ad in page_data.get("ads", []):
                if ad.get("id") not in seen_ids:
                    seen_ids.add(ad.get("id"))
                    all_ads.append(ad)

        await browser.close()

    log.info(f"  Fetched {len(all_ads)} total FA GB ads with equipment data")
    return all_ads


async def _extract_next_data(page) -> dict | None:
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


def extract_equipment_from_ad(ad: dict) -> list[str]:
    """Extract the equipment/options list from an FA ad dict."""
    equipment = []

    # Try standard equipment fields
    for field in ["equipment", "options", "features", "accessories", "optionals"]:
        items = ad.get(field, [])
        if isinstance(items, list):
            for item in items:
                if isinstance(item, str):
                    equipment.append(item)
                elif isinstance(item, dict):
                    label = item.get("label") or item.get("name") or item.get("value") or ""
                    if label:
                        equipment.append(str(label))

    # Try overviewData for additional spec items
    for item in (ad.get("overviewData") or []):
        label = item.get("label") or ""
        value = item.get("value") or ""
        if label and value:
            equipment.append(f"{label}: {value}")

    # Try technicalData
    for item in (ad.get("technicalData") or []):
        label = item.get("label") or ""
        value = item.get("value") or ""
        if label and value:
            equipment.append(f"{label}: {value}")

    return equipment


def enrich_all_812_listings(model_key: str = "812-superfast") -> dict:
    """
    Main entry point: fetch all FA ads, filter for 812 Superfast,
    score each one, and return a dict of {listing_id: enrichment_data}.
    """
    sys.path.insert(0, os.path.dirname(__file__))
    from fa_playwright_scraper import _matches_model, _parse_fa_ad

    all_ads = asyncio.run(_fetch_all_fa_ads_with_equipment())

    results = {}
    for ad in all_ads:
        car_name = ad.get("carName", "")
        if not _matches_model(car_name, model_key):
            continue

        listing = _parse_fa_ad(ad, model_key)
        if not listing:
            continue

        equipment = extract_equipment_from_ad(ad)
        log.info(f"  Scoring {listing['id']} ({listing.get('colour')} {listing.get('year')}) — {len(equipment)} equipment items")
        if equipment:
            log.debug(f"    Equipment: {equipment[:5]}{'...' if len(equipment) > 5 else ''}")

        enrichment = score_listing(listing, equipment)
        enrichment["equipmentJson"] = equipment
        results[listing["id"]] = (listing, enrichment)

    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
    results = enrich_all_812_listings()
    for lid, (listing, enrichment) in results.items():
        print(f"\n{lid}")
        print(f"  Colour: {listing.get('colour')} | Year: {listing.get('year')} | Mileage: {listing.get('mileage'):,} mi | Price: £{listing.get('asking_price'):,}")
        print(f"  IIV: £{enrichment['iiv']:,} | Variance: £{enrichment['priceVariance']:,} | Score: {enrichment['totalScore']} | Verdict: {enrichment['investmentVerdict']}")
        print(f"  GPF: {enrichment['gpfStatus']} | Equipment items: {len(enrichment.get('equipmentJson', []))}")
        print(f"  Strengths: {enrichment['keyStrengths'][:2]}")

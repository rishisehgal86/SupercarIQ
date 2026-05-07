#!/usr/bin/env python3
"""
write_ts_from_db.py — Phase 4 of the Ferrari pipeline.

Reads all active car listings and their enriched details from the DB,
then regenerates the TypeScript data files in the web app's client/src/data/ directory.

This script is the bridge between the Python pipeline and the React frontend.
It produces one .ts file per model, plus updates cars.ts for the 812 Superfast.

Usage:
  python3 write_ts_from_db.py [--models 812-superfast,f8-tributo] [--dry-run]
"""

import argparse
import json
import logging
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse

import mysql.connector
from dotenv import load_dotenv

# ── Env ───────────────────────────────────────────────────────────────────────
PIPELINE_DIR = Path(__file__).parent
WEBAPP_DIR = PIPELINE_DIR.parent / "ferrari-812-report"
DATA_DIR = WEBAPP_DIR / "client" / "src" / "data"

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

# ── Model configuration ───────────────────────────────────────────────────────
MODEL_CONFIG = {
    "812-superfast": {
        "ts_file": "cars.ts",
        "make": "Ferrari",
        "model": "812 Superfast",
        "export_name": "CARS",
        "type_name": "CarSpec",
        "iiv_base": 235000,
    },
    "812-gts": {
        "ts_file": "ferrari812gts.ts",
        "make": "Ferrari",
        "model": "812 GTS",
        "export_name": "CARS_812GTS",
        "type_name": "GenericCarSpec",
        "iiv_base": 380000,
    },
    "f8-tributo": {
        "ts_file": "f8tributo.ts",
        "make": "Ferrari",
        "model": "F8 Tributo",
        "export_name": "CARS_F8",
        "type_name": "GenericCarSpec",
        "iiv_base": 220000,
    },
    "458-italia": {
        "ts_file": "ferrari458.ts",
        "make": "Ferrari",
        "model": "458 Italia",
        "export_name": "CARS_458",
        "type_name": "GenericCarSpec",
        "iiv_base": 130000,
    },
    "488-gtb": {
        "ts_file": "ferrari488.ts",
        "make": "Ferrari",
        "model": "488 GTB",
        "export_name": "CARS_488",
        "type_name": "GenericCarSpec",
        "iiv_base": 175000,
    },
    "california-t": {
        "ts_file": "ferrariCaliforniaT.ts",
        "make": "Ferrari",
        "model": "California T",
        "export_name": "CARS_CALIFORNIA_T",
        "type_name": "GenericCarSpec",
        "iiv_base": 90000,
    },
    "portofino": {
        "ts_file": "ferrariPortofino.ts",
        "make": "Ferrari",
        "model": "Portofino",
        "export_name": "CARS_PORTOFINO",
        "type_name": "GenericCarSpec",
        "iiv_base": 110000,
    },
    "roma": {
        "ts_file": "ferrariRoma.ts",
        "make": "Ferrari",
        "model": "Roma",
        "export_name": "CARS_ROMA",
        "type_name": "GenericCarSpec",
        "iiv_base": 180000,
    },
}

# ── Colour classification ─────────────────────────────────────────────────────
SPECIAL_COLOURS = [
    "tailor made", "atelier", "special order", "unique", "one-off",
    "tour de france", "giallo modena", "rosso corsa", "grigio silverstone",
    "bianco avus", "blu tour", "verde british", "verde mugello",
]
DESIRABLE_COLOURS = [
    "rosso ferrari", "grigio titanio", "blu corsa", "bianco cervino",
    "nero daytona", "argento nürburgring", "rosso maranello",
]

def classify_colour(colour: str) -> str:
    c = (colour or "").lower()
    if any(s in c for s in SPECIAL_COLOURS):
        return "special"
    if any(d in c for d in DESIRABLE_COLOURS):
        return "desirable"
    return "standard"

def classify_interior(interior: str) -> str:
    i = (interior or "").lower()
    if any(w in i for w in ["alcantara", "carbon", "contrast", "bicolore", "daytona"]):
        return "desirable"
    return "standard"

# ── Prediction model ──────────────────────────────────────────────────────────
def compute_predictions(iiv: int, total_score: float, gpf_status: str, model_key: str) -> dict:
    """Compute 5yr and 10yr price predictions based on IIV and score."""
    # Base appreciation rates (annual %)
    if gpf_status == "none":
        base_rate_5yr = 0.12  # 12% pa for pre-GPF
        base_rate_10yr = 0.10
    elif model_key in ["812-superfast", "812-gts"]:
        base_rate_5yr = 0.08
        base_rate_10yr = 0.07
    else:
        base_rate_5yr = 0.05
        base_rate_10yr = 0.04

    # Score modifier (higher score = better appreciation)
    score_mod = (total_score - 50) / 100  # -0.5 to +0.5

    adj_5yr = base_rate_5yr * (1 + score_mod * 0.3)
    adj_10yr = base_rate_10yr * (1 + score_mod * 0.3)

    base_2031 = int(iiv * (1 + adj_5yr) ** 5)
    base_2036 = int(iiv * (1 + adj_10yr) ** 10)

    return {
        "base2031": base_2031,
        "optimistic2031": int(base_2031 * 1.26),
        "pessimistic2031": int(base_2031 * 0.82),
        "base2036": base_2036,
        "optimistic2036": int(base_2036 * 1.59),
        "pessimistic2036": int(base_2036 * 0.78),
        "roi5yr": round((base_2031 / iiv - 1) * 100, 1),
        "roi10yr": round((base_2036 / iiv - 1) * 100, 1),
    }

# ── Checklist builder ─────────────────────────────────────────────────────────
def build_checklist(listing: dict, details: dict, equipment: list) -> dict:
    equip_lower = [e.lower() for e in (equipment or [])]
    gpf = details.get("gpfStatus", "none")
    return {
        "preGPF": True if gpf == "none" else ("borderline" if gpf == "borderline" else False),
        "suspensionLift": bool(details.get("suspensionLift")),
        "carbonSteeringWheel": any("carbon" in e and "steer" in e for e in equip_lower),
        "daytonaSeats": any("daytona" in e for e in equip_lower),
        "specialColour": classify_colour(listing.get("colour") or "") == "special",
        "carbonInteriorPack": (
            "full" if sum(1 for e in equip_lower if "carbon" in e and any(w in e for w in ["dash", "console", "door", "interior"])) >= 3
            else "partial" if any("carbon" in e for e in equip_lower)
            else "none"
        ),
        "carbonPack": bool(details.get("carbonPack")),
        "lowMileage": (listing.get("mileage") or 999999) < 10000,
        "ferrariApproved": details.get("dealerType") == "ferrari-approved",
        "atelierCommission": bool(details.get("atelierCar")),
        "singleOwner": (details.get("ownerCount") or 1) == 1,
        "fullFerrariServiceHistory": details.get("serviceHistory") == "full-ferrari",
        "cleanHpiAccidentFree": not bool(details.get("accidentHistory")),
        "carbonCeramicBrakes": bool(details.get("ccb")),
        "magnetorheologicalSuspension": any("magneride" in e or "magnetorheological" in e for e in equip_lower),
        "rearWheelSteering": any("rear wheel steer" in e or "4ws" in e for e in equip_lower),
        "telemetryKit": any("telemetry" in e for e in equip_lower),
        "climateStorageHistory": False,  # Not tracked in DB
        "trackPack": any("track pack" in e or "track-pack" in e for e in equip_lower),
    }

# ── Equipment categoriser ─────────────────────────────────────────────────────
EQUIPMENT_CATEGORIES = {
    "exterior": ["carbon", "wheel", "brake calliper", "mirror", "spoiler", "wing", "diffuser", "grille", "exhaust", "tailpipe"],
    "interior": ["seat", "alcantara", "leather", "stitch", "carpet", "trim", "headliner", "dashboard", "console"],
    "audio": ["audio", "sound", "speaker", "hi-fi", "jbl", "burmester", "subwoofer", "amplifier"],
    "performance": ["suspension", "lift", "magneride", "steering", "brake", "ccb", "track", "telemetry", "launch control"],
    "safety": ["camera", "surround view", "sensor", "parking", "blind spot", "lane", "collision"],
    "driversAssistance": ["apple carplay", "android auto", "navigation", "gps", "cruise control", "adaptive"],
    "illumination": ["led", "light", "headlight", "ambient", "illuminat"],
    "paint": ["paint", "colour", "metallic", "matte", "satin"],
}

def categorise_equipment(equipment: list) -> dict:
    result = {k: [] for k in EQUIPMENT_CATEGORIES}
    result["other"] = []
    result["addedExtras"] = []
    for item in (equipment or []):
        item_lower = item.lower()
        categorised = False
        for cat, keywords in EQUIPMENT_CATEGORIES.items():
            if any(kw in item_lower for kw in keywords):
                result[cat].append(item)
                categorised = True
                break
        if not categorised:
            result["other"].append(item)
    return result

# ── TypeScript value serialiser ───────────────────────────────────────────────
def ts_val(v) -> str:
    """Convert a Python value to its TypeScript literal representation."""
    if v is None:
        return "undefined"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, str):
        escaped = v.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\r", "")
        return f'"{escaped}"'
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        if not v:
            return "[]"
        items = ", ".join(ts_val(i) for i in v)
        return f"[{items}]"
    if isinstance(v, dict):
        pairs = ", ".join(f"{k}: {ts_val(vv)}" for k, vv in v.items())
        return f"{{ {pairs} }}"
    return f'"{v}"'

# ── Car entry builder ─────────────────────────────────────────────────────────
def build_car_entry(listing: dict, details: dict, rank: int, price_history: list) -> dict:
    """Build a complete car entry dict from DB rows."""
    equipment = parse_json(details.get("equipmentJson")) or []
    images = parse_json(details.get("imagesJson")) or []
    scores = parse_json(details.get("scoresJson")) or {}
    key_strengths = parse_json(details.get("keyStrengths")) or []
    key_weaknesses = parse_json(details.get("keyWeaknesses")) or []

    iiv = details.get("iiv") or 0
    total_score = details.get("totalScore") or 0
    gpf_status = details.get("gpfStatus") or "none"
    model_key = listing.get("modelKey", "812-superfast")

    predictions = compute_predictions(iiv, total_score, gpf_status, model_key)
    checklist = build_checklist(listing, details, equipment)
    equipment_cats = categorise_equipment(equipment)

    # Dealer type → warranty type mapping
    dealer_type = details.get("dealerType") or "general-dealer"
    if dealer_type == "ferrari-approved":
        warranty_type = "ferrari-approved"
    elif dealer_type == "independent-specialist":
        warranty_type = "dealer-warranty"
    else:
        warranty_type = "none"

    # Negotiation discount estimate
    if dealer_type == "ferrari-approved":
        neg_pct = 2.0
    elif dealer_type == "independent-specialist":
        neg_pct = 4.0
    else:
        neg_pct = 6.0

    asking_price = listing.get("askingPrice") or 0
    target_price = int(asking_price * (1 - neg_pct / 100)) if asking_price else 0

    return {
        "id": hash(listing["id"]) % 1000000,  # Numeric ID for legacy compat
        "modelKey": model_key,
        "rank": rank,
        "make": "Ferrari",
        "model": MODEL_CONFIG.get(model_key, {}).get("model", "Ferrari"),
        "dealer": details.get("dealer") or "",
        "dealerCity": "",
        "dealerUrl": listing.get("sourceUrl") or "",
        "autotraderUrl": listing.get("sourceUrl") or "",
        "dealerCarUrl": listing.get("sourceUrl") or "",
        "dealerOptions": equipment,
        "dealerType": dealer_type,
        "warrantyType": warranty_type,
        "firstSeen": listing.get("firstSeenDate").isoformat() if listing.get("firstSeenDate") else TODAY,
        "year": listing.get("year") or 2020,
        "mileage": listing.get("mileage") or 0,
        "askingPrice": asking_price,
        "colour": listing.get("colour") or "",
        "colourCategory": classify_colour(listing.get("colour") or ""),
        "interior": details.get("interior") or "",
        "interiorCategory": classify_interior(details.get("interior") or ""),
        "gpfStatus": gpf_status,
        "gpfYear": "",
        "atelierCar": bool(details.get("atelierCar")),
        "warrantyExpiry": "Unknown",
        "ownerCount": details.get("ownerCount") or 1,
        "serviceHistory": details.get("serviceHistory") or "unknown",
        "accidentHistory": bool(details.get("accidentHistory")),
        "carbonCeramicBrakes": bool(details.get("ccb")),
        "magnetorheologicalSuspension": any(
            "magneride" in e.lower() or "magnetorheological" in e.lower()
            for e in equipment
        ),
        "rearWheelSteering": any(
            "rear wheel steer" in e.lower() or "4ws" in e.lower()
            for e in equipment
        ),
        "trackPack": any("track pack" in e.lower() for e in equipment),
        "telemetryKit": any("telemetry" in e.lower() for e in equipment),
        "storageHistory": "unknown",
        "scores": {
            "gpf": scores.get("gpf", 5),
            "engineCondition": scores.get("engineCondition", 5),
            "ownerHistory": scores.get("ownerHistory", 5),
            "serviceHistory": scores.get("serviceHistory", 5),
            "accidentFree": scores.get("accidentFree", 5),
            "colour": scores.get("colour", 5),
            "interior": scores.get("interior", 5),
            "carbonPack": scores.get("carbonPack", 5),
            "seats": scores.get("seats", 5),
            "suspensionLift": scores.get("suspensionLift", 5),
            "carbonCeramicBrakes": scores.get("carbonCeramicBrakes", 5),
            "magnetorheological": scores.get("magnetorheological", 5),
            "rearWheelSteering": scores.get("rearWheelSteering", 5),
            "atelier": scores.get("atelier", 5),
            "trackPack": scores.get("trackPack", 5),
            "limitedEdition": scores.get("limitedEdition", 5),
            "mileage": scores.get("mileage", 5),
            "warranty": scores.get("warranty", 5),
            "price": scores.get("price", 5),
            "storageQuality": scores.get("storageQuality", 5),
        },
        "totalScore": total_score,
        "totalScoreNorm": total_score,
        "iiv": iiv,
        "iivLow": details.get("iivLow") or int(iiv * 0.92),
        "iivHigh": details.get("iivHigh") or int(iiv * 1.08),
        "iivConfidence": details.get("dataConfidence") or "estimated",
        "priceVariance": details.get("priceVariance") or 0,
        "priceVariancePct": details.get("priceVariancePct") or 0,
        "predictions": predictions,
        "checklist": checklist,
        "equipment": equipment_cats,
        "investmentVerdict": details.get("investmentVerdict") or "consider",
        "soldDate": listing.get("soldDate").isoformat() if listing.get("soldDate") else None,
        "soldNote": None,
        "negotiationDiscountPct": neg_pct,
        "targetPrice": target_price,
        "images": images,
        "listingUrl": listing.get("sourceUrl") or "",
        "listingSource": "ferrari-approved" if listing.get("source") == "ferrari-approved" else "autotrader",
        "lastVerified": listing.get("lastSeenDate").isoformat() if listing.get("lastSeenDate") else TODAY,
        "dataConfidence": details.get("dataConfidence") or "estimated",
        "priceHistory": price_history,
        "keyStrengths": key_strengths,
        "keyWeaknesses": key_weaknesses,
    }

# ── TS file generator ─────────────────────────────────────────────────────────
def generate_ts_for_model(model_key: str, cars: list, dry_run: bool = False) -> str:
    """Generate the full TypeScript file content for a model."""
    cfg = MODEL_CONFIG[model_key]
    export_name = cfg["export_name"]
    ts_file = cfg["ts_file"]
    model_display = cfg["model"]

    active_cars = [c for c in cars if not c.get("soldDate")]
    prices = [c["askingPrice"] for c in active_cars if c["askingPrice"]]

    lines = [
        f"// {model_display} UK Market Analysis Data",
        f"// Auto-generated by write_ts_from_db.py — {TODAY}",
        f"// DO NOT EDIT MANUALLY — changes will be overwritten on next pipeline run",
        f"",
    ]

    # For 812 Superfast, we preserve the existing type definitions and just update CARS
    if model_key == "812-superfast":
        # Read existing file to preserve type definitions
        existing_file = DATA_DIR / "cars.ts"
        if existing_file.exists():
            existing = existing_file.read_text()
            # Find the line where CARS array starts
            cars_start = existing.find("\nexport const CARS: CarSpec[] = [")
            if cars_start > 0:
                header = existing[:cars_start]
                lines = [header]
            else:
                lines = [existing.split("export const CARS")[0]]
    else:
        # For other models, generate a minimal type definition
        lines += [
            f"export interface GenericCarSpec {{",
            f"  id: number;",
            f"  modelKey: string;",
            f"  rank: number;",
            f"  make: string;",
            f"  model: string;",
            f"  dealer: string;",
            f"  dealerCity: string;",
            f"  dealerUrl: string;",
            f"  dealerType: \"ferrari-approved\" | \"independent-specialist\" | \"general-dealer\";",
            f"  warrantyType: \"ferrari-approved\" | \"dealer-warranty\" | \"third-party\" | \"none\";",
            f"  year: number;",
            f"  mileage: number;",
            f"  askingPrice: number;",
            f"  colour: string;",
            f"  colourCategory: \"special\" | \"desirable\" | \"standard\";",
            f"  interior: string;",
            f"  interiorCategory: \"desirable\" | \"standard\";",
            f"  gpfStatus: \"none\" | \"fitted\" | \"borderline\";",
            f"  atelierCar: boolean;",
            f"  ownerCount: number;",
            f"  serviceHistory: \"full-ferrari\" | \"partial\" | \"unknown\";",
            f"  accidentHistory: boolean;",
            f"  carbonCeramicBrakes: boolean;",
            f"  scores: Record<string, number>;",
            f"  totalScore: number;",
            f"  totalScoreNorm: number;",
            f"  iiv: number;",
            f"  iivLow: number;",
            f"  iivHigh: number;",
            f"  iivConfidence: string;",
            f"  priceVariance: number;",
            f"  priceVariancePct: number;",
            f"  predictions: Record<string, number>;",
            f"  checklist: Record<string, boolean | string>;",
            f"  equipment: Record<string, string[]>;",
            f"  investmentVerdict: \"strong-buy\" | \"buy\" | \"consider\" | \"avoid\";",
            f"  soldDate?: string;",
            f"  negotiationDiscountPct?: number;",
            f"  targetPrice?: number;",
            f"  images: string[];",
            f"  listingUrl?: string;",
            f"  listingSource?: string;",
            f"  lastVerified?: string;",
            f"  dataConfidence?: string;",
            f"  priceHistory?: {{ date: string; price: number }}[];",
            f"  keyStrengths?: string[];",
            f"  keyWeaknesses?: string[];",
            f"  firstSeen?: string;",
            f"  autotraderUrl?: string;",
            f"  dealerCarUrl?: string;",
            f"  dealerOptions?: string[];",
            f"}}",
            f"",
        ]

    # Generate CARS array
    type_name = cfg["type_name"]
    cars_lines = [f"export const {export_name}: {type_name}[] = ["]
    for car in cars:
        cars_lines.append("  {")
        for k, v in car.items():
            if v is None:
                continue
            cars_lines.append(f"    {k}: {ts_val(v)},")
        cars_lines.append("  },")
    cars_lines.append("];")
    cars_lines.append("")

    # Market stats
    cars_lines += [
        f"export const {export_name}_BY_RANK = [...{export_name}].sort((a, b) => a.rank - b.rank);",
        f"",
        f"export const {export_name}_MARKET_STATS = {{",
        f"  totalListings: {len(cars)},",
        f"  activeListings: {len(active_cars)},",
        f"  ferrariApprovedCount: {sum(1 for c in active_cars if c.get('dealerType') == 'ferrari-approved')},",
        f"  independentSpecialistCount: {sum(1 for c in active_cars if c.get('dealerType') == 'independent-specialist')},",
        f"  generalDealerCount: {sum(1 for c in active_cars if c.get('dealerType') == 'general-dealer')},",
        f"  priceRange: {{ min: {min(prices) if prices else 0}, max: {max(prices) if prices else 0} }},",
        f"  avgPrice: {int(sum(prices) / len(prices)) if prices else 0},",
        f"  avgMileage: {int(sum(c['mileage'] for c in active_cars if c.get('mileage')) / max(1, len([c for c in active_cars if c.get('mileage')])))},",
        f"  preGPFCount: {sum(1 for c in active_cars if c.get('gpfStatus') == 'none')},",
        f"  atelierCount: {sum(1 for c in active_cars if c.get('atelierCar'))},",
        f"  lastUpdated: \"{TODAY}\",",
        f"}};",
        f"",
    ]

    if isinstance(lines[0], str):
        return "\n".join(lines) + "\n" + "\n".join(cars_lines)
    else:
        # lines[0] is the full header string
        return lines[0] + "\n" + "\n".join(cars_lines)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Ferrari Pipeline — Write TypeScript from DB")
    parser.add_argument("--models", help="Comma-separated model keys to process (default: all)")
    parser.add_argument("--dry-run", action="store_true", help="Print what would happen without writing files")
    args = parser.parse_args()

    if args.models:
        models_to_process = [m.strip() for m in args.models.split(",")]
    else:
        models_to_process = list(MODEL_CONFIG.keys())

    conn = get_conn()
    cur = conn.cursor(dictionary=True)

    total_written = 0
    for model_key in models_to_process:
        if model_key not in MODEL_CONFIG:
            log.warning(f"Unknown model key: {model_key} — skipping")
            continue

        log.info(f"Processing model: {model_key}")

        # Fetch all listings for this model
        cur.execute("""
            SELECT l.*, d.*
            FROM car_listings l
            LEFT JOIN car_listing_details d ON d.listingId = l.id
            WHERE l.modelKey = %s
            ORDER BY d.totalScore DESC, l.askingPrice ASC
        """, (model_key,))
        rows = cur.fetchall()

        if not rows:
            log.warning(f"  No listings found for {model_key}")
            continue

        log.info(f"  Found {len(rows)} listing(s)")

        # Fetch price history for all listings
        listing_ids = [r["id"] for r in rows]
        price_history_map = {}
        if listing_ids:
            placeholders = ",".join(["%s"] * len(listing_ids))
            cur.execute(f"""
                SELECT listingId, price, recordedDate
                FROM car_price_snapshots_v2
                WHERE listingId IN ({placeholders})
                ORDER BY listingId, recordedDate ASC
            """, listing_ids)
            for ph_row in cur.fetchall():
                lid = ph_row["listingId"]
                if lid not in price_history_map:
                    price_history_map[lid] = []
                price_history_map[lid].append({
                    "date": ph_row["recordedDate"].isoformat() if ph_row["recordedDate"] else TODAY,
                    "price": ph_row["price"],
                })

        # Build car entries and assign ranks
        cars = []
        rank = 1
        for row in rows:
            listing = {
                "id": row["id"],
                "sourceUrl": row["sourceUrl"],
                "modelKey": row["modelKey"],
                "source": row["source"],
                "status": row["status"],
                "askingPrice": row["askingPrice"],
                "year": row["year"],
                "colour": row["colour"],
                "mileage": row["mileage"],
                "firstSeenDate": row["firstSeenDate"],
                "lastSeenDate": row["lastSeenDate"],
                "soldDate": row["soldDate"],
            }
            details = {
                "iiv": row.get("iiv"),
                "iivLow": row.get("iivLow"),
                "iivHigh": row.get("iivHigh"),
                "priceVariance": row.get("priceVariance"),
                "priceVariancePct": row.get("priceVariancePct"),
                "totalScore": row.get("totalScore"),
                "investmentVerdict": row.get("investmentVerdict"),
                "gpfStatus": row.get("gpfStatus"),
                "interior": row.get("interior"),
                "dealer": row.get("dealer"),
                "dealerType": row.get("dealerType"),
                "ownerCount": row.get("ownerCount"),
                "serviceHistory": row.get("serviceHistory"),
                "accidentHistory": row.get("accidentHistory"),
                "carbonPack": row.get("carbonPack"),
                "ccb": row.get("ccb"),
                "suspensionLift": row.get("suspensionLift"),
                "atelierCar": row.get("atelierCar"),
                "dataConfidence": row.get("dataConfidence"),
                "equipmentJson": row.get("equipmentJson"),
                "imagesJson": row.get("imagesJson"),
                "scoresJson": row.get("scoresJson"),
                "keyStrengths": row.get("keyStrengths"),
                "keyWeaknesses": row.get("keyWeaknesses"),
            }
            price_history = price_history_map.get(row["id"], [])
            car = build_car_entry(listing, details, rank, price_history)
            cars.append(car)
            if not listing.get("soldDate"):
                rank += 1

        # Generate TypeScript content
        ts_content = generate_ts_for_model(model_key, cars, dry_run=args.dry_run)

        if args.dry_run:
            log.info(f"  [DRY RUN] Would write {len(ts_content)} chars to {MODEL_CONFIG[model_key]['ts_file']}")
            log.info(f"  Active: {len([c for c in cars if not c.get('soldDate')])}, Sold: {len([c for c in cars if c.get('soldDate')])}")
        else:
            out_path = DATA_DIR / MODEL_CONFIG[model_key]["ts_file"]
            out_path.write_text(ts_content)
            log.info(f"  Written {len(ts_content):,} chars → {out_path}")
            total_written += 1

    conn.close()

    if not args.dry_run:
        log.info(f"Complete: {total_written} file(s) written")
    return 0


if __name__ == "__main__":
    sys.exit(main())

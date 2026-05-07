#!/usr/bin/env python3
"""
verify_equipment.py
───────────────────
LLM-powered equipment verification step.

For each active listing, this script:
1. Reads the car's raw equipment list, LLM spec JSON, and dealer description.
2. Loads the model spec registry (standard vs optional equipment).
3. Asks the LLM to verify which optional items are genuinely present,
   and flags any items that are standard (not optional) being misclassified.
4. Writes the verified equipment flags back to the DB as `verifiedEquipmentJson`.
5. Flags any discrepancies for manual review.

The output `verifiedEquipmentJson` is then used by:
  - write_ts_from_db.py (preferred over raw scraper detection)
  - recalculate_all_iiv.py (for accurate scoring)
  - generate_car_analysis.py (for accurate narrative)

Usage:
  python3 verify_equipment.py [--models 812-superfast] [--force] [--dry-run]
"""
import argparse
import json
import os
import sys
import time
import requests
import mysql.connector
from urllib.parse import urlparse

from model_spec_registry import (
    get_model_spec,
    get_standard_equipment,
    get_optional_equipment,
    get_scoring_overrides,
    get_detection_keywords,
    detect_equipment_from_list,
    get_supported_models,
)

# ── DB connection ─────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "")
LLM_API_URL = os.environ.get("BUILT_IN_FORGE_API_URL", "")
LLM_API_KEY = os.environ.get("BUILT_IN_FORGE_API_KEY", "")


def parse_db_url(url):
    p = urlparse(url)
    return dict(host=p.hostname, port=p.port or 3306, user=p.username,
                password=p.password, database=p.path.lstrip("/"))


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


# ── LLM call ─────────────────────────────────────────────────────────────────
# Schema uses a flat array of item results instead of dynamic object keys
# to avoid additionalProperties restrictions in strict JSON schema mode.
VERIFICATION_SCHEMA = {
    "type": "object",
    "properties": {
        "optional_equipment_results": {
            "type": "array",
            "description": "Verification result for each optional equipment item.",
            "items": {
                "type": "object",
                "properties": {
                    "field": {"type": "string", "description": "The field name from the optional equipment list."},
                    "present": {"type": "boolean", "description": "Whether this item is genuinely present on this specific car."},
                    "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
                    "evidence": {"type": "string", "description": "Quote or reference from the listing that confirms/denies presence. Empty string if no evidence."},
                    "notes": {"type": "string", "description": "Any caveats or ambiguities. Empty string if none."}
                },
                "required": ["field", "present", "confidence", "evidence", "notes"],
                "additionalProperties": False
            }
        },
        "misclassification_flags": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "field": {"type": "string"},
                    "issue": {"type": "string"},
                    "recommendation": {"type": "string"}
                },
                "required": ["field", "issue", "recommendation"],
                "additionalProperties": False
            },
            "description": "Any items that appear to be misclassified (e.g., standard items being treated as optional, or optional items being falsely detected)."
        },
        "overall_confidence": {
            "type": "string",
            "enum": ["high", "medium", "low"],
            "description": "Overall confidence in the equipment verification for this listing."
        },
        "verification_notes": {
            "type": "string",
            "description": "Any important notes about the equipment verification for this car."
        }
    },
    "required": ["optional_equipment_results", "misclassification_flags", "overall_confidence", "verification_notes"],
    "additionalProperties": False
}


def call_llm(messages: list, schema: dict, retries: int = 3) -> dict | None:
    """Call the LLM with a structured output schema."""
    for attempt in range(retries):
        try:
            resp = requests.post(
                LLM_API_URL.rstrip("/") + "/v1/chat/completions",
                headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
                json={
                    "messages": messages,
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "equipment_verification",
                            "strict": True,
                            "schema": schema
                        }
                    }
                },
                timeout=60
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            print(f"  LLM attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(3 * (attempt + 1))
    return None


def build_verification_prompt(listing: dict, detail: dict, model_key: str) -> list:
    """Build the LLM prompt for equipment verification."""
    spec = get_model_spec(model_key)
    standard = get_standard_equipment(model_key)
    optional = get_optional_equipment(model_key)

    equipment = parse_json(detail.get("equipmentJson")) or []
    llm_spec = parse_json(detail.get("llmSpecJson")) or {}

    # Flatten equipment list
    if isinstance(equipment, dict):
        eq_flat = []
        for cat, items in equipment.items():
            if isinstance(items, list):
                eq_flat.extend(items)
            elif isinstance(items, str):
                eq_flat.append(items)
    else:
        eq_flat = equipment

    # Build the system prompt
    system_prompt = f"""You are a Ferrari specialist with deep knowledge of factory specifications and options.
Your task is to verify the equipment on a specific car listing, using the official factory specification as your reference.

CRITICAL RULES:
1. Standard equipment is ALWAYS present on every {model_key} — never mark it as absent.
2. Optional equipment must be verified from the listing evidence (equipment list, dealer description, LLM spec).
3. Do NOT infer optional equipment from general knowledge — only confirm if there is specific evidence in the listing.
4. If evidence is ambiguous, set confidence to "low" and explain in notes.
5. Flag any misclassifications (e.g., standard items being listed as optional extras by the dealer).

FACTORY STANDARD EQUIPMENT for {model_key} (always present, never optional):
{json.dumps({k: v for k, v in standard.items()}, indent=2)}

OPTIONAL EQUIPMENT for {model_key} (must be verified from listing evidence):
{json.dumps({k: {"label": v["label"], "note": v.get("note", "")} for k, v in optional.items()}, indent=2)}
"""

    # Build the user prompt
    user_prompt = f"""Please verify the equipment for this specific car listing:

CAR: {listing.get('year', 'Unknown')} Ferrari {model_key} — {listing.get('colour', 'Unknown')}
ASKING PRICE: £{int(listing.get('askingPrice') or 0):,}
MILEAGE: {int(listing.get('mileage') or 0):,} miles
DEALER: {detail.get('dealer', 'Unknown')}

EQUIPMENT LIST FROM LISTING:
{json.dumps(eq_flat, indent=2)}

LLM SPEC EXTRACTION:
{json.dumps(llm_spec, indent=2)}

    DEALER DESCRIPTION (if available):
{detail.get('description', 'Not available')[:2000] if detail.get('description') else 'Not available'}

For each optional equipment item, determine if it is genuinely present on this specific car.
For each standard equipment item, confirm it is present (it should always be).
Flag any misclassifications or issues you notice.
"""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]


def verify_listing(listing: dict, detail: dict, model_key: str, dry_run: bool = False) -> dict | None:
    """Run LLM verification for a single listing."""
    listing_id = listing["id"]
    colour = listing.get("colour", "Unknown")
    year = listing.get("year", "Unknown")
    print(f"  Verifying #{listing_id}: {year} {colour}...")

    messages = build_verification_prompt(listing, detail, model_key)
    result = call_llm(messages, VERIFICATION_SCHEMA)

    if result is None:
        print(f"    ✗ LLM verification failed for #{listing_id}")
        return None

    # Log any misclassification flags
    flags = result.get("misclassification_flags", [])
    if flags:
        print(f"    ⚠ {len(flags)} misclassification flag(s):")
        for flag in flags:
            print(f"      - {flag['field']}: {flag['issue']}")

    confidence = result.get("overall_confidence", "low")
    print(f"    ✓ Verified (confidence: {confidence})")

    return result


def apply_overrides_to_verified(verified: dict, model_key: str) -> dict:
    """Apply scoring overrides from registry to the verified equipment dict.
    Standard items are always forced to True regardless of LLM output.
    """
    overrides = get_scoring_overrides(model_key)
    # New schema: optional_equipment_results is an array of {field, present, ...}
    optional_results = verified.get("optional_equipment_results", [])

    # Build a flat dict of field → bool for use by write_ts_from_db.py
    flat = {}

    # Standard equipment: always True
    for field in get_standard_equipment(model_key):
        flat[field] = True

    # Optional equipment: use LLM verification result (array format)
    for item in optional_results:
        field = item.get("field")
        if field:
            flat[field] = item.get("present", False)

    # Apply scoring overrides (belt and braces)
    for field, value in overrides.items():
        flat[field] = value

    return flat


def main():
    parser = argparse.ArgumentParser(description="Verify equipment for active car listings using LLM")
    parser.add_argument("--models", nargs="+", default=None,
                        help="Model keys to process (default: all supported models)")
    parser.add_argument("--force", action="store_true",
                        help="Re-verify even if verifiedEquipmentJson already exists")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run verification but don't write to DB")
    parser.add_argument("--listing-id", type=str, default=None,
                        help="Verify a single listing by ID (string)")
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    if not LLM_API_URL or not LLM_API_KEY:
        print("ERROR: LLM API credentials not set")
        sys.exit(1)

    models_to_process = args.models or get_supported_models()
    print(f"Processing models: {models_to_process}")

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)

    # Fetch active listings
    if args.listing_id:
        cursor.execute("""
            SELECT cl.id, cl.modelKey, cl.askingPrice, cl.mileage, cl.year, cl.colour
            FROM car_listings cl
            WHERE cl.id = %s AND cl.status = 'active'
        """, (args.listing_id,))
    else:
        placeholders = ",".join(["%s"] * len(models_to_process))
        cursor.execute(f"""
            SELECT cl.id, cl.modelKey, cl.askingPrice, cl.mileage, cl.year, cl.colour
            FROM car_listings cl
            JOIN car_listing_details cld ON cl.id = cld.listingId
            WHERE cl.status = 'active'
              AND cl.modelKey IN ({placeholders})
              {'AND (cld.verifiedEquipmentJson IS NULL OR cld.verifiedEquipmentJson = "null")' if not args.force else ''}
            ORDER BY cl.modelKey, cl.id
        """, models_to_process)

    listings = cursor.fetchall()
    print(f"Found {len(listings)} listings to verify\n")

    if not listings:
        print("No listings to verify. Use --force to re-verify all.")
        return

    verified_count = 0
    failed_count = 0

    for listing in listings:
        listing_id = listing["id"]
        model_key = listing["modelKey"]

        if model_key not in models_to_process:
            continue

        # Check if model is in registry
        if not get_model_spec(model_key):
            print(f"  ⚠ Model '{model_key}' not in registry — skipping #{listing_id}")
            print(f"    Add an entry to model_spec_registry.py first.")
            continue

        # Fetch detail row
        cursor.execute("""
            SELECT equipmentJson, llmSpecJson, dealer, description,
                   verifiedEquipmentJson
            FROM car_listing_details
            WHERE listingId = %s
        """, (listing_id,))
        detail_row = cursor.fetchone()

        if not detail_row:
            print(f"  ⚠ No detail row for #{listing_id} — skipping")
            continue

        # Skip if already verified and not forcing
        if not args.force and detail_row.get("verifiedEquipmentJson"):
            existing = parse_json(detail_row["verifiedEquipmentJson"])
            if existing and existing.get("overall_confidence"):
                print(f"  ↷ #{listing_id} already verified (confidence: {existing.get('overall_confidence')}) — skipping")
                continue

        # Run verification
        result = verify_listing(listing, detail_row, model_key, dry_run=args.dry_run)

        if result is None:
            failed_count += 1
            continue

        # Apply registry overrides to get the flat verified flags
        flat_flags = apply_overrides_to_verified(result, model_key)
        result["flat_equipment_flags"] = flat_flags

        if not args.dry_run:
            # Write back to DB
            cursor.execute("""
                UPDATE car_listing_details
                SET verifiedEquipmentJson = %s
                WHERE listingId = %s
            """, (json.dumps(result), listing_id))
            conn.commit()

        verified_count += 1
        time.sleep(1)  # Rate limiting

    cursor.close()
    conn.close()

    print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Done: {verified_count} verified, {failed_count} failed")


if __name__ == "__main__":
    main()

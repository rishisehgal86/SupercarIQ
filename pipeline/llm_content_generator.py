#!/usr/bin/env python3
"""
llm_content_generator.py — LLM-assisted content generation for SupercarIQ.

Generates per-model content using the LLM API:
  - Investment analysis (verdict, reasoning, value drivers/detractors, risks)
  - Price predictions (1yr, 3yr, 5yr with narrative)
  - Buyers guide (top 5 checks, red flags, best/worst spec)
  - Market context narrative
  - Scoring methodology narrative
  - Influencer sentiment (weekly refresh)

All content is model-isolated — no data crosses between models.
Content is stored in model_llm_content and influencer_sentiment tables.
"""

import os
import sys
import json
import logging
import requests
from datetime import datetime, date
from typing import Optional
from model_spec_registry import get_model_spec, get_active_models, get_supported_models

# Direct DB connection (used when HTTP API is unavailable)
def _get_direct_db_conn():
    """Return a direct MySQL connection using DATABASE_URL env var."""
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        return None
    try:
        import mysql.connector
        # Parse mysql://user:pass@host:port/db
        import re
        m = re.match(r'mysql(?:2)?://([^:]+):([^@]+)@([^:/]+):?(\d+)?/([^?]+)', db_url)
        if not m:
            return None
        user, password, host, port, database = m.groups()
        conn = mysql.connector.connect(
            host=host, port=int(port or 3306),
            user=user, password=password, database=database,
            ssl_ca=None, ssl_verify_cert=False, ssl_verify_identity=False,
        )
        return conn
    except Exception as e:
        logger.warning(f"Direct DB connection failed: {e}")
        return None

logger = logging.getLogger(__name__)

# ── LLM API Configuration ─────────────────────────────────────────────────────
LLM_API_URL = os.environ.get("BUILT_IN_FORGE_API_URL", "")
LLM_API_KEY = os.environ.get("BUILT_IN_FORGE_API_KEY", "")
DB_API_BASE = os.environ.get("DB_API_BASE", "http://localhost:3000")

SYSTEM_PROMPT = """You are SupercarIQ, an expert UK supercar investment analyst with deep knowledge of:
- Ferrari, Lamborghini, McLaren, Porsche and other supercar manufacturers
- UK supercar market dynamics, pricing trends, and collector preferences
- Vehicle specification analysis and option desirability
- Investment-grade vehicle assessment methodology

Your analysis is:
- Rigorous, data-driven, and honest (including negative assessments when warranted)
- Specific to the UK market
- Based on deep knowledge of each model's production history, rarity, and collector appeal
- Never generic — always model-specific with concrete evidence

You NEVER produce generic content. Every analysis is tailored to the specific model."""


def call_llm(messages: list[dict], response_format: Optional[dict] = None) -> str:
    """Call the LLM API and return the response text."""
    if not LLM_API_URL or not LLM_API_KEY:
        raise ValueError("LLM API credentials not configured (BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY)")

    payload = {
        "messages": messages,
        "temperature": 0.7,
    }
    if response_format:
        payload["response_format"] = response_format

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    resp = requests.post(
        f"{LLM_API_URL}/v1/chat/completions",
        json=payload,
        headers=headers,
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def fetch_live_market_data(model_key: str) -> dict:
    """Fetch live market price data from the DB API for grounding LLM price predictions."""
    try:
        resp = requests.get(
            f"{DB_API_BASE}/api/scheduled/market-summary/{model_key}",
            timeout=15,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        logger.warning(f"Could not fetch live market data for {model_key}: {e}")
    return {}


def generate_investment_analysis(model_key: str, spec: dict) -> dict:
    """Generate LLM investment analysis for a model, grounded in live market data."""
    make = spec["make"]
    model = spec["model"]
    years = spec["years"]
    units = spec.get("total_units_produced", "unknown")
    engine = spec.get("engine_spec", "unknown")
    gpf_year = spec.get("gpf_year")
    gpf_note = f"GPF/OPF fitted from {gpf_year}" if gpf_year else "No GPF/OPF fitted (pre-emissions filter era)"
    weights = spec.get("scoring_overrides", {})

    # Fetch live market data to ground price predictions in reality
    market = fetch_live_market_data(model_key)
    live_price_context = ""
    if market:
        active = market.get("activeCount", 0)
        min_p = market.get("minPrice")
        max_p = market.get("maxPrice")
        avg_p = market.get("avgPrice")
        median_p = market.get("medianPrice")
        if min_p and max_p:
            live_price_context = f"""

LIVE UK MARKET DATA (as of {datetime.now().strftime('%B %Y')}) — USE THESE AS YOUR PRICE BASELINE:
- Active UK listings: {active}
- Price range: £{min_p:,.0f} – £{max_p:,.0f}
- Average asking price: £{avg_p:,.0f}
- Median asking price: £{median_p:,.0f}

Your price predictions MUST be anchored to this live data. Do not use historical peak prices.
State the current market range explicitly before predicting future values."""
    else:
        # Fallback: use known market data from research
        fallback_prices = {
            # Verified from AutoTrader UK, Ferrari Approved GB, Romans International, Amari — May 2026
            "488-pista": (
                "Current UK market (May 2026): £329,995–£649,995, median ~£399,950. "
                "Ferrari Approved GB: £429,995 (Spider only, no coupe currently listed). "
                "Romans International: £399,950–£449,950. "
                "Note: prices have softened ~15–20% from 2022–2023 peak of £500k–£700k. "
                "Assetto Fiorano spec commands £30,000–£50,000 premium over base spec."
            ),
            "sf90-stradale": (
                "Current UK market (May 2026): £274,830–£399,995 for standard coupe, £289,000–£420,000 for Assetto Fiorano. "
                "Ferrari Approved GB: £274,830–£309,000. "
                "Romans International: £299,950 (AF). "
                "AutoTrader: £289,995 (AF, 4,200 miles). "
                "Note: prices have softened significantly from 2022 peak of £450k+. "
                "Spider (SF90 Spider) commands £40,000–£80,000 premium over coupe."
            ),
            "huracan-sto": (
                "Current UK market (May 2026): £239,995–£319,995, median ~£265,000. "
                "Amari Supercars: £249,995–£279,995. "
                "The Classic Valuer average: £260,747. "
                "Note: STO commands significant premium over standard Huracán Evo (~£180,000). "
                "Cofango (front clam) condition is the primary value differentiator."
            ),
            "812-superfast": (
                "Current UK market (May 2026): £199,830–£289,995, average £232,519 (20 active UK listings). "
                "Ferrari Approved GB: 3 current listings. "
                "Note: prices have softened from 2022 peak of £300k+. "
                "Pre-GPF status and low mileage (<5,000 miles) command £260,000–£290,000. "
                "High-mileage or standard-spec examples trade at £200,000–£230,000."
            ),
            "812-gts": (
                "Current UK market (May 2026): £314,995–£449,995, average £347,465 (15 active UK listings). "
                "Note: GTS commands £80,000–£120,000 premium over Superfast coupe due to open-top body. "
                "Atelier spec and low mileage (<3,000 miles) command £400,000–£450,000."
            ),
        }
        if model_key in fallback_prices:
            live_price_context = f"""

UK MARKET CONTEXT (May 2026 research baseline — USE AS PRICE ANCHOR):
- {fallback_prices[model_key]}

Your price predictions MUST be anchored to this data. Do not use 2022-2023 peak prices."""

    key_facts_text = spec.get('key_investment_facts', '')
    key_facts_section = f"\nKEY INVESTMENT FACTS (verified research — MUST reference these in your analysis):\n{key_facts_text}" if key_facts_text else ""
    prompt = f"""Perform a comprehensive UK investment analysis for the {make} {model} ({years[0]}-{years[1]}).
Key facts:
- Engine: {engine}
- Total units produced: {units}
- Emissions filter status: {gpf_note}
- Original UK price: {spec.get('original_uk_price_gbp', 'unknown')}{key_facts_section}{live_price_context}

Provide your analysis in the following JSON format:
{{
  "investment_verdict": "strong_buy|buy|consider|avoid",
  "investment_headline": "One compelling sentence summarising the investment case",
  "investment_reasoning": "2-3 detailed paragraphs explaining the investment case with specific evidence",
  "value_drivers": ["driver1", "driver2", "driver3", "driver4", "driver5"],
  "value_detractors": ["detractor1", "detractor2", "detractor3"],
  "key_risks": ["risk1", "risk2", "risk3"],
  "price_prediction_1yr": "Specific price prediction for 1 year with percentage change and reasoning",
  "price_prediction_3yr": "Specific price prediction for 3 years with percentage change and reasoning",
  "price_prediction_5yr": "Specific price prediction for 5 years with percentage change and reasoning",
  "price_prediction_narrative": "Full 2-paragraph narrative on price trajectory, market forces, and collector demand",
  "price_prediction_confidence": "low|medium|high",
  "market_context_narrative": "2 paragraphs on current UK market conditions for this model",
  "peer_comparison_narrative": "1-2 paragraphs comparing to closest competitors/peers",
  "scoring_methodology_narrative": "1 paragraph explaining why the IIV scoring weights are set as they are for this specific model"
}}

Be specific, honest, and model-specific. Do not produce generic content."""

    response_format = {
        "type": "json_schema",
        "json_schema": {
            "name": "investment_analysis",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "investment_verdict": {"type": "string"},
                    "investment_headline": {"type": "string"},
                    "investment_reasoning": {"type": "string"},
                    "value_drivers": {"type": "array", "items": {"type": "string"}},
                    "value_detractors": {"type": "array", "items": {"type": "string"}},
                    "key_risks": {"type": "array", "items": {"type": "string"}},
                    "price_prediction_1yr": {"type": "string"},
                    "price_prediction_3yr": {"type": "string"},
                    "price_prediction_5yr": {"type": "string"},
                    "price_prediction_narrative": {"type": "string"},
                    "price_prediction_confidence": {"type": "string"},
                    "market_context_narrative": {"type": "string"},
                    "peer_comparison_narrative": {"type": "string"},
                    "scoring_methodology_narrative": {"type": "string"},
                },
                "required": [
                    "investment_verdict", "investment_headline", "investment_reasoning",
                    "value_drivers", "value_detractors", "key_risks",
                    "price_prediction_1yr", "price_prediction_3yr", "price_prediction_5yr",
                    "price_prediction_narrative", "price_prediction_confidence",
                    "market_context_narrative", "peer_comparison_narrative",
                    "scoring_methodology_narrative",
                ],
                "additionalProperties": False,
            },
        },
    }

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    raw = call_llm(messages, response_format)
    return json.loads(raw)


def generate_buyers_guide(model_key: str, spec: dict) -> dict:
    """Generate LLM buyers guide for a model."""
    make = spec["make"]
    model = spec["model"]
    years = spec["years"]
    gpf_year = spec.get("gpf_year")

    # Build optional equipment context
    optional_eq = spec.get("optional_equipment", {})
    high_value_options = [
        v["label"] for k, v in optional_eq.items()
        if v.get("iiv_relevant", False)
    ][:8]

    prompt = f"""Write a comprehensive buyers guide for the {make} {model} ({years[0]}-{years[1]}) for UK buyers.

Key context:
- GPF status: {"GPF fitted from " + str(gpf_year) if gpf_year else "No GPF — pre-emissions filter era"}
- Most valuable optional extras: {', '.join(high_value_options)}

Provide in JSON format:
{{
  "top_5_checks": ["check1", "check2", "check3", "check4", "check5"],
  "red_flags": ["flag1", "flag2", "flag3", "flag4", "flag5"],
  "best_spec": "Detailed description of the ideal investment specification",
  "worst_spec": "Description of specifications to avoid and why"
}}

Be specific to this model. Include model-specific known issues, common problems, and what separates a great example from a poor one."""

    response_format = {
        "type": "json_schema",
        "json_schema": {
            "name": "buyers_guide",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "top_5_checks": {"type": "array", "items": {"type": "string"}},
                    "red_flags": {"type": "array", "items": {"type": "string"}},
                    "best_spec": {"type": "string"},
                    "worst_spec": {"type": "string"},
                },
                "required": ["top_5_checks", "red_flags", "best_spec", "worst_spec"],
                "additionalProperties": False,
            },
        },
    }

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    raw = call_llm(messages, response_format)
    return json.loads(raw)


def generate_influencer_sentiment(model_key: str, spec: dict) -> list[dict]:
    """Generate LLM-researched influencer sentiment entries for a model."""
    make = spec["make"]
    model = spec["model"]
    years = spec["years"]

    prompt = f"""Research and compile influencer/media sentiment for the {make} {model} ({years[0]}-{years[1]}).

Find 6-8 real, well-known automotive influencers, YouTubers, journalists, or media outlets who have reviewed or commented on this car. Include a mix of positive, negative, and mixed sentiments where they genuinely exist.

For each entry provide:
{{
  "influencer_name": "Name of person or outlet",
  "platform": "YouTube|Instagram|X|TikTok|Automotive Media|Forum",
  "followers": "Approximate follower count (e.g. '2.5M')",
  "sentiment": "positive|negative|mixed|neutral",
  "sentiment_score": 0.8,  // -1.0 (very negative) to 1.0 (very positive)
  "key_themes": ["theme1", "theme2", "theme3"],
  "summary": "2-3 sentence summary of their specific views on this car",
  "source_url": "URL to their review/video/post if known"
}}

Return as a JSON array. Include ONLY real people/outlets with genuine documented opinions. Do not fabricate reviews."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    raw = call_llm(messages)
    # Parse the JSON array from the response
    try:
        # Try to extract JSON array from response
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except (json.JSONDecodeError, ValueError):
        pass
    return []


def upsert_model_llm_content(model_key: str, analysis: dict, buyers_guide: dict) -> bool:
    """Upsert LLM content to the database — tries HTTP API first, falls back to direct DB."""
    payload = {
        "modelKey": model_key,
        "investmentVerdict": analysis.get("investment_verdict", "consider"),
        "investmentHeadline": analysis.get("investment_headline"),
        "investmentReasoning": analysis.get("investment_reasoning"),
        "valueDriversJson": analysis.get("value_drivers", []),
        "valueDetractorsJson": analysis.get("value_detractors", []),
        "keyRisksJson": analysis.get("key_risks", []),
        "pricePrediction1yr": analysis.get("price_prediction_1yr"),
        "pricePrediction3yr": analysis.get("price_prediction_3yr"),
        "pricePrediction5yr": analysis.get("price_prediction_5yr"),
        "pricePredictionNarrative": analysis.get("price_prediction_narrative"),
        "pricePredictionConfidence": analysis.get("price_prediction_confidence", "medium"),
        "buyersGuideTop5Json": buyers_guide.get("top_5_checks", []),
        "buyersGuideRedFlagsJson": buyers_guide.get("red_flags", []),
        "bestSpec": buyers_guide.get("best_spec"),
        "worstSpec": buyers_guide.get("worst_spec"),
        "marketContextNarrative": analysis.get("market_context_narrative"),
        "peerComparisonNarrative": analysis.get("peer_comparison_narrative"),
        "scoringMethodologyNarrative": analysis.get("scoring_methodology_narrative"),
    }
    # Try HTTP API first (production path)
    try:
        resp = requests.post(
            f"{DB_API_BASE}/api/scheduled/upsert-model-content",
            json=payload,
            timeout=10,
        )
        # Must be JSON response — HTML means the Vite dev server intercepted the request
        content_type = resp.headers.get("Content-Type", "")
        if resp.ok and "application/json" in content_type:
            logger.info(f"Upserted {model_key} content via HTTP API")
            return True
        elif resp.ok:
            logger.warning(f"HTTP API returned non-JSON ({content_type[:40]}), falling back to direct DB")
    except Exception as e:
        logger.warning(f"HTTP API unavailable ({e}), falling back to direct DB")
    # Fallback: write directly to MySQL
    conn = _get_direct_db_conn()
    if not conn:
        logger.error(f"No DB connection available for {model_key}")
        return False
    try:
        cursor = conn.cursor()
        sql = """
            INSERT INTO model_llm_content (
                modelKey, investmentVerdict, investmentHeadline, investmentReasoning,
                valueDriversJson, valueDetractorsJson, keyRisksJson,
                pricePrediction1yr, pricePrediction3yr, pricePrediction5yr,
                pricePredictionNarrative, pricePredictionConfidence,
                buyersGuideTop5Json, buyersGuideRedFlagsJson, bestSpec, worstSpec,
                marketContextNarrative, peerComparisonNarrative, scoringMethodologyNarrative,
                llmModel, generatedAt, updatedAt
            ) VALUES (
                %s,%s,%s,%s, %s,%s,%s, %s,%s,%s, %s,%s, %s,%s,%s,%s, %s,%s,%s, %s,NOW(),NOW()
            )
            ON DUPLICATE KEY UPDATE
                investmentVerdict=VALUES(investmentVerdict),
                investmentHeadline=VALUES(investmentHeadline),
                investmentReasoning=VALUES(investmentReasoning),
                valueDriversJson=VALUES(valueDriversJson),
                valueDetractorsJson=VALUES(valueDetractorsJson),
                keyRisksJson=VALUES(keyRisksJson),
                pricePrediction1yr=VALUES(pricePrediction1yr),
                pricePrediction3yr=VALUES(pricePrediction3yr),
                pricePrediction5yr=VALUES(pricePrediction5yr),
                pricePredictionNarrative=VALUES(pricePredictionNarrative),
                pricePredictionConfidence=VALUES(pricePredictionConfidence),
                buyersGuideTop5Json=VALUES(buyersGuideTop5Json),
                buyersGuideRedFlagsJson=VALUES(buyersGuideRedFlagsJson),
                bestSpec=VALUES(bestSpec),
                worstSpec=VALUES(worstSpec),
                marketContextNarrative=VALUES(marketContextNarrative),
                peerComparisonNarrative=VALUES(peerComparisonNarrative),
                scoringMethodologyNarrative=VALUES(scoringMethodologyNarrative),
                llmModel=VALUES(llmModel),
                updatedAt=NOW()
        """
        values = (
            payload["modelKey"],
            payload["investmentVerdict"],
            payload["investmentHeadline"],
            payload["investmentReasoning"],
            json.dumps(payload["valueDriversJson"]),
            json.dumps(payload["valueDetractorsJson"]),
            json.dumps(payload["keyRisksJson"]),
            payload["pricePrediction1yr"],
            payload["pricePrediction3yr"],
            payload["pricePrediction5yr"],
            payload["pricePredictionNarrative"],
            payload["pricePredictionConfidence"],
            json.dumps(payload["buyersGuideTop5Json"]),
            json.dumps(payload["buyersGuideRedFlagsJson"]),
            payload["bestSpec"],
            payload["worstSpec"],
            payload["marketContextNarrative"],
            payload["peerComparisonNarrative"],
            payload["scoringMethodologyNarrative"],
            "built-in-llm",
        )
        cursor.execute(sql, values)
        conn.commit()
        cursor.close()
        conn.close()
        logger.info(f"Upserted {model_key} content directly to DB")
        return True
    except Exception as e:
        logger.error(f"Direct DB upsert failed for {model_key}: {e}")
        return Falsee


def upsert_influencer_sentiment(model_key: str, entries: list[dict]) -> int:
    """Upsert influencer sentiment entries to the database."""
    count = 0
    for entry in entries:
        payload = {
            "modelKey": model_key,
            "influencerName": entry.get("influencer_name", "Unknown"),
            "platform": entry.get("platform", "Unknown"),
            "followers": entry.get("followers"),
            "sentiment": entry.get("sentiment", "neutral"),
            "sentimentScore": entry.get("sentiment_score"),
            "keyThemesJson": entry.get("key_themes", []),
            "summary": entry.get("summary"),
            "sourceUrl": entry.get("source_url"),
        }
        try:
            resp = requests.post(
                f"{DB_API_BASE}/api/scheduled/upsert-sentiment",
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            count += 1
        except Exception as e:
            logger.error(f"Failed to upsert sentiment entry for {model_key}: {e}")
    return count


def generate_all_content_for_model(model_key: str, include_sentiment: bool = False) -> dict:
    """Generate and store all LLM content for a single model."""
    spec = get_model_spec(model_key)
    if not spec:
        logger.error(f"Model spec not found for {model_key}")
        return {"success": False, "error": "Model spec not found"}

    logger.info(f"Generating LLM content for {model_key}...")
    results = {}

    try:
        # Investment analysis + price predictions
        logger.info(f"  Generating investment analysis for {model_key}...")
        analysis = generate_investment_analysis(model_key, spec)
        results["analysis"] = analysis

        # Buyers guide
        logger.info(f"  Generating buyers guide for {model_key}...")
        buyers_guide = generate_buyers_guide(model_key, spec)
        results["buyers_guide"] = buyers_guide

        # Upsert to DB
        success = upsert_model_llm_content(model_key, analysis, buyers_guide)
        results["db_upsert"] = success

        # Influencer sentiment (optional, weekly refresh)
        if include_sentiment:
            logger.info(f"  Generating influencer sentiment for {model_key}...")
            sentiment_entries = generate_influencer_sentiment(model_key, spec)
            count = upsert_influencer_sentiment(model_key, sentiment_entries)
            results["sentiment_count"] = count

        logger.info(f"  Content generation complete for {model_key}")
        return {"success": True, **results}

    except Exception as e:
        logger.error(f"Content generation failed for {model_key}: {e}")
        return {"success": False, "error": str(e)}


def run_full_content_refresh(include_sentiment: bool = False) -> dict:
    """Run content generation for all active models."""
    models = get_active_models() if hasattr(__import__("model_spec_registry"), "get_active_models") else get_supported_models()
    results = {}
    for model_key in models:
        results[model_key] = generate_all_content_for_model(model_key, include_sentiment)
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    import argparse

    parser = argparse.ArgumentParser(description="Generate LLM content for SupercarIQ models")
    parser.add_argument("--model", help="Specific model key to generate content for")
    parser.add_argument("--all", action="store_true", help="Generate content for all models")
    parser.add_argument("--sentiment", action="store_true", help="Include influencer sentiment generation")
    # Railway cron aliases
    parser.add_argument("--mode", choices=["full", "sentiment", "analysis"], default="full",
                        help="Mode: full (analysis+sentiment), sentiment only, analysis only")
    parser.add_argument("--all-models", action="store_true", help="Alias for --all (used by Railway cron)")
    args = parser.parse_args()

    # Resolve aliases
    run_all = args.all or args.all_models
    include_sentiment = args.sentiment or args.mode == "sentiment"

    if args.mode == "sentiment" and run_all:
        # Weekly sentiment-only refresh for all models
        logger.info("Running weekly sentiment refresh for all models...")
        models = get_active_models() if hasattr(__import__("model_spec_registry"), "get_active_models") else get_supported_models()
        for mk in models:
            spec = get_model_spec(mk)
            if spec:
                entries = generate_influencer_sentiment(mk, spec)
                count = upsert_influencer_sentiment(mk, entries)
                logger.info(f"  {mk}: {count} sentiment entries upserted")
        sys.exit(0)

    if args.model:
        result = generate_all_content_for_model(args.model, include_sentiment=include_sentiment)
        print(json.dumps(result, indent=2, default=str))
    elif run_all:
        results = run_full_content_refresh(include_sentiment=include_sentiment)
        print(json.dumps(results, indent=2, default=str))
    else:
        print("Usage: python llm_content_generator.py --model 812-superfast [--sentiment]")
        print("       python llm_content_generator.py --all [--sentiment]")
        print("       python llm_content_generator.py --mode sentiment --all-models  (weekly cron)")
        sys.exit(1)

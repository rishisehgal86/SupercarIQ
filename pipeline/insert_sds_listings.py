#!/usr/bin/env python3
"""
Insert specialist dealer scraper results into the DB for the 3 new models.
This bridges the gap between specialist_dealer_scraper.py (which returns results
but doesn't write to DB) and the car_listings table.
"""
import logging
import os
import sys
from datetime import date
from dotenv import load_dotenv
import mysql.connector

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Import the scraper
sys.path.insert(0, os.path.dirname(__file__))
from specialist_dealer_scraper import scrape_all_specialist_dealers

MODELS = ["488-pista", "sf90-stradale", "huracan-sto"]

def get_db():
    url = os.environ["DATABASE_URL"]
    url = url.replace("mysql://", "").replace("mysql2://", "")
    user_pass, rest = url.split("@", 1)
    user, password = user_pass.split(":", 1)
    host_port, dbname = rest.split("/", 1)
    if "?" in dbname:
        dbname = dbname.split("?")[0]
    if ":" in host_port:
        host, port = host_port.split(":", 1)
        port = int(port)
    else:
        host, port = host_port, 3306
    return mysql.connector.connect(
        host=host, port=port, user=user, password=password,
        database=dbname, ssl_disabled=False
    )

def upsert_listing(conn, listing: dict):
    """Insert or update a specialist dealer listing in car_listings."""
    today = date.today().isoformat()
    cursor = conn.cursor()
    sql = """
        INSERT INTO car_listings
            (id, sourceUrl, modelKey, source, status, askingPrice, year, colour, mileage,
             firstSeenDate, lastSeenDate, consecutiveAbsentDays, daysOnMarket)
        VALUES
            (%s, %s, %s, %s, 'active', %s, %s, %s, %s, %s, %s, 0, 0)
        ON DUPLICATE KEY UPDATE
            status = 'active',
            askingPrice = VALUES(askingPrice),
            lastSeenDate = VALUES(lastSeenDate),
            consecutiveAbsentDays = 0
    """
    cursor.execute(sql, (
        listing["listing_id"],
        listing.get("source_url", ""),
        listing["model_key"],
        "specialist-dealer",
        listing.get("asking_price"),
        listing.get("year"),
        listing.get("colour", ""),
        listing.get("mileage"),
        today,
        today,
    ))
    conn.commit()
    cursor.close()
    return cursor.rowcount

def main():
    conn = get_db()
    total_inserted = 0
    total_updated = 0

    for model_key in MODELS:
        logger.info(f"\n=== Processing {model_key} ===")
        results = scrape_all_specialist_dealers(model_key)
        logger.info(f"  Found {len(results)} specialist dealer listings")

        for listing in results:
            if not listing.get("asking_price"):
                logger.warning(f"  SKIPPED (no price): {listing.get('listing_id')} — {listing.get('title')}")
                continue
            rows = upsert_listing(conn, listing)
            if rows == 1:
                total_inserted += 1
                logger.info(f"  INSERTED: {listing['listing_id']} — {listing.get('title')} £{listing.get('asking_price', 'POA')}")
            elif rows == 2:
                total_updated += 1
                logger.info(f"  UPDATED:  {listing['listing_id']} — {listing.get('title')}")
            else:
                logger.info(f"  UNCHANGED: {listing['listing_id']}")

    conn.close()
    logger.info(f"\n=== Done: {total_inserted} inserted, {total_updated} updated ===")

if __name__ == "__main__":
    main()

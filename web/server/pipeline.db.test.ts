/**
 * Validates that getPipelineDb() connects to Railway MySQL and
 * getAllActiveListings() returns real car listing data.
 */
import { describe, it, expect } from "vitest";
import { getPipelineDb, getAllActiveListings } from "./db";

describe("getPipelineDb", () => {
  it("should return a non-null db connection when RAILWAY_DATABASE_URL is set", async () => {
    if (!process.env.RAILWAY_DATABASE_URL) {
      console.warn("RAILWAY_DATABASE_URL not set — skipping live DB test");
      return;
    }
    const db = await getPipelineDb();
    expect(db).not.toBeNull();
  });

  it("getAllActiveListings should return at least 1 active listing", async () => {
    if (!process.env.RAILWAY_DATABASE_URL) {
      console.warn("RAILWAY_DATABASE_URL not set — skipping live DB test");
      return;
    }
    const listings = await getAllActiveListings();
    expect(Array.isArray(listings)).toBe(true);
    expect(listings.length).toBeGreaterThan(0);
  });

  it("active listings should have modelKey and askingPrice fields", async () => {
    if (!process.env.RAILWAY_DATABASE_URL) {
      console.warn("RAILWAY_DATABASE_URL not set — skipping live DB test");
      return;
    }
    const listings = await getAllActiveListings();
    if (listings.length === 0) return;
    const first = listings[0];
    expect(first).toHaveProperty("modelKey");
    expect(first).toHaveProperty("askingPrice");
    expect(typeof first.modelKey).toBe("string");
  });

  it("812-superfast listings should be enriched with totalScore", async () => {
    if (!process.env.RAILWAY_DATABASE_URL) {
      console.warn("RAILWAY_DATABASE_URL not set — skipping live DB test");
      return;
    }
    const listings = await getAllActiveListings();
    const sf = listings.filter(l => l.modelKey === "812-superfast");
    expect(sf.length).toBeGreaterThan(0);
    const enriched = sf.filter(l => l.details?.totalScore != null);
    expect(enriched.length).toBeGreaterThan(0);
  });
});

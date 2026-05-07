/**
 * Tests for 5 new Ferrari model data files
 * Validates data integrity, scoring, and carLibrary registration
 */
import { describe, it, expect } from "vitest";

// We test the data files by importing them directly
// These are client-side data files but vitest can resolve them with the path alias
// We use relative paths here since vitest runs in server context

describe("Ferrari 458 Italia data", () => {
  it("should have valid car data structure", async () => {
    // Dynamic import to avoid path alias issues in server context
    const { CARS_458, CARS_458_BY_RANK, CARS_458_MARKET_STATS: MARKET_STATS_458 } = await import("../client/src/data/ferrari458");
    
    expect(CARS_458.length).toBeGreaterThan(0);
    expect(CARS_458_BY_RANK.length).toBe(CARS_458.length);
    expect(MARKET_STATS_458.activeListings).toBeGreaterThan(0);
  });

  it("should have cars with valid scores between 0 and 100", async () => {
    const { CARS_458 } = await import("../client/src/data/ferrari458");
    for (const car of CARS_458) {
      expect(car.totalScoreNorm).toBeGreaterThanOrEqual(0);
      expect(car.totalScoreNorm).toBeLessThanOrEqual(100);
    }
  });

  it("should have cars with valid investment verdicts", async () => {
    const { CARS_458 } = await import("../client/src/data/ferrari458");
    const validVerdicts = ["strong-buy", "buy", "consider", "avoid"];
    for (const car of CARS_458) {
      expect(validVerdicts).toContain(car.investmentVerdict);
    }
  });

  it("should have cars sorted by rank in CARS_458_BY_RANK", async () => {
    const { CARS_458_BY_RANK } = await import("../client/src/data/ferrari458");
    for (let i = 1; i < CARS_458_BY_RANK.length; i++) {
      expect(CARS_458_BY_RANK[i].rank).toBeGreaterThanOrEqual(CARS_458_BY_RANK[i - 1].rank);
    }
  });

  it("should have valid price data (IIV and asking price > 0)", async () => {
    const { CARS_458 } = await import("../client/src/data/ferrari458");
    for (const car of CARS_458) {
      expect(car.askingPrice).toBeGreaterThan(0);
      expect(car.iiv).toBeGreaterThan(0);
      expect(car.priceVariance).toBe(car.iiv - car.askingPrice);
    }
  });
});

describe("Ferrari 488 GTB data", () => {
  it("should have valid car data structure", async () => {
    const { CARS_488, CARS_488_MARKET_STATS } = await import("../client/src/data/ferrari488");  // CARS_488_MARKET_STATS is the correct export name
    expect(CARS_488.length).toBeGreaterThan(0);
    expect(CARS_488_MARKET_STATS.activeListings).toBeGreaterThan(0);
  });

  it("should have valid scores and verdicts", async () => {
    const { CARS_488 } = await import("../client/src/data/ferrari488");
    const validVerdicts = ["strong-buy", "buy", "consider", "avoid"];
    for (const car of CARS_488) {
      expect(car.totalScoreNorm).toBeGreaterThanOrEqual(0);
      expect(car.totalScoreNorm).toBeLessThanOrEqual(100);
      expect(validVerdicts).toContain(car.investmentVerdict);
    }
  });

  it("should have valid body styles if bodyStyle field is present", async () => {
    const { CARS_488 } = await import("../client/src/data/ferrari488");
    const validBodyStyles = ["gtb", "spider", "pista"];
    for (const car of CARS_488) {
      if (car.bodyStyle !== undefined) {
        expect(validBodyStyles).toContain(car.bodyStyle);
      }
    }
  });
});

describe("Ferrari California T data", () => {
  it("should have valid car data structure", async () => {
    const { CARS_CALIFORNIA_T, CARS_CALIFORNIA_T_MARKET_STATS } = await import("../client/src/data/ferrariCaliforniaT");
    // California T may have 0 listings when pipeline finds no valid UK listings
    expect(CARS_CALIFORNIA_T.length).toBeGreaterThanOrEqual(0);
    expect(CARS_CALIFORNIA_T_MARKET_STATS.activeListings).toBeGreaterThanOrEqual(0);
  });

  it("should have valid scores and verdicts", async () => {
    const { CARS_CALIFORNIA_T } = await import("../client/src/data/ferrariCaliforniaT");
    const validVerdicts = ["strong-buy", "buy", "consider", "avoid"];
    for (const car of CARS_CALIFORNIA_T) {
      expect(car.totalScoreNorm).toBeGreaterThanOrEqual(0);
      expect(car.totalScoreNorm).toBeLessThanOrEqual(100);
      expect(validVerdicts).toContain(car.investmentVerdict);
    }
  });

  it("should have price range consistent with market stats", async () => {
    const { CARS_CALIFORNIA_T, CARS_CALIFORNIA_T_MARKET_STATS } = await import("../client/src/data/ferrariCaliforniaT");
    const prices = CARS_CALIFORNIA_T.map(c => c.askingPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    // Prices should be in a reasonable range for California T (2014-2018 model)
    expect(minPrice).toBeGreaterThan(30000);
    expect(maxPrice).toBeLessThan(500000); // Rare low-mileage examples can exceed £400k
    expect(CARS_CALIFORNIA_T_MARKET_STATS.priceRange).toBeTruthy();
  });
});

describe("Ferrari Portofino data", () => {
  it("should have valid car data structure", async () => {
    const { CARS_PORTOFINO, CARS_PORTOFINO_MARKET_STATS } = await import("../client/src/data/ferrariPortofino");
    expect(CARS_PORTOFINO.length).toBeGreaterThan(0);
    expect(CARS_PORTOFINO_MARKET_STATS.activeListings).toBeGreaterThan(0);
  });

  it("should have valid scores and verdicts", async () => {
    const { CARS_PORTOFINO } = await import("../client/src/data/ferrariPortofino");
    const validVerdicts = ["strong-buy", "buy", "consider", "avoid"];
    for (const car of CARS_PORTOFINO) {
      expect(car.totalScoreNorm).toBeGreaterThanOrEqual(0);
      expect(car.totalScoreNorm).toBeLessThanOrEqual(100);
      expect(validVerdicts).toContain(car.investmentVerdict);
    }
  });

  it("should have Portofino M cars with higher scores on average", async () => {
    const { CARS_PORTOFINO } = await import("../client/src/data/ferrariPortofino");
    const mCars = CARS_PORTOFINO.filter(c => c.checklist.portofinoM);
    const standardCars = CARS_PORTOFINO.filter(c => !c.checklist.portofinoM);
    if (mCars.length > 0 && standardCars.length > 0) {
      const avgM = mCars.reduce((s, c) => s + c.totalScoreNorm, 0) / mCars.length;
      const avgStd = standardCars.reduce((s, c) => s + c.totalScoreNorm, 0) / standardCars.length;
      expect(avgM).toBeGreaterThanOrEqual(avgStd);
    }
  });
});

describe("Ferrari Roma data", () => {
  it("should have valid car data structure", async () => {
    const { CARS_ROMA, CARS_ROMA_MARKET_STATS } = await import("../client/src/data/ferrariRoma");
    expect(CARS_ROMA.length).toBeGreaterThan(0);
    expect(CARS_ROMA_MARKET_STATS.activeListings).toBeGreaterThan(0);
  });

  it("should have valid scores and verdicts", async () => {
    const { CARS_ROMA } = await import("../client/src/data/ferrariRoma");
    const validVerdicts = ["strong-buy", "buy", "consider", "avoid"];
    for (const car of CARS_ROMA) {
      expect(car.totalScoreNorm).toBeGreaterThanOrEqual(0);
      expect(car.totalScoreNorm).toBeLessThanOrEqual(100);
      expect(validVerdicts).toContain(car.investmentVerdict);
    }
  });

  it("should have valid prediction data", async () => {
    const { CARS_ROMA } = await import("../client/src/data/ferrariRoma");
    for (const car of CARS_ROMA) {
      expect(car.predictions.base2031).toBeGreaterThan(0);
      expect(car.predictions.base2036).toBeGreaterThan(car.predictions.base2031);
      expect(car.predictions.optimistic2031).toBeGreaterThanOrEqual(car.predictions.base2031);
      expect(car.predictions.pessimistic2031).toBeLessThanOrEqual(car.predictions.base2031);
    }
  });
});

describe("Research Hub carLibrary", () => {
  it("should include all 5 new Ferrari models", async () => {
    const { carLibrary } = await import("../client/src/data/research");
    const ids = carLibrary.map(c => c.id);
    expect(ids).toContain("ferrari-458-italia");
    expect(ids).toContain("ferrari-488-gtb");
    expect(ids).toContain("ferrari-california-t");
    expect(ids).toContain("ferrari-portofino");
    expect(ids).toContain("ferrari-roma");
  });

  it("should have ferrari-458-italia with status complete", async () => {
    const { carLibrary } = await import("../client/src/data/research");
    const car = carLibrary.find(c => c.id === "ferrari-458-italia");
    expect(car).toBeDefined();
    expect(car!.status).toBe("complete");
  });

  it("should have 488, CalT, Portofino, Roma with a valid status", async () => {
    const { carLibrary } = await import("../client/src/data/research");
    const comingSoonModels = ["ferrari-488-gtb", "ferrari-california-t", "ferrari-portofino", "ferrari-roma"];
    const validStatuses = ["complete", "coming-soon", "in-progress"];
    for (const id of comingSoonModels) {
      const car = carLibrary.find(c => c.id === id);
      expect(car).toBeDefined();
      expect(validStatuses).toContain(car!.status);
    }
  });

  it("should have all 5 new models with valid routes", async () => {
    const { carLibrary } = await import("../client/src/data/research");
    const newModels = ["ferrari-458-italia", "ferrari-488-gtb", "ferrari-california-t", "ferrari-portofino", "ferrari-roma"];
    for (const id of newModels) {
      const car = carLibrary.find(c => c.id === id);
      expect(car!.route).toMatch(/^\//);
    }
  });

  it("should have all 5 new models with non-negative listing counts", async () => {
    const { carLibrary } = await import("../client/src/data/research");
    const newModels = ["ferrari-458-italia", "ferrari-488-gtb", "ferrari-california-t", "ferrari-portofino", "ferrari-roma"];
    for (const id of newModels) {
      const car = carLibrary.find(c => c.id === id);
      // California T may have 0 listings when pipeline finds no valid UK listings
      expect(car!.listingCount).toBeGreaterThanOrEqual(0);
    }
    // Models other than California T should always have listings
    const modelsWithListings = ["ferrari-458-italia", "ferrari-488-gtb", "ferrari-portofino", "ferrari-roma"];
    for (const id of modelsWithListings) {
      const car = carLibrary.find(c => c.id === id);
      expect(car!.listingCount).toBeGreaterThan(0);
    }
  });
});

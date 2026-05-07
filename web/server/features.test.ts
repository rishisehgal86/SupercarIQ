/**
 * Tests for watchlist, price history, and negotiation brief procedures.
 * These tests use mocked DB helpers so no real database connection is needed.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getWatchlistByUser: vi.fn().mockResolvedValue([]),
  addToWatchlist: vi.fn().mockResolvedValue({ id: 1, userId: 1, carId: 7, carModel: "812 Superfast", askingPriceAtAdd: 250000, notes: null, createdAt: new Date() }),
  removeFromWatchlist: vi.fn().mockResolvedValue(undefined),
  isInWatchlist: vi.fn().mockResolvedValue(false),
  getPriceHistory: vi.fn().mockResolvedValue([]),
  addPriceSnapshot: vi.fn().mockResolvedValue(undefined),
  getLatestPriceSnapshot: vi.fn().mockResolvedValue(null),
  getNegotiationBriefsByUser: vi.fn().mockResolvedValue([]),
  saveNegotiationBrief: vi.fn().mockResolvedValue({ id: 42, userId: 1, carId: 7, carModel: "812 Superfast", s3Key: "test.html", s3Url: "https://cdn.example.com/test.html", generatedAt: new Date() }),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock S3 storage ──────────────────────────────────────────────────────────
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "negotiation-briefs/1/812-7-123.html", url: "https://cdn.example.com/brief.html" }),
  storageGet: vi.fn().mockResolvedValue({ key: "test.html", url: "https://cdn.example.com/test.html" }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
  return { ctx };
}

// ─── Watchlist tests ──────────────────────────────────────────────────────────
describe("watchlist", () => {
  it("list returns empty array for new user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.watchlist.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("add inserts a car into the watchlist", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.watchlist.add({
      carId: 7,
      carModel: "812 Superfast",
      askingPriceAtAdd: 250000,
    });
    expect(result).toMatchObject({ carId: 7, carModel: "812 Superfast" });
  });

  it("remove returns success", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.watchlist.remove({ carId: 7, carModel: "812 Superfast" });
    expect(result).toEqual({ success: true });
  });

  it("check returns false when car is not in watchlist", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.watchlist.check({ carId: 7, carModel: "812 Superfast" });
    expect(result).toBe(false);
  });
});

// ─── Price history tests ──────────────────────────────────────────────────────
describe("priceHistory", () => {
  it("get returns empty array when no snapshots exist", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.priceHistory.get({ carId: 7, carModel: "812 Superfast" });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("addSnapshot requires authentication", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.priceHistory.addSnapshot({
        carId: 7,
        carModel: "812 Superfast",
        askingPrice: 250000,
        iiv: 265000,
        priceVariance: 15000,
      })
    ).rejects.toThrow();
  });

  it("addSnapshot succeeds for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.priceHistory.addSnapshot({
      carId: 7,
      carModel: "812 Superfast",
      askingPrice: 250000,
      iiv: 265000,
      priceVariance: 15000,
    });
    expect(result).toEqual({ success: true });
  });
});

// ─── Negotiation brief tests ──────────────────────────────────────────────────
describe("negotiation", () => {
  const sampleInput = {
    carId: 7,
    carModel: "812 Superfast",
    colour: "Argento Nurburgring",
    year: 2018,
    mileage: 5200,
    dealer: "Meridien Modena",
    dealerType: "ferrari-approved",
    askingPrice: 289950,
    iiv: 310000,
    priceVariance: 20050,
    targetPrice: 280000,
    negotiationDiscountPct: 3,
    investmentVerdict: "strong-buy",
    verdictReason: "Atelier commission, pre-GPF, single owner — the best 812 on the market.",
    keyStrengths: ["Atelier commission", "Pre-GPF", "Single owner"],
    keyWeaknesses: ["High asking price"],
    checklist: { preGPF: true, daytonaSeats: true, atelierCommission: true },
  };

  it("generate returns a URL and briefId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.negotiation.generate(sampleInput);
    expect(result).toHaveProperty("url");
    expect(typeof result.url).toBe("string");
    expect(result.url).toContain("https://");
  });

  it("generate requires authentication", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.negotiation.generate(sampleInput)).rejects.toThrow();
  });

  it("myBriefs returns empty array for new user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.negotiation.myBriefs();
    expect(Array.isArray(result)).toBe(true);
  });
});

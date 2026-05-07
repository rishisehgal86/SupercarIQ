/**
 * Tests for pipeline status tRPC endpoint and car detail gate logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-open-id",
    email: "admin@supercariq.com",
    name: "Admin User",
    loginMethod: "local",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { cookies: {} } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "user-open-id",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { cookies: {} } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { cookies: {} } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  };
}

// ─── Mock child_process and fs ──────────────────────────────────────────────

vi.mock("child_process", () => ({
  spawn: vi.fn().mockReturnValue({
    pid: 12345,
    unref: vi.fn(),
  }),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    openSync: vi.fn().mockReturnValue(3),
  };
});

// ─── Mock DB helper ───────────────────────────────────────────────────────────

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getPipelineStatus: vi.fn().mockResolvedValue({
      runs: [
        {
          id: 1,
          runType: "scheduled",
          status: "completed",
          newListingsFound: 3,
          listingsEnriched: 5,
          listingsMarkedSold: 1,
          queueDepth: 0,
          modelsScanned: ["812-superfast", "f8-tributo"],
          errorMessage: null,
          durationSeconds: 47,
          startedAt: new Date("2026-04-11T10:00:00Z"),
          completedAt: new Date("2026-04-11T10:00:47Z"),
        },
        {
          id: 2,
          runType: "manual",
          status: "failed",
          newListingsFound: 0,
          listingsEnriched: 0,
          listingsMarkedSold: 0,
          queueDepth: 2,
          modelsScanned: null,
          errorMessage: "Scraper timeout after 30s",
          durationSeconds: 30,
          startedAt: new Date("2026-04-10T22:00:00Z"),
          completedAt: null,
        },
      ],
      queueDepth: 0,
      activeListings: 95,
      pendingSoldListings: 3,
    }),
  };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("pipeline.status", () => {
  it("returns pipeline status for admin users", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pipeline.status();

    expect(result).toBeDefined();
    expect(result.runs).toHaveLength(2);
    expect(result.activeListings).toBe(95);
    expect(result.queueDepth).toBe(0);
    expect(result.pendingSoldListings).toBe(3);
  });

  it("returns last run details correctly", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pipeline.status();

    const lastRun = result.runs[0];
    expect(lastRun.status).toBe("completed");
    expect(lastRun.newListingsFound).toBe(3);
    expect(lastRun.listingsEnriched).toBe(5);
    expect(lastRun.durationSeconds).toBe(47);
  });

  it("returns failed run with error message", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pipeline.status();

    const failedRun = result.runs[1];
    expect(failedRun.status).toBe("failed");
    expect(failedRun.errorMessage).toBe("Scraper timeout after 30s");
  });

  it("throws Forbidden for non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.pipeline.status()).rejects.toThrow("Forbidden");
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.pipeline.status()).rejects.toThrow();
  });
});

describe("pipeline.triggerRun", () => {
  it("starts pipeline for admin users and returns pid", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pipeline.triggerRun({ phase: "all", dryRun: false });

    expect(result.started).toBe(true);
    expect(result.pid).toBe(12345);
    expect(result.phase).toBe("all");
    expect(result.dryRun).toBe(false);
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.logFile).toContain("smart_pipeline_admin_");
  });

  it("passes dry-run flag correctly", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pipeline.triggerRun({ phase: "1", dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.phase).toBe("1");
  });

  it("throws Forbidden for non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.pipeline.triggerRun({ phase: "all", dryRun: false })
    ).rejects.toThrow("Forbidden");
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.pipeline.triggerRun({ phase: "all", dryRun: false })
    ).rejects.toThrow();
  });
});

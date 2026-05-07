import { and, eq, desc, asc, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";
import {
  InsertUser, users,
  watchlist, InsertWatchlist,
  priceHistory, InsertPriceHistory,
  negotiationBriefs, InsertNegotiationBrief,
  carListings, carListingDetails, carPriceSnapshotsV2, marketDailyStats,
  reportLeads, InsertReportLead,
  pipelineRuns, InsertPipelineRun,
  modelLlmContent, InsertModelLlmContent, ModelLlmContent,
  influencerSentiment, InsertInfluencerSentiment, InfluencerSentiment,
  modelConfigs, InsertModelConfig, ModelConfig,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Railway MySQL proxy does not use SSL — ssl_disabled prevents connection drops.
      // For other environments (Manus TiDB), ssl_disabled is also safe as TiDB
      // accepts non-SSL connections on the internal network.
      const pool = createPool({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        enableKeepAlive: true,
        waitForConnections: true,
        connectionLimit: 10,
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Get a user by email (for local auth login). */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Get a user by ID (for session lookup). */
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/** Create a new local auth user. Returns the created user. */
export async function createUser(data: { email: string; name: string; passwordHash: string; loginMethod: string; role: 'user' | 'admin' }) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(users).values({
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    loginMethod: data.loginMethod,
    role: data.role,
    openId: null,
  });
  return getUserByEmail(data.email);
}

/** Update a user's lastSignedIn timestamp. */
export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export async function getWatchlistByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.createdAt));
}

export async function addToWatchlist(item: InsertWatchlist) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(watchlist)
    .where(and(eq(watchlist.userId, item.userId), eq(watchlist.carId, String(item.carId)), eq(watchlist.carModel, item.carModel)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(watchlist).values(item);
  const created = await db.select().from(watchlist)
    .where(and(eq(watchlist.userId, item.userId), eq(watchlist.carId, String(item.carId)), eq(watchlist.carModel, item.carModel)))
    .limit(1);
  return created[0];
}

export async function removeFromWatchlist(userId: number, carId: number | string, carModel: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.carId, String(carId)), eq(watchlist.carModel, carModel)));
}

export async function isInWatchlist(userId: number, carId: number | string, carModel: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.carId, String(carId)), eq(watchlist.carModel, carModel)))
    .limit(1);
  return result.length > 0;
}

// ─── Price History (legacy table) ────────────────────────────────────────────

export async function getPriceHistory(carId: number | string, carModel: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(priceHistory)
    .where(and(eq(priceHistory.carId, String(carId)), eq(priceHistory.carModel, carModel)))
    .orderBy(desc(priceHistory.snapshotDate))
    .limit(30);
}

export async function addPriceSnapshot(snapshot: InsertPriceHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(priceHistory).values(snapshot);
}

export async function getLatestPriceSnapshot(carId: number | string, carModel: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(priceHistory)
    .where(and(eq(priceHistory.carId, String(carId)), eq(priceHistory.carModel, carModel)))
    .orderBy(desc(priceHistory.snapshotDate))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── Negotiation Briefs ───────────────────────────────────────────────────────

export async function getNegotiationBriefsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(negotiationBriefs)
    .where(eq(negotiationBriefs.userId, userId))
    .orderBy(desc(negotiationBriefs.generatedAt));
}

export async function saveNegotiationBrief(brief: InsertNegotiationBrief) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(negotiationBriefs).values(brief);
  const created = await db.select().from(negotiationBriefs)
    .where(and(eq(negotiationBriefs.userId, brief.userId!), eq(negotiationBriefs.carId, String(brief.carId))))
    .orderBy(desc(negotiationBriefs.generatedAt))
    .limit(1);
  return created[0];
}

// ─── New Architecture: Car Listings ──────────────────────────────────────────

/** Get all active listings for a model, joined with their details, ordered by score desc. */
export async function getActiveListingsByModel(modelKey: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(carListings)
    .leftJoin(carListingDetails, eq(carListings.id, carListingDetails.listingId))
    .where(and(eq(carListings.modelKey, modelKey), eq(carListings.status, "active")))
    .orderBy(desc(carListingDetails.totalScore));
  return rows.map(r => ({ ...r.car_listings, details: r.car_listing_details }));
}

/** Get a single listing with its details by listing ID. */
export async function getListingById(listingId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(carListings)
    .leftJoin(carListingDetails, eq(carListings.id, carListingDetails.listingId))
    .where(eq(carListings.id, listingId))
    .limit(1);
  if (!rows.length) return null;
  return { ...rows[0].car_listings, details: rows[0].car_listing_details };
}

/** Get sold listings for a model (sold archive). */
export async function getSoldListingsByModel(modelKey: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(carListings)
    .leftJoin(carListingDetails, eq(carListings.id, carListingDetails.listingId))
    .where(and(eq(carListings.modelKey, modelKey), eq(carListings.status, "sold")))
    .orderBy(desc(carListings.soldDate))
    .limit(limit);
  return rows.map(r => ({ ...r.car_listings, details: r.car_listing_details }));
}

/** Get all sold listings across all models. */
export async function getAllSoldListings(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(carListings)
    .leftJoin(carListingDetails, eq(carListings.id, carListingDetails.listingId))
    .where(eq(carListings.status, "sold"))
    .orderBy(desc(carListings.soldDate))
    .limit(limit);
  return rows.map(r => ({ ...r.car_listings, details: r.car_listing_details }));
}

/** Get price history for a specific listing (car_price_snapshots_v2). */
export async function getListingPriceHistory(listingId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(carPriceSnapshotsV2)
    .where(eq(carPriceSnapshotsV2.listingId, listingId))
    .orderBy(asc(carPriceSnapshotsV2.recordedDate));
}

/** Get market daily stats for a model over the last N days. */
export async function getMarketDailyStats(modelKey: string, days = 90) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return db
    .select()
    .from(marketDailyStats)
    .where(and(
      eq(marketDailyStats.modelKey, modelKey),
      gte(marketDailyStats.statDate, cutoffStr as unknown as Date),
    ))
    .orderBy(asc(marketDailyStats.statDate));
}

/** Get the latest market stats for all models (for the landing page). */
export async function getLatestMarketStatsAllModels() {
  const db = await getDb();
  if (!db) return [];
  const subquery = db
    .select({
      modelKey: marketDailyStats.modelKey,
      latestDate: sql<string>`MAX(${marketDailyStats.statDate})`.as("latestDate"),
    })
    .from(marketDailyStats)
    .groupBy(marketDailyStats.modelKey)
    .as("latest");

  return db
    .select()
    .from(marketDailyStats)
    .innerJoin(
      subquery,
      and(
        eq(marketDailyStats.modelKey, subquery.modelKey),
        eq(marketDailyStats.statDate, subquery.latestDate),
      )
    )
    .orderBy(asc(marketDailyStats.modelKey));
}

/** Get aggregate stats for a model: active count, avg price, median price, best IIV gap. */
export async function getModelSummaryStats(modelKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      activeCount: sql<number>`COUNT(*)`,
      avgPrice: sql<number>`AVG(${carListings.askingPrice})`,
      minPrice: sql<number>`MIN(${carListings.askingPrice})`,
      maxPrice: sql<number>`MAX(${carListings.askingPrice})`,
      bestIivGap: sql<number>`MAX(${carListingDetails.priceVariance})`,
    })
    .from(carListings)
    .leftJoin(carListingDetails, eq(carListings.id, carListingDetails.listingId))
    .where(and(eq(carListings.modelKey, modelKey), eq(carListings.status, "active")));
  const stats = rows[0] ?? null;
  if (!stats || !stats.activeCount) return stats;
  // Calculate median price separately (MySQL lacks a native MEDIAN function)
  const priceRows = await db
    .select({ price: carListings.askingPrice })
    .from(carListings)
    .where(and(
      eq(carListings.modelKey, modelKey),
      eq(carListings.status, "active"),
      sql`${carListings.askingPrice} IS NOT NULL`,
    ))
    .orderBy(asc(carListings.askingPrice));
  const prices = priceRows.map(r => r.price).filter(Boolean) as number[];
  const mid = Math.floor(prices.length / 2);
  const medianPrice = prices.length === 0
    ? null
    : prices.length % 2 !== 0
      ? prices[mid]
      : Math.round((prices[mid - 1] + prices[mid]) / 2);
  return { ...stats, medianPrice };
}

/** Get the top-ranked active listing for a model (highest totalScore). */
export async function getTopListingForModel(modelKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(carListings)
    .leftJoin(carListingDetails, eq(carListings.id, carListingDetails.listingId))
    .where(and(eq(carListings.modelKey, modelKey), eq(carListings.status, "active")))
    .orderBy(desc(carListingDetails.totalScore))
    .limit(1);
  if (!rows.length) return null;
  return { ...rows[0].car_listings, details: rows[0].car_listing_details };
}

/** Get all active listings across all models (global overview). */
export async function getAllActiveListings() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(carListings)
    .leftJoin(carListingDetails, eq(carListings.id, carListingDetails.listingId))
    .where(eq(carListings.status, "active"))
    .orderBy(desc(carListingDetails.totalScore));
  return rows.map(r => ({ ...r.car_listings, details: r.car_listing_details }));
}

// ─── Report Leads ─────────────────────────────────────────────────────────────

/** Save a new report lead (email capture). Returns the inserted lead id. */
export async function saveReportLead(lead: Omit<InsertReportLead, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(reportLeads).values(lead);
  return { id: (result[0] as any).insertId as number };
}

/** Check if an email has already unlocked a specific model. */
export async function hasLeadForModel(email: string, modelKey: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: reportLeads.id })
    .from(reportLeads)
    .where(and(eq(reportLeads.email, email), eq(reportLeads.modelKey, modelKey)))
    .limit(1);
  return rows.length > 0;
}

/** Get all leads for admin view, newest first. */
export async function getAllLeads(limit = 500) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reportLeads)
    .orderBy(desc(reportLeads.createdAt))
    .limit(limit);
}

// ─── Pipeline Runs ────────────────────────────────────────────────────────────

/** Get pipeline status: last N runs + live queue depth from car_listings. */
export async function getPipelineStatus() {
  const db = await getDb();
  if (!db) return { runs: [], queueDepth: 0, activeListings: 0, pendingSoldListings: 0 };

  const [runs, queueRows, activeRows, pendingSoldRows] = await Promise.all([
    // Last 20 pipeline runs
    db.select().from(pipelineRuns).orderBy(desc(pipelineRuns.startedAt)).limit(20),
    // Queue depth = active listings without enrichment (no iiv set)
    db.select({ count: sql<number>`COUNT(*)` })
      .from(carListings)
      .leftJoin(carListingDetails, eq(carListings.id, carListingDetails.listingId))
      .where(and(eq(carListings.status, 'active'), sql`${carListingDetails.iiv} IS NULL`)),
    // Total active listings
    db.select({ count: sql<number>`COUNT(*)` })
      .from(carListings)
      .where(eq(carListings.status, 'active')),
    // Pending sold listings
    db.select({ count: sql<number>`COUNT(*)` })
      .from(carListings)
      .where(eq(carListings.status, 'pending_sold')),
  ]);

  return {
    runs,
    queueDepth: Number(queueRows[0]?.count ?? 0),
    activeListings: Number(activeRows[0]?.count ?? 0),
    pendingSoldListings: Number(pendingSoldRows[0]?.count ?? 0),
  };
}

/** Insert a new pipeline run record. Returns the inserted id. */
export async function insertPipelineRun(run: Omit<InsertPipelineRun, 'id' | 'startedAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(pipelineRuns).values(run);
  return { id: (result[0] as any).insertId as number };
}

/** Update a pipeline run (e.g., mark as completed). */
export async function updatePipelineRun(id: number, updates: Partial<InsertPipelineRun>) {
  const db = await getDb();
  if (!db) return;
  await db.update(pipelineRuns).set(updates).where(eq(pipelineRuns.id, id));
}

/** Store the log file path for a pipeline run. */
export async function setPipelineRunLogFile(id: number, logFilePath: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(pipelineRuns).set({ logFilePath }).where(eq(pipelineRuns.id, id));
}

// ─── Model LLM Content ────────────────────────────────────────────────────────

/** Get LLM-generated content for a specific model. */
export async function getModelLlmContent(modelKey: string): Promise<ModelLlmContent | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(modelLlmContent)
    .where(eq(modelLlmContent.modelKey, modelKey))
    .limit(1);
  return rows[0] ?? null;
}

/** Upsert LLM-generated content for a model. */
export async function upsertModelLlmContent(data: InsertModelLlmContent): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const existing = await db.select({ id: modelLlmContent.id })
    .from(modelLlmContent)
    .where(eq(modelLlmContent.modelKey, data.modelKey))
    .limit(1);
  if (existing.length > 0) {
    await db.update(modelLlmContent)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(modelLlmContent.modelKey, data.modelKey));
  } else {
    await db.insert(modelLlmContent).values(data);
  }
}

// ─── Influencer Sentiment ─────────────────────────────────────────────────────

/** Get all active influencer sentiment entries for a model. */
export async function getInfluencerSentiment(modelKey: string): Promise<InfluencerSentiment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(influencerSentiment)
    .where(and(
      eq(influencerSentiment.modelKey, modelKey),
      eq(influencerSentiment.isActive, true)
    ))
    .orderBy(desc(influencerSentiment.sentimentScore));
}

/** Upsert an influencer sentiment entry (by modelKey + influencerName). */
export async function upsertInfluencerSentiment(data: InsertInfluencerSentiment): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const existing = await db.select({ id: influencerSentiment.id })
    .from(influencerSentiment)
    .where(and(
      eq(influencerSentiment.modelKey, data.modelKey),
      eq(influencerSentiment.influencerName, data.influencerName)
    ))
    .limit(1);
  if (existing.length > 0) {
    await db.update(influencerSentiment)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(influencerSentiment.modelKey, data.modelKey),
        eq(influencerSentiment.influencerName, data.influencerName)
      ));
  } else {
    await db.insert(influencerSentiment).values(data);
  }
}

// ─── Model Configs ────────────────────────────────────────────────────────────

/** Get all active model configs (for the model directory). */
export async function getAllModelConfigs(): Promise<ModelConfig[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(modelConfigs)
    .where(eq(modelConfigs.isActive, true))
    .orderBy(asc(modelConfigs.sortOrder));
}

/** Get a single model config by key. */
export async function getModelConfig(modelKey: string): Promise<ModelConfig | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(modelConfigs)
    .where(eq(modelConfigs.modelKey, modelKey))
    .limit(1);
  return rows[0] ?? null;
}

/** Upsert a model config (seeded from Python registry). */
export async function upsertModelConfig(data: InsertModelConfig): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const existing = await db.select({ id: modelConfigs.id })
    .from(modelConfigs)
    .where(eq(modelConfigs.modelKey, data.modelKey))
    .limit(1);
  if (existing.length > 0) {
    await db.update(modelConfigs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(modelConfigs.modelKey, data.modelKey));
  } else {
    await db.insert(modelConfigs).values(data);
  }
}

import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, float, date, smallint, json } from "drizzle-orm/mysql-core";

/**
 * Core user table — local email/password auth.
 * openId kept for legacy compatibility but nullable.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // nullable — legacy Manus OAuth field
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 256 }), // bcrypt hash — null for legacy OAuth users
  loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Watchlist — users can save specific cars to track
 * carId is varchar(64) to support both numeric (812/F8) and string (458/488/etc.) IDs
 */
export const watchlist = mysqlTable("watchlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  carId: varchar("carId", { length: 64 }).notNull(),
  carModel: varchar("carModel", { length: 64 }).notNull(),
  askingPriceAtAdd: int("askingPriceAtAdd").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

/**
 * Price history — snapshot of asking prices at each data refresh
 * carId is varchar(64) to support both numeric and string IDs
 */
export const priceHistory = mysqlTable("priceHistory", {
  id: int("id").autoincrement().primaryKey(),
  carId: varchar("carId", { length: 64 }).notNull(),
  carModel: varchar("carModel", { length: 64 }).notNull(),
  askingPrice: int("askingPrice").notNull(),
  iiv: int("iiv").notNull(),
  priceVariance: int("priceVariance").notNull(),
  snapshotDate: timestamp("snapshotDate").defaultNow().notNull(),
  notes: text("notes"),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

/**
 * Negotiation briefs — generated PDFs stored with S3 reference
 * carId is varchar(64) to support both numeric and string IDs
 */
export const negotiationBriefs = mysqlTable("negotiationBriefs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  carId: varchar("carId", { length: 64 }).notNull(),
  carModel: varchar("carModel", { length: 64 }).notNull(),
  s3Key: varchar("s3Key", { length: 512 }),
  s3Url: varchar("s3Url", { length: 1024 }),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type NegotiationBrief = typeof negotiationBriefs.$inferSelect;
export type InsertNegotiationBrief = typeof negotiationBriefs.$inferInsert;

/**
 * car_listings — master registry. One row per car ever seen, never deleted.
 * status: active = currently listed, pending_sold = absent 1-2 days, sold = confirmed sold, archived = fully archived (no longer listed), incomplete_data = listing found but insufficient spec data to display publicly
 */
export const carListings = mysqlTable("car_listings", {
  id: varchar("id", { length: 64 }).primaryKey(), // e.g. "812-AT-170683"
  sourceUrl: varchar("sourceUrl", { length: 1024 }).notNull(),
  modelKey: varchar("modelKey", { length: 64 }).notNull(), // e.g. "812-superfast"
  source: varchar("source", { length: 32 }).notNull().default("autotrader"), // "autotrader" | "ferrari-approved"
  status: mysqlEnum("status", ["active", "pending_sold", "sold", "archived", "incomplete_data"]).notNull().default("active"),
  askingPrice: int("askingPrice").notNull(),
  year: smallint("year"),
  colour: varchar("colour", { length: 128 }),
  mileage: int("mileage"),
  firstSeenDate: date("firstSeenDate").notNull(),
  lastSeenDate: date("lastSeenDate").notNull(),
  soldDate: date("soldDate"),
  archivedAt: timestamp("archivedAt"), // set when status moves to 'archived'
  consecutiveAbsentDays: smallint("consecutiveAbsentDays").notNull().default(0),
  daysOnMarket: int("daysOnMarket"), // calculated on sold
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CarListing = typeof carListings.$inferSelect;
export type InsertCarListing = typeof carListings.$inferInsert;

/**
 * car_listing_details — full enriched spec for each car.
 * Written once when first discovered. Updated only if price changes.
 */
export const carListingDetails = mysqlTable("car_listing_details", {
  id: int("id").autoincrement().primaryKey(),
  listingId: varchar("listingId", { length: 64 }).notNull().unique(),
  iiv: int("iiv"),
  iivLow: int("iivLow"),
  iivHigh: int("iivHigh"),
  priceVariance: int("priceVariance"),
  priceVariancePct: float("priceVariancePct"),
  totalScore: float("totalScore"),
  rank: int("rank"),
  investmentVerdict: varchar("investmentVerdict", { length: 32 }), // "strong-buy"|"buy"|"consider"|"avoid"
  gpfStatus: varchar("gpfStatus", { length: 16 }), // "none"|"fitted"|"borderline"
  interior: varchar("interior", { length: 128 }),
  dealer: varchar("dealer", { length: 256 }),
  dealerType: varchar("dealerType", { length: 32 }),
  ownerCount: smallint("ownerCount"),
  serviceHistory: varchar("serviceHistory", { length: 64 }),
  accidentHistory: boolean("accidentHistory").default(false),
  carbonPack: boolean("carbonPack").default(false),
  ccb: boolean("ccb").default(false),
  suspensionLift: boolean("suspensionLift").default(false),
  atelierCar: boolean("atelierCar").default(false),
  magnetorheologicalSuspension: boolean("magnetorheologicalSuspension").default(false),
  rearWheelSteering: boolean("rearWheelSteering").default(false),
  trackPack: boolean("trackPack").default(false),
  limitedEdition: boolean("limitedEdition").default(false),
  seats: varchar("seats", { length: 32 }), // "2-seat" | "2+2"
  warrantyExpiry: varchar("warrantyExpiry", { length: 64 }),
  dealerLocation: varchar("dealerLocation", { length: 256 }),
  thumbnailUrl: varchar("thumbnailUrl", { length: 512 }), // primary listing image
  dataConfidence: varchar("dataConfidence", { length: 16 }).default("estimated"),
  equipmentJson: json("equipmentJson"), // string[]
  imagesJson: json("imagesJson"), // string[]
  scoresJson: json("scoresJson"), // Record<string, number>
  keyStrengths: json("keyStrengths"), // string[]
  keyWeaknesses: json("keyWeaknesses"), // string[]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CarListingDetail = typeof carListingDetails.$inferSelect;
export type InsertCarListingDetail = typeof carListingDetails.$inferInsert;

/**
 * car_price_snapshots_v2 — one row per price change event.
 * Enables per-listing price history charts.
 */
export const carPriceSnapshotsV2 = mysqlTable("car_price_snapshots_v2", {
  id: int("id").autoincrement().primaryKey(),
  listingId: varchar("listingId", { length: 64 }).notNull(),
  price: int("price").notNull(),
  changeAmount: int("changeAmount").default(0), // negative = price drop
  recordedDate: date("recordedDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CarPriceSnapshotV2 = typeof carPriceSnapshotsV2.$inferSelect;
export type InsertCarPriceSnapshotV2 = typeof carPriceSnapshotsV2.$inferInsert;

/**
 * market_daily_stats — one row per model per day.
 * Enables 90-day market trend charts (supply, avg price, new listings, sold count).
 */
export const marketDailyStats = mysqlTable("market_daily_stats", {
  id: int("id").autoincrement().primaryKey(),
  modelKey: varchar("modelKey", { length: 64 }).notNull(),
  statDate: date("statDate").notNull(),
  activeCount: smallint("activeCount").notNull().default(0),
  avgPrice: int("avgPrice"),
  medianPrice: int("medianPrice"),
  minPrice: int("minPrice"),
  maxPrice: int("maxPrice"),
  newListings: smallint("newListings").notNull().default(0),
  soldCount: smallint("soldCount").notNull().default(0),
  avgDaysOnMarket: float("avgDaysOnMarket"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MarketDailyStat = typeof marketDailyStats.$inferSelect;
export type InsertMarketDailyStat = typeof marketDailyStats.$inferInsert;

/**
 * report_leads — email capture for gated (non-812) vehicle reports.
 * Stores name, email, optional phone, and which car model they unlocked.
 */
export const reportLeads = mysqlTable("report_leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  modelKey: varchar("modelKey", { length: 64 }).notNull(), // e.g. "f8-tributo"
  modelLabel: varchar("modelLabel", { length: 128 }).notNull(), // e.g. "Ferrari F8 Tributo"
  source: varchar("source", { length: 64 }).default("report-gate"), // where they came from
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReportLead = typeof reportLeads.$inferSelect;
export type InsertReportLead = typeof reportLeads.$inferInsert;

/**
 * pipeline_runs — one row per pipeline execution.
 * Tracks when the smart pipeline last ran, what it found, and any errors.
 */
export const pipelineRuns = mysqlTable("pipeline_runs", {
  id: int("id").autoincrement().primaryKey(),
  runType: varchar("runType", { length: 32 }).notNull().default("scheduled"), // "scheduled" | "manual"
  status: mysqlEnum("status", ["running", "completed", "failed"]).notNull().default("running"),
  newListingsFound: smallint("newListingsFound").notNull().default(0),
  listingsEnriched: smallint("listingsEnriched").notNull().default(0),
  listingsMarkedSold: smallint("listingsMarkedSold").notNull().default(0),
  queueDepth: smallint("queueDepth").notNull().default(0),
  modelsScanned: json("modelsScanned"), // string[]
  errorMessage: text("errorMessage"),
  logFilePath: varchar("logFilePath", { length: 512 }),
  durationSeconds: int("durationSeconds"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type InsertPipelineRun = typeof pipelineRuns.$inferInsert;

/**
 * model_llm_content — LLM-generated per-model content, refreshed on schedule.
 * Stores investment analysis, price predictions, buyers guide, editorial copy.
 * One row per model. Upserted on each pipeline run.
 */
export const modelLlmContent = mysqlTable("model_llm_content", {
  id: int("id").autoincrement().primaryKey(),
  modelKey: varchar("modelKey", { length: 64 }).notNull().unique(),
  // Investment analysis
  investmentVerdict: varchar("investmentVerdict", { length: 32 }).notNull().default("consider"), // strong_buy|buy|consider|avoid
  investmentHeadline: text("investmentHeadline"), // short 1-line verdict
  investmentReasoning: text("investmentReasoning"), // 2-3 paragraph LLM analysis
  valueDriversJson: json("valueDriversJson").$type<string[]>(), // string[] — bullet points
  valueDetractorsJson: json("valueDetractorsJson").$type<string[]>(), // string[] — bullet points
  keyRisksJson: json("keyRisksJson").$type<string[]>(), // string[] — bullet points
  // Price predictions
  pricePrediction1yr: text("pricePrediction1yr"),
  pricePrediction3yr: text("pricePrediction3yr"),
  pricePrediction5yr: text("pricePrediction5yr"),
  pricePredictionNarrative: text("pricePredictionNarrative"), // full LLM narrative
  pricePredictionConfidence: varchar("pricePredictionConfidence", { length: 16 }).default("medium"), // low|medium|high
  // Buyers guide
  buyersGuideTop5Json: json("buyersGuideTop5Json").$type<string[]>(), // string[] — top 5 checks
  buyersGuideRedFlagsJson: json("buyersGuideRedFlagsJson").$type<string[]>(), // string[] — red flags
  bestSpec: text("bestSpec"),
  worstSpec: text("worstSpec"),
  // Market context
  marketContextNarrative: text("marketContextNarrative"),
  peerComparisonNarrative: text("peerComparisonNarrative"),
  // Scoring methodology narrative
  scoringMethodologyNarrative: text("scoringMethodologyNarrative"),
  // Meta
  llmModel: varchar("llmModel", { length: 64 }).default("gpt-4o"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ModelLlmContent = typeof modelLlmContent.$inferSelect;
export type InsertModelLlmContent = typeof modelLlmContent.$inferInsert;

/**
 * influencer_sentiment — per-model influencer/social media sentiment entries.
 * Refreshed weekly by the LLM pipeline.
 */
export const influencerSentiment = mysqlTable("influencer_sentiment", {
  id: int("id").autoincrement().primaryKey(),
  modelKey: varchar("modelKey", { length: 64 }).notNull(),
  influencerName: varchar("influencerName", { length: 128 }).notNull(),
  platform: varchar("platform", { length: 64 }).notNull(), // YouTube|Instagram|X|TikTok|Forum
  followers: varchar("followers", { length: 32 }),
  sentiment: varchar("sentiment", { length: 32 }).notNull(), // positive|negative|mixed|neutral
  sentimentScore: float("sentimentScore"), // -1.0 to 1.0
  keyThemesJson: json("keyThemesJson"), // string[]
  summary: text("summary"), // LLM-generated summary of their view
  sourceUrl: varchar("sourceUrl", { length: 512 }),
  publishedDate: date("publishedDate"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type InfluencerSentiment = typeof influencerSentiment.$inferSelect;
export type InsertInfluencerSentiment = typeof influencerSentiment.$inferInsert;

/**
 * model_configs — per-model configuration for multi-tenancy.
 * Stores IIV weights, colour maps, scoring metadata as JSON.
 * Seeded from model_spec_registry.py via the pipeline.
 */
export const modelConfigs = mysqlTable("model_configs", {
  id: int("id").autoincrement().primaryKey(),
  modelKey: varchar("modelKey", { length: 64 }).notNull().unique(),
  make: varchar("make", { length: 64 }).notNull(),
  model: varchar("model", { length: 128 }).notNull(),
  yearMin: smallint("yearMin").notNull(),
  yearMax: smallint("yearMax").notNull(),
  totalUnitsProduced: varchar("totalUnitsProduced", { length: 128 }),
  engineSpec: varchar("engineSpec", { length: 256 }),
  originalUkPriceGbp: varchar("originalUkPriceGbp", { length: 64 }),
  gpfYear: smallint("gpfYear"), // null = no GPF
  investmentVerdict: varchar("investmentVerdict", { length: 32 }).default("consider"),
  iivWeightsJson: json("iivWeightsJson"), // Record<string, number>
  colourDesirabilityJson: json("colourDesirabilityJson"), // ColourEntry[]
  standardEquipmentJson: json("standardEquipmentJson"), // string[]
  optionalEquipmentJson: json("optionalEquipmentJson"), // OptionalEquipment[]
  isPublic: boolean("isPublic").default(false).notNull(), // true = free, false = gated
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: smallint("sortOrder").default(0),
  heroImageUrl: varchar("heroImageUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ModelConfig = typeof modelConfigs.$inferSelect;
export type InsertModelConfig = typeof modelConfigs.$inferInsert;

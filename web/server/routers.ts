import { z } from "zod";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getWatchlistByUser,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  getPriceHistory,
  addPriceSnapshot,
  getNegotiationBriefsByUser,
  saveNegotiationBrief,
  // New architecture
  getActiveListingsByModel,
  getListingById,
  getSoldListingsByModel,
  getAllSoldListings,
  getListingPriceHistory,
  getMarketDailyStats,
  getLatestMarketStatsAllModels,
  getModelSummaryStats,
  getTopListingForModel,
  getAllActiveListings,
  saveReportLead,
  hasLeadForModel,
  getAllLeads,
  getPipelineStatus,
  setPipelineRunLogFile,
  insertPipelineRun,
  getModelLlmContent,
  upsertModelLlmContent,
  getInfluencerSentiment,
  upsertInfluencerSentiment,
  getAllModelConfigs,
  getModelConfig,
  upsertModelConfig,
} from "./db";
import { storagePut } from "./storage";

// ─── Negotiation brief PDF generator ─────────────────────────────────────────
async function generateNegotiationBriefPdf(data: {
  carId: number | string;
  carModel: string;
  colour: string;
  year: number;
  mileage: number;
  dealer: string;
  dealerType: string;
  askingPrice: number;
  iiv: number;
  priceVariance: number;
  targetPrice: number;
  negotiationDiscountPct: number;
  investmentVerdict: string;
  verdictReason: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  checklist: Record<string, boolean | string>;
}): Promise<Buffer> {
  // Generate a clean HTML negotiation brief and convert to PDF-like HTML blob
  const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
  const fmtMi = (n: number) => `${n.toLocaleString("en-GB")} mi`;
  const verdictColor = data.investmentVerdict === "strong-buy" ? "#16a34a"
    : data.investmentVerdict === "buy" ? "#2563eb"
    : data.investmentVerdict === "consider" ? "#d97706"
    : "#dc2626";

  const checklistHtml = Object.entries(data.checklist)
    .map(([key, val]) => {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
      const pass = val === true || val === "full";
      const icon = pass ? "✓" : "✗";
      const color = pass ? "#16a34a" : "#dc2626";
      return `<tr><td style="padding:4px 8px;color:${color};font-weight:bold;">${icon}</td><td style="padding:4px 8px;">${label}</td></tr>`;
    }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, serif; color: #1a1a1a; background: #fff; margin: 0; padding: 32px; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .stat { background: #f9f9f9; border: 1px solid #eee; padding: 12px; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
  .stat-value { font-size: 20px; font-weight: bold; margin-top: 2px; }
  .verdict { display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: bold; color: white; background: ${verdictColor}; }
  .strength { color: #16a34a; font-size: 13px; margin: 3px 0; }
  .weakness { color: #dc2626; font-size: 13px; margin: 3px 0; }
  .opening-offer { background: #fef3c7; border: 2px solid #f59e0b; padding: 16px; text-align: center; }
  .opening-offer .price { font-size: 32px; font-weight: bold; color: #92400e; }
  .footer { margin-top: 32px; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
  table { width: 100%; border-collapse: collapse; }
</style>
</head>
<body>
<h1>Ferrari ${data.carModel}</h1>
<div class="subtitle">${data.year} · ${data.colour} · ${fmtMi(data.mileage)} · ${data.dealer}</div>
<div style="margin-bottom:16px;"><span class="verdict">${data.investmentVerdict.toUpperCase().replace("-", " ")}</span></div>

<div class="section">
  <div class="section-title">Valuation Summary</div>
  <div class="stat-grid">
    <div class="stat"><div class="stat-label">Asking Price</div><div class="stat-value">${fmt(data.askingPrice)}</div></div>
    <div class="stat"><div class="stat-label">Intrinsic Investment Value (IIV)</div><div class="stat-value">${fmt(data.iiv)}</div></div>
    <div class="stat"><div class="stat-label">Price vs IIV</div><div class="stat-value" style="color:${data.priceVariance >= 0 ? "#16a34a" : "#dc2626"}">${data.priceVariance >= 0 ? "+" : ""}${fmt(data.priceVariance)}</div></div>
    <div class="stat"><div class="stat-label">Dealer Type</div><div class="stat-value" style="font-size:14px;">${data.dealerType.replace(/-/g, " ").toUpperCase()}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Recommended Opening Offer</div>
  <div class="opening-offer">
    <div style="font-size:12px;color:#92400e;margin-bottom:4px;">Suggest opening at (${data.negotiationDiscountPct}% below asking)</div>
    <div class="price">${fmt(data.targetPrice)}</div>
    <div style="font-size:12px;color:#92400e;margin-top:4px;">Saving ${fmt(data.askingPrice - data.targetPrice)} from asking price</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Negotiation Talking Points</div>
  <p style="font-size:13px;line-height:1.6;">${data.verdictReason}</p>
</div>

<div class="section">
  <div class="section-title">Key Strengths (use to confirm value)</div>
  ${data.keyStrengths.map(s => `<div class="strength">✓ ${s}</div>`).join("")}
</div>

<div class="section">
  <div class="section-title">Key Weaknesses (use as negotiation leverage)</div>
  ${data.keyWeaknesses.map(w => `<div class="weakness">✗ ${w}</div>`).join("")}
</div>

<div class="section">
  <div class="section-title">Buyer's Checklist</div>
  <table>${checklistHtml}</table>
</div>

<div class="footer">
  Generated by SupercarIQ · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · For informational purposes only. Not financial advice.
</div>
</body>
</html>`;

  return Buffer.from(html, "utf-8");
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Watchlist ──────────────────────────────────────────────────────────────
  watchlist: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getWatchlistByUser(ctx.user.id);
    }),

    add: protectedProcedure
      .input(z.object({
        carId: z.union([z.number(), z.string()]),
        carModel: z.string(),
        askingPriceAtAdd: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return addToWatchlist({
          userId: ctx.user.id,
          carId: String(input.carId),
          carModel: input.carModel,
          askingPriceAtAdd: input.askingPriceAtAdd,
          notes: input.notes ?? null,
        });
      }),

    remove: protectedProcedure
      .input(z.object({ carId: z.union([z.number(), z.string()]), carModel: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await removeFromWatchlist(ctx.user.id, String(input.carId), input.carModel);
        return { success: true };
      }),

    check: protectedProcedure
      .input(z.object({ carId: z.union([z.number(), z.string()]), carModel: z.string() }))
      .query(async ({ ctx, input }) => {
        return isInWatchlist(ctx.user.id, String(input.carId), input.carModel);
      }),
  }),

  // ─── Price History ──────────────────────────────────────────────────────────
  priceHistory: router({
    get: publicProcedure
      .input(z.object({ carId: z.union([z.number(), z.string()]), carModel: z.string() }))
      .query(async ({ input }) => {
        return getPriceHistory(String(input.carId), input.carModel);
      }),

    // Admin: seed initial price snapshot for a car
    addSnapshot: protectedProcedure
      .input(z.object({
        carId: z.union([z.number(), z.string()]),
        carModel: z.string(),
        askingPrice: z.number(),
        iiv: z.number(),
        priceVariance: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await addPriceSnapshot({
          carId: String(input.carId),
          carModel: input.carModel,
          askingPrice: input.askingPrice,
          iiv: input.iiv,
          priceVariance: input.priceVariance,
          notes: input.notes ?? null,
        });
        return { success: true };
      }),
  }),

  // ─── Negotiation Briefs ─────────────────────────────────────────────────────
  negotiation: router({
    myBriefs: protectedProcedure.query(async ({ ctx }) => {
      return getNegotiationBriefsByUser(ctx.user.id);
    }),

    generate: protectedProcedure
      .input(z.object({
        carId: z.union([z.number(), z.string()]),
        carModel: z.string(),
        colour: z.string(),
        year: z.number(),
        mileage: z.number(),
        dealer: z.string(),
        dealerType: z.string(),
        askingPrice: z.number(),
        iiv: z.number(),
        priceVariance: z.number(),
        targetPrice: z.number(),
        negotiationDiscountPct: z.number(),
        investmentVerdict: z.string(),
        verdictReason: z.string(),
        keyStrengths: z.array(z.string()),
        keyWeaknesses: z.array(z.string()),
        checklist: z.record(z.string(), z.union([z.boolean(), z.string()])),
      }))
      .mutation(async ({ ctx, input }) => {
        // Generate HTML brief
        const htmlBuffer = await generateNegotiationBriefPdf(input);

        // Upload to S3
        const fileKey = `negotiation-briefs/${ctx.user.id}/${input.carModel.replace(/\s+/g, "-")}-${input.carId}-${Date.now()}.html`;
        const { url } = await storagePut(fileKey, htmlBuffer, "text/html");

        // Save record to DB
        const brief = await saveNegotiationBrief({
          userId: ctx.user.id,
          carId: String(input.carId),
          carModel: input.carModel,
          s3Key: fileKey,
          s3Url: url,
        });

        return { url, briefId: brief?.id };
      }),
  }),

  // ─── Listings (new architecture) ─────────────────────────────────────────
  listings: router({
    byModel: publicProcedure
      .input(z.object({ modelKey: z.string() }))
      .query(async ({ input }) => getActiveListingsByModel(input.modelKey)),
    byId: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => getListingById(input.id)),
    sold: publicProcedure
      .input(z.object({ modelKey: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => getSoldListingsByModel(input.modelKey, input.limit ?? 50)),
    allSold: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => getAllSoldListings(input.limit ?? 100)),
    priceHistory: publicProcedure
      .input(z.object({ listingId: z.string() }))
      .query(async ({ input }) => getListingPriceHistory(input.listingId)),
    allActive: publicProcedure
      .query(async () => getAllActiveListings()),
    topPick: publicProcedure
      .input(z.object({ modelKey: z.string() }))
      .query(async ({ input }) => getTopListingForModel(input.modelKey)),
  }),

  // ─── Report Leads (email capture gate) ──────────────────────────────────
  leads: router({
    /** Submit email/name/phone to unlock a gated report. Idempotent — same email+model returns success without duplicate. */
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        email: z.string().email().max(320),
        phone: z.string().max(32).optional(),
        modelKey: z.string().max(64),
        modelLabel: z.string().max(128),
      }))
      .mutation(async ({ input }) => {
        // Check if already submitted for this model
        const exists = await hasLeadForModel(input.email, input.modelKey);
        if (!exists) {
          await saveReportLead({
            name: input.name,
            email: input.email,
            phone: input.phone ?? null,
            modelKey: input.modelKey,
            modelLabel: input.modelLabel,
            source: 'report-gate',
          });
        }
        return { success: true, alreadyRegistered: exists };
      }),

    /** Admin: list all captured leads. Protected — requires login. */
    adminList: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Forbidden');
        }
        return getAllLeads(1000);
      }),
  }),

  // ─── Pipeline Status (admin) ────────────────────────────────────────────────────────────
  pipeline: router({
    /** Admin: get pipeline status — last runs, queue depth, active listings. */
    status: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Forbidden');
        }
        return getPipelineStatus();
      }),

    /** Admin: trigger a pipeline run in the background. Returns immediately. */
    triggerRun: protectedProcedure
      .input(z.object({
        phase: z.enum(['all', '1', '2', '3']).default('all'),
        dryRun: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Forbidden');
        }

        const pipelineDir = process.env.PIPELINE_DIR ?? '/app/pipeline';
        const scriptPath = path.join(pipelineDir, 'smart_pipeline.py');

        if (!fs.existsSync(scriptPath)) {
          throw new Error('Pipeline script not found at ' + scriptPath);
        }

        const args = ['smart_pipeline.py', '--phase', input.phase];
        if (input.dryRun) args.push('--dry-run');

        const logFile = path.join(
          pipelineDir,
          'logs',
          `smart_pipeline_admin_${new Date().toISOString().replace(/[:.]/g, '-')}.log`
        );

        // Ensure logs dir exists
        fs.mkdirSync(path.join(pipelineDir, 'logs'), { recursive: true });

        // Insert a pipeline run record so the admin panel shows it immediately
        let runId: number | null = null;
        try {
          const inserted = await insertPipelineRun({
            runType: 'manual',
            status: 'running',
            newListingsFound: 0,
            listingsEnriched: 0,
            listingsMarkedSold: 0,
            queueDepth: 0,
            logFilePath: logFile,
          });
          runId = inserted.id;
        } catch (e) {
          console.warn('[triggerRun] Could not insert pipeline run record:', e);
        }

        const logStream = fs.openSync(logFile, 'a');
        const child = spawn('python3', args, {
          cwd: pipelineDir,
          detached: true,
          stdio: ['ignore', logStream, logStream],
        });
        child.unref();

        return {
          started: true,
          pid: child.pid ?? null,
          logFile,
          runId,
          phase: input.phase,
          dryRun: input.dryRun,
          startedAt: new Date(),
        };
      }),

    /** Cron/scheduled task trigger — authenticates via secret in input, no session required. */
    cronTrigger: publicProcedure
      .input(z.object({
        secret: z.string(),
        phase: z.enum(['all', '1', '2', '3']).default('all'),
        dryRun: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const configuredSecret = process.env.PIPELINE_TRIGGER_SECRET;
        if (!configuredSecret || input.secret !== configuredSecret) {
          throw new Error('Unauthorized');
        }
        const pipelineDir = process.env.PIPELINE_DIR ?? '/app/pipeline';
        const scriptPath = path.join(pipelineDir, 'smart_pipeline.py');
        if (!fs.existsSync(scriptPath)) {
          throw new Error('Pipeline script not found at ' + scriptPath);
        }
        const args = ['smart_pipeline.py', '--phase', input.phase];
        if (input.dryRun) args.push('--dry-run');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFile = path.join(pipelineDir, 'logs', `smart_pipeline_cron_${timestamp}.log`);
        fs.mkdirSync(path.join(pipelineDir, 'logs'), { recursive: true });
        // Insert a run record immediately
        let runId: number | null = null;
        try {
          const inserted = await insertPipelineRun({
            runType: 'scheduled',
            status: 'running',
            newListingsFound: 0,
            listingsEnriched: 0,
            listingsMarkedSold: 0,
            queueDepth: 0,
            logFilePath: logFile,
          });
          runId = inserted.id;
        } catch (e) {
          console.warn('[cronTrigger] Could not insert pipeline run record:', e);
        }
        const logStream = fs.openSync(logFile, 'a');
        const child = spawn('python3', args, {
          cwd: pipelineDir,
          detached: true,
          stdio: ['ignore', logStream, logStream],
        });
        child.unref();
        return { started: true, pid: child.pid ?? null, logFile, runId, phase: input.phase, dryRun: input.dryRun, startedAt: new Date() };
      }),

    /** Admin: read the last N lines of a pipeline log file. */
    logTail: protectedProcedure
      .input(z.object({
        logFile: z.string(),
        lines: z.number().min(10).max(500).default(100),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Forbidden');
        }
        // Safety: only allow files inside the pipeline logs directory
        const logsDir = path.join(process.env.PIPELINE_DIR ?? '/app/pipeline', 'logs');
        const resolved = path.resolve(input.logFile);
        if (!resolved.startsWith(logsDir)) {
          throw new Error('Access denied: log file must be inside the pipeline logs directory');
        }
        if (!fs.existsSync(resolved)) {
          return { lines: [], exists: false };
        }
        // Read last N lines efficiently
        const content = fs.readFileSync(resolved, 'utf-8');
        const allLines = content.split('\n').filter(Boolean);
        const tail = allLines.slice(-input.lines);
        return { lines: tail, exists: true, totalLines: allLines.length };
      }),
  }),

  // ─── Market stats (new architecture) ──────────────────────────────────────
  market: router({
    dailyStats: publicProcedure
      .input(z.object({ modelKey: z.string(), days: z.number().optional() }))
      .query(async ({ input }) => getMarketDailyStats(input.modelKey, input.days ?? 90)),
    allLatest: publicProcedure
      .query(async () => getLatestMarketStatsAllModels()),
    summary: publicProcedure
      .input(z.object({ modelKey: z.string() }))
      .query(async ({ input }) => getModelSummaryStats(input.modelKey)),
  }),

  // ─── LLM-generated model content ─────────────────────────────────────────
  modelContent: router({
    /** Get all LLM-generated content for a specific model */
    get: publicProcedure
      .input(z.object({ modelKey: z.string() }))
      .query(async ({ input }) => getModelLlmContent(input.modelKey)),

    /** Upsert LLM content (called by scheduled pipeline endpoint) */
    upsert: publicProcedure
      .input(z.object({
        modelKey: z.string(),
        investmentVerdict: z.string().optional(),
        investmentHeadline: z.string().optional(),
        investmentReasoning: z.string().optional(),
        valueDriversJson: z.array(z.string()).optional(),
        valueDetractorsJson: z.array(z.string()).optional(),
        keyRisksJson: z.array(z.string()).optional(),
        pricePrediction1yr: z.string().optional(),
        pricePrediction3yr: z.string().optional(),
        pricePrediction5yr: z.string().optional(),
        pricePredictionNarrative: z.string().optional(),
        pricePredictionConfidence: z.string().optional(),
        buyersGuideTop5Json: z.array(z.string()).optional(),
        buyersGuideRedFlagsJson: z.array(z.string()).optional(),
        bestSpec: z.string().optional(),
        worstSpec: z.string().optional(),
        marketContextNarrative: z.string().optional(),
        peerComparisonNarrative: z.string().optional(),
        scoringMethodologyNarrative: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await upsertModelLlmContent(input as any);
        return { success: true };
      }),
  }),

  // ─── Influencer sentiment ─────────────────────────────────────────────────
  sentiment: router({
    /** Get all active influencer sentiment entries for a model */
    getByModel: publicProcedure
      .input(z.object({ modelKey: z.string() }))
      .query(async ({ input }) => getInfluencerSentiment(input.modelKey)),

    /** Upsert a sentiment entry (called by scheduled pipeline) */
    upsert: publicProcedure
      .input(z.object({
        modelKey: z.string(),
        influencerName: z.string(),
        platform: z.string(),
        followers: z.string().optional(),
        sentiment: z.string(),
        sentimentScore: z.number().optional(),
        keyThemesJson: z.array(z.string()).optional(),
        summary: z.string().optional(),
        sourceUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await upsertInfluencerSentiment(input as any);
        return { success: true };
      }),
  }),

  // ─── Model configs (multi-tenancy) ────────────────────────────────────────
  models: router({
    /** Get all active model configs for the directory page */
    all: publicProcedure
      .query(async () => getAllModelConfigs()),

    /** Get a single model config */
    get: publicProcedure
      .input(z.object({ modelKey: z.string() }))
      .query(async ({ input }) => getModelConfig(input.modelKey)),

    /** Upsert a model config (seeded from pipeline) */
    upsert: publicProcedure
      .input(z.object({
        modelKey: z.string(),
        make: z.string(),
        model: z.string(),
        yearMin: z.number(),
        yearMax: z.number(),
        totalUnitsProduced: z.string().optional(),
        engineSpec: z.string().optional(),
        originalUkPriceGbp: z.string().optional(),
        gpfYear: z.number().optional(),
        investmentVerdict: z.string().optional(),
        iivWeightsJson: z.any().optional(),
        colourDesirabilityJson: z.any().optional(),
        standardEquipmentJson: z.any().optional(),
        optionalEquipmentJson: z.any().optional(),
        isPublic: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
        heroImageUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await upsertModelConfig(input as any);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

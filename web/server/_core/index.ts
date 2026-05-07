import "dotenv/config";

// ── Railway MySQL compatibility shim ─────────────────────────────────────────
// Railway's MySQL plugin injects individual vars (MYSQL_HOST, MYSQL_PORT, etc.)
// rather than a single DATABASE_URL. Construct it here if not already set.
if (!process.env.DATABASE_URL && process.env.MYSQL_HOST) {
  const { MYSQL_USER = "root", MYSQL_PASSWORD = "", MYSQL_HOST, MYSQL_PORT = "3306", MYSQL_DATABASE = "railway" } = process.env;
  process.env.DATABASE_URL = `mysql://${MYSQL_USER}:${encodeURIComponent(MYSQL_PASSWORD)}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}`;
  console.log(`[Railway] Constructed DATABASE_URL from MYSQL_* vars (host: ${MYSQL_HOST})`);
}

import express from "express";
import { createServer } from "http";
import net from "net";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getPipelineStatus } from "../db";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerLocalAuthRoutes } from "./localAuth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── Storage proxy for /manus-storage/* paths ──────────────────────────────
  registerStorageProxy(app);

  // ── Local auth routes (login/logout/me) ────────────────────────────────────
  registerLocalAuthRoutes(app);

  // ── Pipeline trigger endpoint (for Railway cron service) ──────────────────
  // Protected by a shared secret token in the Authorization header.
  // Usage: POST /api/pipeline/trigger
  //   Authorization: Bearer <PIPELINE_TRIGGER_SECRET>
  //   Body: { phase?: "all"|"1"|"2"|"3", dryRun?: boolean }
  app.post("/api/pipeline/trigger", (req, res) => {
    const secret = process.env.PIPELINE_TRIGGER_SECRET;
    if (!secret) {
      return res.status(503).json({ error: "PIPELINE_TRIGGER_SECRET not configured" });
    }
    const authHeader = req.headers["authorization"] ?? "";
    const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (provided !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const phase: string = (req.body?.phase as string) || "all";
    const dryRun: boolean = Boolean(req.body?.dryRun);
    const pipelineDir = process.env.PIPELINE_DIR ?? "/app/pipeline";
    const scriptPath = path.join(pipelineDir, "smart_pipeline.py");
    if (!fs.existsSync(scriptPath)) {
      return res.status(503).json({ error: `Pipeline script not found at ${scriptPath}` });
    }
    const args = ["smart_pipeline.py", "--phase", phase];
    if (dryRun) args.push("--dry-run");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logFile = path.join(pipelineDir, "logs", `smart_pipeline_cron_${timestamp}.log`);
    fs.mkdirSync(path.join(pipelineDir, "logs"), { recursive: true });
    const logStream = fs.openSync(logFile, "a");
    const child = spawn("python3", args, {
      cwd: pipelineDir,
      detached: true,
      stdio: ["ignore", logStream, logStream],
    });
    child.unref();
    return res.json({
      started: true,
      pid: child.pid ?? null,
      phase,
      dryRun,
      logFile,
      startedAt: new Date().toISOString(),
    });
  });

  // ── Simple health check for Railway ────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // ── DB connection debug endpoint ──────────────────────────────────────────────
  // Returns DB connection status and listing counts for diagnostics.
  app.get("/api/debug/db", async (_req, res) => {
    const hasDbUrl = Boolean(process.env.DATABASE_URL);
    const hasMysqlHost = Boolean(process.env.MYSQL_HOST);
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.json({
          connected: false,
          hasDbUrl,
          hasMysqlHost,
          dbUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : null,
          error: "getDb() returned null — DATABASE_URL or MYSQL_HOST not set",
        });
      }
      // Try a simple count query
      const { carListings } = await import("../../drizzle/schema");
      const { eq, count } = await import("drizzle-orm");
      const rows = await db.select({ n: count() }).from(carListings).where(eq(carListings.modelKey, "812-superfast"));
      return res.json({
        connected: true,
        hasDbUrl,
        hasMysqlHost,
        dbUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : null,
        listings812: rows[0]?.n ?? 0,
      });
    } catch (err) {
      return res.status(500).json({ connected: false, hasDbUrl, hasMysqlHost, error: String(err) });
    }
  });

  // ── Pipeline health check (public, no auth needed for monitoring tools) ─────────
  app.get("/api/pipeline/status", async (_req, res) => {
    try {
      const data = await getPipelineStatus();
      const lastRun = data.runs[0] ?? null;
      const isRunning = lastRun?.status === "running";
      const lastSuccess = data.runs.find(r => r.status === "completed") ?? null;
      return res.json({
        ok: true,
        isRunning,
        activeListings: data.activeListings,
        queueDepth: data.queueDepth,
        pendingSoldListings: data.pendingSoldListings,
        lastRun: lastRun ? {
          id: lastRun.id,
          status: lastRun.status,
          startedAt: lastRun.startedAt,
          completedAt: lastRun.completedAt,
          durationSeconds: lastRun.durationSeconds,
          newListingsFound: lastRun.newListingsFound,
          listingsEnriched: lastRun.listingsEnriched,
        } : null,
        lastSuccessfulRun: lastSuccess ? {
          id: lastSuccess.id,
          startedAt: lastSuccess.startedAt,
          completedAt: lastSuccess.completedAt,
          newListingsFound: lastSuccess.newListingsFound,
          listingsEnriched: lastSuccess.listingsEnriched,
        } : null,
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

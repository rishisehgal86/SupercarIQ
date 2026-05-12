/**
 * Local username/password authentication — replaces Manus OAuth.
 * Credentials are stored in environment variables:
 *   ADMIN_USERNAME  — admin login username
 *   ADMIN_PASSWORD  — admin login password (plaintext, stored in Railway secrets)
 *
 * On successful login, a signed JWT is set as an httpOnly cookie.
 * The JWT payload contains { username, role: 'admin' }.
 * The same JWT_SECRET used by the existing session system is reused.
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { getSessionCookieOptions } from "./cookies";

export type LocalAuthPayload = {
  username: string;
  role: "admin" | "user";
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "";
  if (!secret) {
    console.warn("[LocalAuth] WARNING: JWT_SECRET is not set — sessions will not persist across restarts");
  }
  return new TextEncoder().encode(secret || "fallback-dev-secret-change-in-prod");
}

/** Sign a local auth JWT. */
export async function signLocalToken(payload: LocalAuthPayload): Promise<string> {
  const secretKey = getJwtSecret();
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

  return new SignJWT({
    username: payload.username,
    role: payload.role,
    // Distinguish from Manus OAuth tokens
    authType: "local",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

/** Verify a local auth JWT from a cookie. Returns payload or null. */
export async function verifyLocalToken(token: string | undefined | null): Promise<LocalAuthPayload | null> {
  if (!token) return null;

  try {
    const secretKey = getJwtSecret();
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });

    // Must be a local auth token
    if (payload.authType !== "local") return null;

    const username = payload.username;
    const role = payload.role;

    if (typeof username !== "string" || (role !== "admin" && role !== "user")) {
      return null;
    }

    return { username, role };
  } catch {
    return null;
  }
}

/** Parse cookies from a request. */
function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  const map = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    map.set(key, val);
  }
  return map;
}

/** Extract and verify the local auth session from a request. */
export async function getLocalAuthUser(req: Request): Promise<LocalAuthPayload | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  return verifyLocalToken(sessionCookie);
}

/** Register the login/logout HTTP routes. */
export function registerLocalAuthRoutes(app: Express) {
  // POST /api/auth/login — accepts { username, password } JSON body
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};

    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "username and password are required" });
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error("[LocalAuth] ADMIN_USERNAME or ADMIN_PASSWORD not configured");
      return res.status(503).json({ error: "Authentication not configured" });
    }

    // Constant-time comparison to prevent timing attacks
    const usernameMatch = username === adminUsername;
    const passwordMatch = password === adminPassword;

    if (!usernameMatch || !passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = await signLocalToken({ username: adminUsername, role: "admin" });
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    return res.json({ success: true, role: "admin" });
  });

  // POST /api/auth/logout — clears the session cookie
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return res.json({ success: true });
  });

  // GET /api/auth/me — returns current user info (or 401 if not logged in)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const user = await getLocalAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    return res.json({ username: user.username, role: user.role });
  });
}

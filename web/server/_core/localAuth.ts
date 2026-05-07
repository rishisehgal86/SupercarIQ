/**
 * localAuth.ts — Email/password authentication with bcrypt + JWT.
 * Users are stored in the `users` DB table with a passwordHash column.
 * On login, a signed JWT is set as an httpOnly cookie.
 */
import bcrypt from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { getSessionCookieOptions } from "./cookies";
import { getUserByEmail, createUser, getUserById, updateUserLastSignedIn } from "../db";

export type LocalAuthPayload = {
  userId: number;
  email: string;
  role: "admin" | "user";
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "";
  if (!secret) {
    console.warn("[LocalAuth] WARNING: JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret || "fallback-dev-secret-change-in-prod");
}

export async function signLocalToken(payload: LocalAuthPayload): Promise<string> {
  const secretKey = getJwtSecret();
  const expirationSeconds = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    authType: "local",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export async function verifyLocalToken(token: string | undefined | null): Promise<LocalAuthPayload | null> {
  if (!token) return null;
  try {
    const secretKey = getJwtSecret();
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    if (payload.authType !== "local") return null;
    const userId = payload.userId;
    const email = payload.email;
    const role = payload.role;
    if (typeof userId !== "number" || typeof email !== "string" || (role !== "admin" && role !== "user")) {
      return null;
    }
    return { userId, email, role };
  } catch {
    return null;
  }
}

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

export async function getLocalAuthUser(req: Request): Promise<LocalAuthPayload | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  return verifyLocalToken(sessionCookie);
}

export function registerLocalAuthRoutes(app: Express) {
  // POST /api/auth/register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const emailLower = email.toLowerCase().trim();
    const existing = await getUserByEmail(emailLower);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({
      email: emailLower,
      name: name ?? emailLower.split("@")[0],
      passwordHash,
      loginMethod: "local",
      role: "user",
    });
    if (!user) {
      return res.status(500).json({ error: "Failed to create account" });
    }
    const token = await signLocalToken({ userId: user.id, email: user.email!, role: user.role });
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    return res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "email and password are required" });
    }
    const emailLower = email.toLowerCase().trim();
    const user = await getUserByEmail(emailLower);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    await updateUserLastSignedIn(user.id);
    const token = await signLocalToken({ userId: user.id, email: user.email!, role: user.role });
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    return res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return res.json({ success: true });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const authPayload = await getLocalAuthUser(req);
    if (!authPayload) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await getUserById(authPayload.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  });
}

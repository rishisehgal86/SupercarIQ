import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getLocalAuthUser } from "./localAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Build tRPC context from an Express request.
 * Uses local JWT auth (username/password) instead of Manus OAuth.
 * The User object is synthesised from the JWT payload — no DB lookup needed.
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const localUser = await getLocalAuthUser(opts.req);
    if (localUser) {
      // Synthesise a User-shaped object from the JWT payload.
      // We don't need a real DB row for admin-only operations.
      user = {
        id: 0, // synthetic — not stored in DB
        openId: `local:${localUser.username}`,
        name: localUser.username,
        email: null,
        loginMethod: "local",
        role: localUser.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as User;
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

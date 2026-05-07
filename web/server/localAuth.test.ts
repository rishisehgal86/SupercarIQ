/**
 * Tests for local auth JWT signing and verification.
 * Validates that signLocalToken / verifyLocalToken round-trip correctly
 * and that invalid/missing tokens return null.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { signLocalToken, verifyLocalToken } from "./_core/localAuth";

// Set a test JWT_SECRET so the module doesn't use the fallback
beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-for-vitest-do-not-use-in-prod";
});

describe("localAuth", () => {
  it("signs and verifies an admin token", async () => {
    const token = await signLocalToken({ username: "admin", role: "admin" });
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const payload = await verifyLocalToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.username).toBe("admin");
    expect(payload?.role).toBe("admin");
  });

  it("signs and verifies a user token", async () => {
    const token = await signLocalToken({ username: "testuser", role: "user" });
    const payload = await verifyLocalToken(token);
    expect(payload?.username).toBe("testuser");
    expect(payload?.role).toBe("user");
  });

  it("returns null for undefined token", async () => {
    const result = await verifyLocalToken(undefined);
    expect(result).toBeNull();
  });

  it("returns null for empty string token", async () => {
    const result = await verifyLocalToken("");
    expect(result).toBeNull();
  });

  it("returns null for a garbage token", async () => {
    const result = await verifyLocalToken("not.a.valid.jwt");
    expect(result).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    // Sign with a different secret
    const { SignJWT } = await import("jose");
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const fakeToken = await new SignJWT({ username: "hacker", role: "admin", authType: "local" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(wrongSecret);

    const result = await verifyLocalToken(fakeToken);
    expect(result).toBeNull();
  });

  it("returns null for a Manus OAuth token (missing authType: local)", async () => {
    // Simulate an old Manus token that lacks authType: "local"
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode("test-jwt-secret-for-vitest-do-not-use-in-prod");
    const manusToken = await new SignJWT({ openId: "manus-user", appId: "app-123", name: "User" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(secret);

    const result = await verifyLocalToken(manusToken);
    expect(result).toBeNull();
  });
});

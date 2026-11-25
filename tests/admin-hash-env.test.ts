import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import bcrypt from "bcryptjs";
import { adminConfigured, adminHash, verifyCredentials } from "@/lib/server/admin-auth";

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });

describe("admin hash in the environment", () => {
  it("accepts the base64 form (no $ signs, so .env loaders cannot corrupt it) and the plain form", async () => {
    const hash = bcrypt.hashSync("correct horse battery", 4);
    process.env.ADMIN_USERNAME = "aftab";
    process.env.SESSION_SECRET = "x".repeat(40);
    delete process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD_HASH_B64 = Buffer.from(hash).toString("base64");
    expect(adminHash()).toBe(hash);
    expect(adminConfigured()).toBe(true);
    expect(await verifyCredentials("aftab", "correct horse battery")).toBe(true);
    expect(await verifyCredentials("aftab", "wrong")).toBe(false);
    expect(await verifyCredentials("someone", "correct horse battery")).toBe(false);

    delete process.env.ADMIN_PASSWORD_HASH_B64;
    process.env.ADMIN_PASSWORD_HASH = hash;
    expect(adminConfigured()).toBe(true);
    expect(await verifyCredentials("aftab", "correct horse battery")).toBe(true);
  });
  it("is not configured with a missing, garbled or too-short setup (fails closed)", () => {
    process.env.ADMIN_USERNAME = "aftab";
    process.env.SESSION_SECRET = "x".repeat(40);
    delete process.env.ADMIN_PASSWORD_HASH_B64;
    process.env.ADMIN_PASSWORD_HASH = ".PaYsg6mangled";        // what an env loader does to a $-containing hash
    expect(adminConfigured()).toBe(false);
    process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("x", 4);
    process.env.SESSION_SECRET = "short";
    expect(adminConfigured()).toBe(false);
  });
});

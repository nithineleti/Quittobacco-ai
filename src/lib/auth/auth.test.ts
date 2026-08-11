import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import {
  MIN_PASSWORD,
  normalizePhone,
  validateEmail,
  validatePassword,
} from "./validate";

describe("password hashing", () => {
  it("never stores the plaintext", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored).not.toContain("correct horse battery");
    expect(stored.startsWith("scrypt$")).toBe(true);
  });

  it("salts each hash, so identical passwords differ on disk", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same-password"),
      hashPassword("same-password"),
    ]);
    expect(a).not.toBe(b);
  });

  it("accepts the right password and rejects the wrong one", async () => {
    const stored = await hashPassword("quitnow2026");
    expect(await verifyPassword("quitnow2026", stored)).toBe(true);
    expect(await verifyPassword("quitnow2025", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("rejects malformed stored values instead of throwing", async () => {
    for (const bad of ["", "nonsense", "scrypt$only-one-part", "bcrypt$aa$bb"]) {
      expect(await verifyPassword("x", bad)).toBe(false);
    }
  });

  it("rejects a hash of the wrong length (truncated record)", async () => {
    const stored = await hashPassword("quitnow2026");
    const [scheme, salt, hash] = stored.split("$");
    expect(await verifyPassword("quitnow2026", `${scheme}$${salt}$${hash.slice(0, 20)}`)).toBe(
      false,
    );
  });
});

describe("email validation", () => {
  it("accepts ordinary addresses", () => {
    for (const ok of ["a@b.co", "ravi.kumar+quit@example.com", "x_y@sub.domain.in"]) {
      expect(validateEmail(ok)).toBeNull();
    }
  });

  it("rejects malformed ones with an i18n key", () => {
    for (const bad of ["", "  ", "no-at-sign", "a@b", "a b@c.com", "@nope.com"]) {
      expect(validateEmail(bad)).toMatch(/^auth\.errors\./);
    }
  });

  it("tolerates surrounding whitespace", () => {
    expect(validateEmail("  ravi@example.com  ")).toBeNull();
  });
});

describe("password rules", () => {
  it("requires the documented minimum length", () => {
    expect(validatePassword("a".repeat(MIN_PASSWORD))).toBeNull();
    expect(validatePassword("a".repeat(MIN_PASSWORD - 1))).toBe(
      "auth.errors.passwordShort",
    );
  });

  it("flags an empty password distinctly from a short one", () => {
    expect(validatePassword("")).toBe("auth.errors.passwordRequired");
  });
});

describe("phone normalisation", () => {
  it("normalises the shapes people actually type to E.164", () => {
    for (const input of [
      "9876543210",
      "+919876543210",
      "919876543210",
      "09876543210",
      "98765 43210",
      "98765-43210",
      "(98765) 43210",
    ]) {
      expect(normalizePhone(input)).toBe("+919876543210");
    }
  });

  it("rejects numbers that aren't valid Indian mobiles", () => {
    for (const bad of [
      "",
      "12345",
      "5876543210", // must start 6–9
      "98765432101", // too long
      "987654321", // too short
      "abcdefghij",
    ]) {
      expect(normalizePhone(bad)).toBeNull();
    }
  });
});

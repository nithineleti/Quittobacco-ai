import { describe, expect, it } from "vitest";
import {
  generateOtpCode,
  hashOtp,
  normalizeOtpInput,
  otpMatches,
} from "./otp";
import { hashPassword, verifyPassword } from "./password";
import {
  MIN_PASSWORD,
  formatPhone,
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
    // Not a repeated character — see the dedicated test below for that rule.
    expect(validatePassword("correcthorse")).toBeNull();
    expect(validatePassword("a".repeat(MIN_PASSWORD - 1))).toBe(
      "auth.errors.passwordShort",
    );
  });

  it("flags an empty password distinctly from a short one", () => {
    expect(validatePassword("")).toBe("auth.errors.passwordRequired");
  });

  it("rejects a well-known common password regardless of length", () => {
    expect(validatePassword("password123")).toBe("auth.errors.passwordCommon");
    expect(validatePassword("PASSWORD123")).toBe("auth.errors.passwordCommon");
  });

  it("rejects a single character repeated for the whole length", () => {
    expect(validatePassword("a".repeat(MIN_PASSWORD))).toBe(
      "auth.errors.passwordCommon",
    );
  });

  it("does not forbid symbols or reject their absence — length + a blocklist, not composition rules", () => {
    expect(validatePassword("mailboxwindow")).toBeNull();
    expect(validatePassword("Tr!cky$Pass1")).toBeNull();
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

describe("phone formatting", () => {
  it("groups a normalised number the way it is printed on a SIM pack", () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
  });

  it("leaves anything else untouched", () => {
    expect(formatPhone("+15551234567")).toBe("+15551234567");
  });
});

describe("one-time codes", () => {
  it("is always exactly six digits, zero-padded", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it("never stores the code itself", () => {
    const stored = hashOtp("token-id", "123456");
    expect(stored).not.toContain("123456");
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
  });

  it("salts the hash with the token id, so two rows with the same code differ", () => {
    expect(hashOtp("a", "123456")).not.toBe(hashOtp("b", "123456"));
  });

  it("matches only the right code for the right token", () => {
    const stored = hashOtp("tok", "123456");
    expect(otpMatches("tok", "123456", stored)).toBe(true);
    expect(otpMatches("tok", "123457", stored)).toBe(false);
    expect(otpMatches("other", "123456", stored)).toBe(false);
  });

  it("rejects a malformed stored hash instead of throwing", () => {
    expect(otpMatches("tok", "123456", "")).toBe(false);
    expect(otpMatches("tok", "123456", "zz")).toBe(false);
  });

  it("keeps only digits from what the user typed", () => {
    expect(normalizeOtpInput("123 456")).toBe("123456");
    expect(normalizeOtpInput("12-34-56")).toBe("123456");
    expect(normalizeOtpInput("")).toBe("");
  });
});

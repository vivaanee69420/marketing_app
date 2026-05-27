import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACCESS_COOKIE,
  buildCookieOptions,
  accessMaxAgeMs,
  parseCookies,
  readAccessToken,
} from "./sessionCookies.js";
import {
  signupSchema,
  loginSchema,
  normalizeUsername,
  USERNAME_RE,
} from "./authValidation.js";

// ── sessionCookies ──────────────────────────────────────────────────

test("buildCookieOptions: httpOnly + lax, insecure outside production", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  const o = buildCookieOptions(1000);
  assert.equal(o.httpOnly, true);
  assert.equal(o.sameSite, "lax");
  assert.equal(o.secure, false);
  assert.equal(o.path, "/");
  assert.equal(o.maxAge, 1000);
  process.env.NODE_ENV = prev;
});

test("buildCookieOptions: secure cookie in production", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  assert.equal(buildCookieOptions(1).secure, true);
  process.env.NODE_ENV = prev;
});

test("accessMaxAgeMs: derives ms from unix-seconds expires_at", () => {
  const now = 1_000_000_000_000; // fixed ms
  assert.equal(accessMaxAgeMs(now / 1000 + 60, now), 60_000); // 60s ahead → 60_000ms
});

test("accessMaxAgeMs: falls back to 1h when missing or past", () => {
  const hour = 60 * 60 * 1000;
  assert.equal(accessMaxAgeMs(undefined), hour);
  assert.equal(accessMaxAgeMs(0), hour);
  assert.equal(accessMaxAgeMs(1, Date.now()), hour); // already past
});

test("parseCookies: parses, decodes, skips malformed", () => {
  assert.deepEqual(parseCookies("a=1; b=two%20words; junk; c="), {
    a: "1",
    b: "two words",
    c: "",
  });
  assert.deepEqual(parseCookies(""), {});
  assert.deepEqual(parseCookies(undefined), {});
});

test("readAccessToken: cookie wins over header, header is fallback", () => {
  assert.equal(
    readAccessToken({ headers: { cookie: `${ACCESS_COOKIE}=tok-cookie`, authorization: "Bearer tok-hdr" } }),
    "tok-cookie"
  );
  assert.equal(readAccessToken({ headers: { authorization: "Bearer tok-hdr" } }), "tok-hdr");
  assert.equal(readAccessToken({ headers: {} }), null);
});

// ── authValidation ──────────────────────────────────────────────────

test("USERNAME_RE: accepts valid, rejects invalid", () => {
  for (const ok of ["abc", "a_b.c-d", "User99", "x".repeat(30)]) {
    assert.ok(USERNAME_RE.test(ok), `should accept ${ok}`);
  }
  for (const bad of ["ab", "_abc", ".abc", "has space", "x".repeat(31), "嗨嗨嗨"]) {
    assert.ok(!USERNAME_RE.test(bad), `should reject ${bad}`);
  }
});

test("signupSchema: requires username, email, 8+ password", () => {
  const ok = signupSchema.parse({ username: "Alice", email: "a@b.co", password: "longenough" });
  assert.equal(ok.username, "Alice");
  assert.throws(() => signupSchema.parse({ username: "Alice", email: "nope", password: "longenough" }));
  assert.throws(() => signupSchema.parse({ username: "Alice", email: "a@b.co", password: "short" }));
  assert.throws(() => signupSchema.parse({ username: "ab", email: "a@b.co", password: "longenough" }));
});

test("loginSchema: username + non-empty password", () => {
  assert.deepEqual(loginSchema.parse({ username: "bob", password: "x" }), {
    username: "bob",
    password: "x",
  });
  assert.throws(() => loginSchema.parse({ username: "bob", password: "" }));
});

test("normalizeUsername: trims and lowercases", () => {
  assert.equal(normalizeUsername("  Alice  "), "alice");
  assert.equal(normalizeUsername("BOB"), "bob");
  assert.equal(normalizeUsername(null), "");
});

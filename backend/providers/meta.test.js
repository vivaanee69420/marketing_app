import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchInsights } from "./meta.js";

// Helper: monkey-patch global fetch for the duration of `fn`.
async function withFetch(impl, fn) {
  const orig = globalThis.fetch;
  globalThis.fetch = impl;
  try { await fn(); } finally { globalThis.fetch = orig; }
}

test("Meta code:190 (expired session) throws TOKEN_EXPIRED-tagged error", async () => {
  const body = JSON.stringify({
    error: {
      message: "Error validating access token: Session has expired ...",
      type: "OAuthException",
      code: 190,
      error_subcode: 463,
    },
  });
  let caught = null;
  await withFetch(
    async () => new Response(body, { status: 400, headers: { "content-type": "application/json" } }),
    async () => {
      try {
        await fetchInsights({ accessToken: "x", accountId: "act_1", since: "2026-05-01", until: "2026-05-02" });
      } catch (e) { caught = e; }
    },
  );
  assert.ok(caught, "expected throw");
  assert.equal(caught.code, "TOKEN_EXPIRED", "should tag as TOKEN_EXPIRED");
  assert.match(caught.message, /Meta token expired/i);
});

test("Meta code:190 in HTTP-200 body still throws TOKEN_EXPIRED", async () => {
  const body = JSON.stringify({ error: { message: "expired", code: 190 } });
  let caught = null;
  await withFetch(
    async () => new Response(body, { status: 200, headers: { "content-type": "application/json" } }),
    async () => {
      try {
        await fetchInsights({ accessToken: "x", accountId: "1", since: "2026-05-01", until: "2026-05-02" });
      } catch (e) { caught = e; }
    },
  );
  assert.equal(caught?.code, "TOKEN_EXPIRED");
});

test("Meta non-190 error stays untagged (generic Meta API error)", async () => {
  const body = JSON.stringify({ error: { message: "permissions", code: 200 } });
  let caught = null;
  await withFetch(
    async () => new Response(body, { status: 400, headers: { "content-type": "application/json" } }),
    async () => {
      try {
        await fetchInsights({ accessToken: "x", accountId: "1", since: "2026-05-01", until: "2026-05-02" });
      } catch (e) { caught = e; }
    },
  );
  assert.ok(caught);
  assert.notEqual(caught.code, "TOKEN_EXPIRED");
});

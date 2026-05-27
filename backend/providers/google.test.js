import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchInsights, listClientAccounts } from "./google.js";

// Regression: Google Ads API v17 was sunset. A sunset version path returns a
// generic Google 404 HTML page; a version path that doesn't exist yet (e.g. v25)
// returns a JSON "Method not found." once authenticated. Latest live version is
// v24 (verified 2026-05-27). Unauthenticated probes lie: Google's API frontend
// returns 401 for non-existent-but-pattern-valid versions, so the ONLY authoritative
// check is a real authed call. This test can't authenticate; it just guards against
// reverting to a known-sunset version. Bump the ceiling when you bump the provider.
test("fetchInsights calls a live Google Ads API version on searchStream", async () => {
  let searchStreamUrl = null;

  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
    }
    searchStreamUrl = String(url);
    return new Response(JSON.stringify([{ results: [] }]), { status: 200 });
  };

  try {
    await fetchInsights({
      refreshToken: "rt", customerId: "123-456-7890",
      clientId: "cid", clientSecret: "secret", developerToken: "dev",
      since: "2026-05-01", until: "2026-05-27",
    });
  } finally {
    globalThis.fetch = origFetch;
  }

  assert.ok(searchStreamUrl, "searchStream endpoint was called");
  const m = searchStreamUrl.match(/googleads\.googleapis\.com\/v(\d+)\//);
  assert.ok(m, `endpoint should hit googleads.googleapis.com/vNN/, got: ${searchStreamUrl}`);
  // v17 and earlier are sunset; v24 is the latest live version (2026-05-27).
  const version = Number(m[1]);
  assert.ok(version >= 21 && version <= 24, `expected a live API version 21-24, got v${version}`);
});

// The actionable reason for a 400 lives in the GoogleAdsFailure detail, not the
// generic top-level message. Surfacing it is what turned an opaque "invalid
// argument" into "metrics cannot be requested for a manager account".
test("fetchInsights surfaces the GoogleAdsFailure detail message, not the generic wrapper", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
    }
    return new Response(JSON.stringify([{
      error: {
        code: 400,
        message: "Request contains an invalid argument.",
        status: "INVALID_ARGUMENT",
        details: [{
          "@type": "type.googleapis.com/google.ads.googleads.v24.errors.GoogleAdsFailure",
          errors: [{ message: "Metrics cannot be requested for a manager account." }],
        }],
      },
    }]), { status: 400 });
  };

  try {
    await fetchInsights({
      refreshToken: "rt", customerId: "332-522-3529",
      clientId: "cid", clientSecret: "secret", developerToken: "dev",
      since: "2026-05-01", until: "2026-05-27",
    });
    assert.fail("expected fetchInsights to throw on a 400");
  } catch (err) {
    assert.match(err.message, /manager account/, `should surface the detail, got: ${err.message}`);
  } finally {
    globalThis.fetch = origFetch;
  }
});

// listClientAccounts queries customer_client against the manager (allowed — not
// a metrics query) and normalises the camelCased REST fields, flagging managers.
test("listClientAccounts maps client accounts under the manager and queries the manager id", async () => {
  let queriedUrl = null;
  let loginHeader = null;

  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
    }
    queriedUrl = String(url);
    loginHeader = opts.headers["login-customer-id"];
    return new Response(JSON.stringify([{
      results: [
        { customerClient: { id: "3325223529", descriptiveName: "Acme MCC", manager: true, status: "ENABLED", level: 0 } },
        { customerClient: { id: "1112223333", descriptiveName: "Clinic A", manager: false, status: "ENABLED", level: 1 } },
        { customerClient: { id: "4445556666", descriptiveName: "Clinic B", manager: false, status: "ENABLED", level: 1 } },
      ],
    }]), { status: 200 });
  };

  let accounts;
  try {
    accounts = await listClientAccounts({
      refreshToken: "rt", clientId: "cid", clientSecret: "secret",
      developerToken: "dev", managerId: "332-522-3529",
    });
  } finally {
    globalThis.fetch = origFetch;
  }

  // Manager id is normalised to digits in both the URL and the login header.
  assert.match(queriedUrl, /\/customers\/3325223529\/googleAds:searchStream$/);
  assert.equal(loginHeader, "3325223529");
  assert.equal(accounts.length, 3);
  const clinicA = accounts.find((a) => a.id === "1112223333");
  assert.equal(clinicA.name, "Clinic A");
  assert.equal(clinicA.manager, false);
  assert.equal(accounts.find((a) => a.id === "3325223529").manager, true);
});

// No manager id → clear, actionable error (don't blindly query an empty id).
test("listClientAccounts throws a clear error when no manager id is provided", async () => {
  await assert.rejects(
    listClientAccounts({ refreshToken: "rt", clientId: "c", clientSecret: "s", developerToken: "d" }),
    /No login\/manager customer id/,
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeProviderConfig, requiredMissing, googleCallArgs, isConfigured,
} from "./providerCreds.js";

// Deterministic fakes so we don't touch real crypto.
const fakeEncrypt = (s) => `enc(${s})`;
const fakeDecrypt = (s) => String(s).replace(/^enc\(|\)$/g, "");

test("mergeProviderConfig: sets plain ids and encrypts provided google secrets", () => {
  const cfg = mergeProviderConfig("google", {}, {
    client_id: "cid-1", login_customer_id: "999",
    client_secret: "secret", developer_token: "dev",
  }, fakeEncrypt);
  assert.deepEqual(cfg, {
    client_id: "cid-1", login_customer_id: "999",
    client_secret_enc: "enc(secret)", developer_token_enc: "enc(dev)",
  });
});

test("mergeProviderConfig: blank secret keeps the stored *_enc", () => {
  const existing = { client_id: "cid-1", client_secret_enc: "enc(old)", developer_token_enc: "enc(d)" };
  const cfg = mergeProviderConfig("google", existing, { client_id: "cid-2" }, fakeEncrypt);
  assert.equal(cfg.client_secret_enc, "enc(old)");   // untouched
  assert.equal(cfg.developer_token_enc, "enc(d)");    // untouched
  assert.equal(cfg.client_id, "cid-2");               // updated plain id
});

test("mergeProviderConfig: meta app creds", () => {
  const cfg = mergeProviderConfig("meta", {}, { app_id: "a1", app_secret: "sek" }, fakeEncrypt);
  assert.deepEqual(cfg, { app_id: "a1", app_secret_enc: "enc(sek)" });
});

test("requiredMissing: google first connect lists all missing fields", () => {
  const missing = requiredMissing("google", {}, { hasAccountId: false, hasTokenAfter: false });
  assert.deepEqual(missing.sort(), ["client_id", "client_secret", "developer_token", "external_account_id", "refresh_token"].sort());
});

test("requiredMissing: google edit with everything stored → none missing", () => {
  const cfg = { client_id: "c", client_secret_enc: "x", developer_token_enc: "y" };
  const missing = requiredMissing("google", cfg, { hasAccountId: true, hasTokenAfter: true });
  assert.deepEqual(missing, []);
});

test("requiredMissing: meta needs account id + access token, app creds optional", () => {
  assert.deepEqual(
    requiredMissing("meta", {}, { hasAccountId: true, hasTokenAfter: true }), []
  );
  assert.deepEqual(
    requiredMissing("meta", {}, { hasAccountId: false, hasTokenAfter: false }).sort(),
    ["access_token", "external_account_id"].sort()
  );
});

test("googleCallArgs: reads creds from this integration's config_json (isolation)", () => {
  const a = googleCallArgs({
    external_account_id: "111", refresh_token_enc: "enc(rtA)",
    config_json: { client_id: "cidA", client_secret_enc: "enc(secA)", developer_token_enc: "enc(devA)", login_customer_id: "mA" },
  }, fakeDecrypt);
  const b = googleCallArgs({
    external_account_id: "222", refresh_token_enc: "enc(rtB)",
    config_json: { client_id: "cidB", client_secret_enc: "enc(secB)", developer_token_enc: "enc(devB)" },
  }, fakeDecrypt);
  assert.deepEqual(a, { refreshToken: "rtA", customerId: "111", clientId: "cidA", clientSecret: "secA", developerToken: "devA", loginCustomerId: "mA" });
  assert.deepEqual(b, { refreshToken: "rtB", customerId: "222", clientId: "cidB", clientSecret: "secB", developerToken: "devB", loginCustomerId: null });
});

test("googleCallArgs: throws a business-scoped error when project creds missing", () => {
  assert.throws(
    () => googleCallArgs({ config_json: { client_id: "c" } }, fakeDecrypt),
    /not configured for this business/
  );
});

test("isConfigured: google needs project creds + token + account id", () => {
  assert.equal(isConfigured("google", {
    external_account_id: "1", has_refresh_token: true,
    client_id: "c", has_client_secret: true, has_developer_token: true,
  }), true);
  assert.equal(isConfigured("google", {
    external_account_id: "1", has_refresh_token: true,
    client_id: "c", has_client_secret: false, has_developer_token: true,
  }), false);
});

test("isConfigured: meta needs only account id + access token", () => {
  assert.equal(isConfigured("meta", { external_account_id: "act_1", has_access_token: true }), true);
  assert.equal(isConfigured("meta", { external_account_id: "act_1", has_access_token: false }), false);
});

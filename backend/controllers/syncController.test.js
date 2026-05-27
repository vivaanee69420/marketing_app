import { test } from "node:test";
import assert from "node:assert/strict";
import { decideSyncStatus } from "./syncController.js";

const meta = (status) => ({ businessId: "b", provider: "meta", status });
const google = (status) => ({ businessId: "b", provider: "google", status });

test("only Google connected and it succeeds: skipped Meta never forces 502", () => {
  assert.equal(decideSyncStatus([meta("skipped"), google("completed")]), 200);
});

test("only Google connected and it fails: real failure still 502", () => {
  assert.equal(decideSyncStatus([meta("skipped"), google("error")]), 502);
});

test("nothing connected: all skipped is a no-op, not a failure", () => {
  assert.equal(decideSyncStatus([meta("skipped"), google("skipped")]), 200);
});

test("both connected and both fail: 502", () => {
  assert.equal(decideSyncStatus([meta("error"), google("error")]), 502);
});

test("one of two connected fails, other completes: 200", () => {
  assert.equal(decideSyncStatus([meta("error"), google("completed")]), 200);
});

test("empty results: 200", () => {
  assert.equal(decideSyncStatus([]), 200);
});

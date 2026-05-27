import { test } from "node:test";
import assert from "node:assert/strict";
import { loginBlockCode, moderationError, USER_STATUS } from "./authPolicy.js";

test("loginBlockCode: approved may log in", () => {
  assert.equal(loginBlockCode(USER_STATUS.APPROVED), null);
});

test("loginBlockCode: pending is blocked with pending_approval", () => {
  assert.equal(loginBlockCode(USER_STATUS.PENDING), "pending_approval");
});

test("loginBlockCode: rejected is blocked with account_rejected", () => {
  assert.equal(loginBlockCode(USER_STATUS.REJECTED), "account_rejected");
});

test("loginBlockCode: unexpected status defaults to not-yet-allowed", () => {
  assert.equal(loginBlockCode(undefined), "pending_approval");
  assert.equal(loginBlockCode("garbage"), "pending_approval");
});

test("moderationError: allows approving another normal user", () => {
  const target = { user_id: "u2", is_superadmin: false };
  assert.equal(moderationError({ actorUserId: "u1", target, action: "approve" }), null);
});

test("moderationError: missing target → user_not_found", () => {
  assert.equal(moderationError({ actorUserId: "u1", target: null, action: "approve" }), "user_not_found");
});

test("moderationError: cannot moderate yourself", () => {
  const target = { user_id: "u1", is_superadmin: true };
  assert.equal(moderationError({ actorUserId: "u1", target, action: "reject" }), "cannot_moderate_self");
});

test("moderationError: cannot reject a superadmin", () => {
  const target = { user_id: "u2", is_superadmin: true };
  assert.equal(moderationError({ actorUserId: "u1", target, action: "reject" }), "cannot_reject_superadmin");
});

test("moderationError: approving a superadmin is fine (re-approve)", () => {
  const target = { user_id: "u2", is_superadmin: true };
  assert.equal(moderationError({ actorUserId: "u1", target, action: "approve" }), null);
});

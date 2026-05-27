/**
 * Pure auth-approval policy. No DB, no network — just the decision logic for
 * the signup-approval gate, so it's unit-testable in isolation. The service +
 * middleware wrap these decisions around the real data access.
 */

export const USER_STATUS = Object.freeze({
  PENDING:  "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

/**
 * Why a login should be blocked for a profile in this status, or null if the
 * login is allowed. Only an APPROVED account may sign in; anything else
 * (pending, rejected, or an unexpected value) is treated as not-yet-allowed.
 * @returns {null|'pending_approval'|'account_rejected'}
 */
export function loginBlockCode(status) {
  if (status === USER_STATUS.APPROVED) return null;
  if (status === USER_STATUS.REJECTED) return "account_rejected";
  return "pending_approval";
}

/**
 * Validate a superadmin moderation action against a target user. Returns an
 * error code or null if the action is allowed.
 * @param {object} args
 * @param {string} args.actorUserId  - the superadmin performing the action
 * @param {object|null} args.target  - target profile { user_id, is_superadmin }
 * @param {'approve'|'reject'} args.action
 * @returns {null|'user_not_found'|'cannot_moderate_self'|'cannot_reject_superadmin'}
 */
export function moderationError({ actorUserId, target, action }) {
  if (!target) return "user_not_found";
  if (target.user_id === actorUserId) return "cannot_moderate_self";
  if (action === "reject" && target.is_superadmin) return "cannot_reject_superadmin";
  return null;
}

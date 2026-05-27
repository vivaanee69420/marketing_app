import { z } from "zod";
import * as authRepo from "../repositories/authRepository.js";
import { moderationError, USER_STATUS } from "../services/authPolicy.js";

// Admin = superadmin-only user moderation. Routes are already gated by
// requireAuth + requireSuperadmin; these run on the base pool (profiles is not
// org-scoped — a user exists before any org context).

const idSchema = z.object({ id: z.string().uuid() });

export async function listUsers(_req, res, next) {
  try {
    const users = await authRepo.listUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

/** Approve or reject a user. `action` is bound by the route. */
function moderate(action, status) {
  return async (req, res, next) => {
    try {
      const { id } = idSchema.parse(req.params);
      const target = await authRepo.getProfileById(id);

      const code = moderationError({ actorUserId: req.user.id, target, action });
      if (code) {
        const httpStatus = code === "user_not_found" ? 404 : 409;
        return res.status(httpStatus).json({ error: code });
      }

      const updated = await authRepo.setUserStatus(id, status);
      res.json({ user: updated });
    } catch (err) {
      next(err);
    }
  };
}

export const approve = moderate("approve", USER_STATUS.APPROVED);
export const reject = moderate("reject", USER_STATUS.REJECTED);

import { signupSchema, loginSchema } from "../utils/authValidation.js";
import { setSession, clearSession } from "../utils/sessionCookies.js";
import * as authService from "../services/authService.js";

// Shape the user we return to the client — never tokens (those live in the
// httpOnly cookie) and never password material.
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.user_metadata?.username ?? null,
});

export async function signup(req, res, next) {
  try {
    const input = signupSchema.parse(req.body);
    const { user, ...session } = await authService.signUp(input);
    setSession(res, session);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const input = loginSchema.parse(req.body);
    const { user, ...session } = await authService.signIn(input);
    setSession(res, session);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// Token lives in an httpOnly cookie, so logout must clear it server-side.
export function logout(_req, res) {
  clearSession(res);
  res.json({ ok: true });
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

import { signupSchema, loginSchema } from "../utils/authValidation.js";
import { setSession, clearSession } from "../utils/sessionCookies.js";
import * as authService from "../services/authService.js";
import { getProfileFlags } from "../repositories/authRepository.js";

// Shape the user we return to the client — never tokens (those live in the
// httpOnly cookie) and never password material. is_superadmin is display-only;
// access control is always re-checked server-side.
const publicUser = (user, isSuperadmin = false) => ({
  id: user.id,
  email: user.email,
  username: user.user_metadata?.username ?? null,
  is_superadmin: !!isSuperadmin,
});

export async function signup(req, res, next) {
  try {
    const input = signupSchema.parse(req.body);
    // No session is issued — the account is pending superadmin approval.
    await authService.signUp(input);
    res.status(201).json({ status: "pending" });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const input = loginSchema.parse(req.body);
    const { user, is_superadmin, ...session } = await authService.signIn(input);
    // Set the httpOnly cookie (works same-origin) AND return the access token in
    // the body. The SPA stores the token and sends it as `Authorization: Bearer`,
    // which is what survives the SPA/API being on separate domains where the
    // cross-domain cookie can't be relied on. readAccessToken accepts either.
    setSession(res, session);
    res.json({ user: publicUser(user, is_superadmin), token: session.access_token });
  } catch (err) {
    next(err);
  }
}

// Token lives in an httpOnly cookie, so logout must clear it server-side.
export function logout(_req, res) {
  clearSession(res);
  res.json({ ok: true });
}

export async function me(req, res, next) {
  try {
    const flags = await getProfileFlags(req.user.id);
    res.json({ user: publicUser(req.user, flags?.is_superadmin) });
  } catch (err) {
    next(err);
  }
}

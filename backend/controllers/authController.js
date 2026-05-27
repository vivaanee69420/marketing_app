import { z } from "zod";
import * as authService from "../services/authService.js";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "password must be at least 8 characters"),
  name: z.string().min(1).max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function signup(req, res, next) {
  try {
    const input = signupSchema.parse(req.body);
    const result = await authService.signUp(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.signIn(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Stateless JWT — logout is client-side (discard the token). Endpoint exists
// for symmetry and future refresh-token revocation.
export async function logout(_req, res) {
  res.json({ ok: true });
}

export async function me(req, res) {
  const { id, email, user_metadata } = req.user;
  res.json({ id, email, name: user_metadata?.name ?? null });
}

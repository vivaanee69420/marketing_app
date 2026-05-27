import { ZodError } from "zod";

// Central error handler. Express 5 forwards async throws here automatically,
// but our controllers also call next(err).
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "validation_failed",
      fields: err.flatten().fieldErrors,
    });
  }
  const status = err.status || 500;
  if (status >= 500) console.error("[error]", err);
  res.status(status).json({ error: err.message || "internal_error" });
}

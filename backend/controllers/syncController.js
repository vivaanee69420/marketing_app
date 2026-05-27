import { z } from "zod";
import * as syncService from "../services/syncService.js";

const schema = z.object({
  business_id: z.string().uuid(),
  provider: z.enum(["meta", "google"]).optional(),
});

/**
 * HTTP status for a sync run. Skipped (not-connected) providers don't count —
 * 502 only when every provider we actually attempted failed. So a lone
 * connected Google still 502s on its own failure, but an unconnected Meta
 * never forces a 502 on its own.
 */
export function decideSyncStatus(results) {
  const attempted = results.filter((r) => r.status !== "skipped");
  const allErr = attempted.length > 0 && attempted.every((r) => r.status === "error");
  return allErr ? 502 : 200;
}

export async function run(req, res, next) {
  try {
    const { business_id, provider } = schema.parse(req.body);
    const results = provider
      ? [await syncService.syncOne(business_id, provider)]
      : await syncService.syncBusiness(business_id);

    res.status(decideSyncStatus(results)).json({ results });
  } catch (err) {
    next(err);
  }
}

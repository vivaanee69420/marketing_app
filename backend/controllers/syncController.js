import { z } from "zod";
import * as syncService from "../services/syncService.js";

const schema = z.object({
  business_id: z.string().uuid(),
  provider: z.enum(["meta", "google"]).optional(),
});

export async function run(req, res, next) {
  try {
    const { business_id, provider } = schema.parse(req.body);
    const results = provider
      ? [await syncService.syncOne(business_id, provider)]
      : await syncService.syncBusiness(business_id);

    // 502 only if every attempted provider failed; otherwise 200 with per-provider status.
    const allErr = results.length > 0 && results.every((r) => r.status === "error");
    res.status(allErr ? 502 : 200).json({ results });
  } catch (err) {
    next(err);
  }
}

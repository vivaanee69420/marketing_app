import { z } from "zod";
import * as syncService from "../services/syncService.js";

const schema = z.object({
  business_id: z.string().uuid(),
  provider: z.enum(["meta", "google"]).optional(),
});

const FAILED = new Set(["error", "token_expired"]);

/**
 * HTTP status for a sync run. Skipped (not-connected) providers don't count.
 * 502 only when every attempted provider failed (error or token_expired).
 */
export function decideSyncStatus(results) {
  const attempted = results.filter((r) => r.status !== "skipped");
  const allErr = attempted.length > 0 && attempted.every((r) => FAILED.has(r.status));
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

/**
 * SSE variant: streams progress events while the sync runs. Frontend opens
 * this via `fetch` + ReadableStream (EventSource is GET-only).
 *
 * Events:
 *   event: progress  data: { phase, done?, total?, businessId?, provider? }
 *   event: result    data: { results: [...] }     ← final
 *   event: error     data: { message }            ← only on validation/server errors
 *
 * The connection is kept open until `result` is sent, then closed.
 */
export async function runStream(req, res, next) {
  let parsed;
  try {
    parsed = schema.parse(req.body);
  } catch (err) {
    return next(err);
  }
  const { business_id, provider } = parsed;

  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  // 2KB padding prelude. Many reverse proxies (nginx default, Cloudflare,
  // Railway edge) buffer small responses until ~2KB before forwarding the
  // first chunk to the client, which manifested as "bar stuck at 2%" until
  // the sync finished. The padding is an SSE comment line (leading `:`), so
  // EventSource / our parser both ignore it.
  res.write(`:${" ".repeat(2048)}\n\n`);
  res.write(`event: open\ndata: {}\n\n`);

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Tight heartbeat for the first 10 seconds covers proxies that only flush
  // once N bytes have accumulated AND the slow-fetch case where the provider
  // call can take 5-30s before the first real progress event fires.
  let fastTicks = 0;
  const fastHeartbeat = setInterval(() => {
    res.write(`: ping\n\n`);
    if (++fastTicks >= 5) clearInterval(fastHeartbeat);
  }, 2_000);
  // Steady-state heartbeat: every 15s, stops proxies from killing the conn.
  const slowHeartbeat = setInterval(() => res.write(`: ping\n\n`), 15_000);
  req.on("close", () => {
    clearInterval(fastHeartbeat);
    clearInterval(slowHeartbeat);
  });

  const onProgress = (p) => send("progress", p);

  try {
    const results = provider
      ? [await syncService.syncOne(business_id, provider, undefined, onProgress)]
      : await syncService.syncBusiness(business_id, undefined, onProgress);
    send("result", { results });
  } catch (err) {
    send("error", { message: err.message });
  } finally {
    clearInterval(fastHeartbeat);
    clearInterval(slowHeartbeat);
    res.end();
  }
}

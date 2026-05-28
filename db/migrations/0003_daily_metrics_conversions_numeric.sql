-- 0003: daily_metrics.conversions must be numeric, not integer.
--
-- Google Ads returns fractional conversions (e.g. 0.5 for shared-credit
-- attribution, multi-conversion-tracking, or value/conversion weighting).
-- The old integer column aborted tx2 in syncService with
-- "invalid input syntax for type integer: \"0.5\"" — the user-visible
-- symptom was "Google sync stuck / silently fails on Warwick" (see
-- TODOS.md and the 3-txn-refactor commit message for context).
--
-- Applied to the live Supabase project on 2026-05-28 via the Supabase MCP
-- (migration name: daily_metrics_conversions_numeric). This file mirrors
-- that change so a fresh restore from db/schema.sql + db/migrations/ stays
-- consistent.

ALTER TABLE daily_metrics
  ALTER COLUMN conversions TYPE numeric(12,2) USING conversions::numeric;

/**
 * Meta Ads provider — fetches ad-level spend insights via the Meta Graph API.
 *
 * Endpoint: GET https://graph.facebook.com/v20.0/act_<id>/insights
 *   level=ad, time_increment=1 (one row per day per ad)
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/reference/adgroup/insights/
 */

// Conversion action_types we treat as a "conversion" event.
const CONVERSION_ACTION_TYPES = ['lead', 'purchase', 'offsite_conversion', 'onsite_conversion'];

/**
 * Returns true if an action_type string counts as a conversion.
 * Matches exact equality for 'purchase', substring match for the others.
 *
 * @param {string} actionType
 * @returns {boolean}
 */
function isConversionAction(actionType) {
  if (!actionType) return false;
  if (actionType === 'purchase') return true;
  return CONVERSION_ACTION_TYPES.some((t) => actionType.includes(t));
}

/**
 * Sum conversion values from the `actions` array in a Meta insight row.
 * Defensive: if actions is undefined/null, returns 0.
 *
 * @param {Array<{action_type: string, value: string|number}>|undefined} actions
 * @returns {number}
 */
function sumConversions(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return 0;
  return actions.reduce((total, action) => {
    if (isConversionAction(action.action_type)) {
      return total + Number(action.value || 0);
    }
    return total;
  }, 0);
}

/**
 * Normalize accountId: strip whitespace, and prefix `act_` if not already present.
 *
 * @param {string} accountId
 * @returns {string}
 */
function normalizeAccountId(accountId) {
  const trimmed = String(accountId).trim();
  return trimmed.startsWith('act_') ? trimmed : `act_${trimmed}`;
}

/**
 * Map a single raw Meta insight row to the normalized shape expected by the app.
 *
 * @param {object} row - Raw row from the Meta API response.
 * @returns {object} Normalized insight object.
 */
function mapRow(row) {
  return {
    date: row.date_start, // 'YYYY-MM-DD' (Meta returns date_start per time_increment=1)
    campaign: {
      externalId: row.campaign_id,
      name: row.campaign_name,
    },
    adSet: row.adset_id
      ? { externalId: row.adset_id, name: row.adset_name }
      : null,
    ad: row.ad_id
      ? { externalId: row.ad_id, name: row.ad_name }
      : null,
    spend: Number(row.spend || 0),
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    conversions: sumConversions(row.actions),
  };
}

/**
 * Fetch ad-level insights from the Meta Graph API for a given date range.
 *
 * Paginates automatically via `paging.next` (capped at 50 pages for safety).
 * Returns a flat normalized array — NOT wrapped in an object.
 *
 * @param {object} params
 * @param {string} params.accessToken  - Meta user or system access token.
 * @param {string} params.accountId    - Ad account ID (with or without 'act_' prefix).
 * @param {string} params.since        - Start date, 'YYYY-MM-DD'.
 * @param {string} params.until        - End date, 'YYYY-MM-DD'.
 * @returns {Promise<Array>} Array of normalized insight objects.
 */
export async function fetchInsights({ accessToken, accountId, since, until }) {
  const actId = normalizeAccountId(accountId);
  const BASE = `https://graph.facebook.com/v20.0/${actId}/insights`;

  // Build initial query params using URLSearchParams so values are properly encoded.
  const params = new URLSearchParams({
    level: 'ad',
    time_increment: '1',
    fields: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,clicks,impressions,actions',
    time_range: JSON.stringify({ since, until }), // URLSearchParams will encode this
    limit: '500',
    access_token: accessToken,
  });

  let nextUrl = `${BASE}?${params.toString()}`;
  const allRows = [];
  const MAX_PAGES = 50; // safety guard to avoid infinite loops
  let pageCount = 0;

  while (nextUrl && pageCount < MAX_PAGES) {
    pageCount += 1;

    // Use global fetch (Node 22+, no node-fetch dependency needed)
    const res = await fetch(nextUrl);

    if (!res.ok) {
      // Read body text for context, truncate to ~300 chars for the error message
      const bodyText = await res.text();
      const bodySnippet = bodyText.slice(0, 300);
      throw new Error(`Meta API ${res.status}: ${bodySnippet}`);
    }

    const json = await res.json();

    // Guard against API-level errors returned with HTTP 200
    if (json.error) {
      throw new Error(`Meta API error: ${json.error.message}`);
    }

    // Accumulate rows from this page
    const rows = Array.isArray(json.data) ? json.data : [];
    for (const row of rows) {
      allRows.push(mapRow(row));
    }

    // Follow pagination cursor if present
    nextUrl = json.paging && json.paging.next ? json.paging.next : null;
  }

  return allRows;
}

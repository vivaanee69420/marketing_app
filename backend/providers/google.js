/**
 * Google Ads provider — Google Ads REST API v24
 *
 * Endpoint: POST https://googleads.googleapis.com/v24/customers/<customerId>/googleAds:searchStream
 * Query target: ad_group_ad (GAQL), joining campaign, ad_group, ad_group_ad, segments, metrics
 * spend = metrics.cost_micros / 1_000_000  (micros → currency units)
 *
 * Docs: https://developers.google.com/google-ads/api/docs/query/overview
 *
 * API_VERSION is the one knob to turn when Google sunsets a version (a sunset
 * version returns a generic 404 HTML page; a not-yet-released version returns a
 * JSON "Method not found."). Check the release notes before bumping:
 * https://developers.google.com/google-ads/api/docs/release-notes
 */

const API_VERSION = 'v24';
const ADS_BASE = `https://googleads.googleapis.com/${API_VERSION}`;

/** Exchange an OAuth2 refresh token for a short-lived access token. */
async function getAccessToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }).toString(),
  });
  if (!res.ok) {
    const snippet = (await res.text()).slice(0, 300);
    throw new Error(`Google OAuth ${res.status}: ${snippet}`);
  }
  const { access_token: accessToken } = await res.json();
  return accessToken;
}

/** Build the Ads API request headers; login-customer-id only when a manager CID is set. */
function adsHeaders({ accessToken, developerToken, loginCid }) {
  const headers = {
    'Authorization':   `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type':    'application/json',
  };
  if (loginCid) headers['login-customer-id'] = loginCid;
  return headers;
}

/**
 * Turn an Ads API error body into a human-readable message. The actionable
 * reason lives in the GoogleAdsFailure detail; the top-level `message` is often
 * just a generic "Request contains an invalid argument."
 */
function parseAdsError(rawBody, status) {
  let message = rawBody.slice(0, 500);
  try {
    const parsed = JSON.parse(rawBody);
    const errObj = Array.isArray(parsed) ? parsed[0] : parsed;
    const err = errObj?.error;
    if (err) {
      const detailMsgs = (err.details ?? [])
        .flatMap((d) => d?.errors ?? [])
        .map((e) => e?.message)
        .filter(Boolean);
      message = detailMsgs.length ? detailMsgs.join(' | ') : (err.message ?? message);
    }
  } catch {
    // leave message as the raw snippet
  }
  return `Google Ads ${status}: ${message}`;
}

/** Normalise a customer id to digits only (Google rejects spaces/dashes). */
function digits(id) {
  return String(id).replace(/[\s-]/g, '');
}

/**
 * Fetch campaign/ad-group/ad performance insights from Google Ads.
 * BYO per tenant: the Google API project creds (clientId/clientSecret/
 * developerToken/loginCustomerId) come from the org's stored settings, NOT env.
 *
 * @param {object}  opts
 * @param {string}  opts.refreshToken      - OAuth2 refresh token (per ad account)
 * @param {string}  opts.customerId        - Google Ads customer ID (digits or dashes)
 * @param {string}  opts.clientId          - org's Google OAuth client id
 * @param {string}  opts.clientSecret      - org's Google OAuth client secret
 * @param {string}  opts.developerToken    - org's Google Ads developer token
 * @param {string} [opts.loginCustomerId]  - org's manager/login customer id (optional)
 * @param {string}  opts.since             - Start date 'YYYY-MM-DD' (inclusive)
 * @param {string}  opts.until             - End date   'YYYY-MM-DD' (inclusive)
 * @returns {Promise<Array>} Normalized row array
 */
export async function fetchInsights({
  refreshToken, customerId, clientId, clientSecret, developerToken, loginCustomerId, since, until,
}) {
  // ── 1. Validate the org's Google project credentials ────────────────────────
  if (!clientId || !clientSecret || !developerToken) {
    throw new Error(
      "Google API project not configured for this organisation — set client id, client secret and developer token in Settings → Integrations"
    );
  }

  // ── 2. Normalise customer IDs (Google requires digits only) ─────────────────
  const cid      = digits(customerId);
  const loginCid = loginCustomerId ? digits(loginCustomerId) : null;

  // ── 3. Exchange refresh token for an access token ───────────────────────────
  const accessToken = await getAccessToken({ clientId, clientSecret, refreshToken });

  // ── 4. Build GAQL query ─────────────────────────────────────────────────────
  const gaql = `
    SELECT campaign.id, campaign.name,
           ad_group.id, ad_group.name,
           ad_group_ad.ad.id, ad_group_ad.ad.name,
           segments.date,
           metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions
    FROM ad_group_ad
    WHERE segments.date BETWEEN '${since}' AND '${until}'
  `.trim();

  // ── 5. Call searchStream ────────────────────────────────────────────────────
  const adsRes = await fetch(
    `${ADS_BASE}/customers/${cid}/googleAds:searchStream`,
    {
      method:  'POST',
      headers: adsHeaders({ accessToken, developerToken, loginCid }),
      body:    JSON.stringify({ query: gaql }),
    }
  );

  if (!adsRes.ok) {
    throw new Error(parseAdsError(await adsRes.text(), adsRes.status));
  }

  // searchStream returns an array of chunk objects, each with a `results` array
  const chunks = await adsRes.json();
  const results = (Array.isArray(chunks) ? chunks : [chunks])
    .flatMap((chunk) => chunk?.results ?? []);

  // ── 6. Map rows to normalised shape ────────────────────────────────────────
  return results.map((row) => ({
    date:        row?.segments?.date ?? null,

    campaign: {
      externalId: String(row?.campaign?.id   ?? ''),
      name:       String(row?.campaign?.name ?? ''),
    },

    // ad_group maps to adSet; guard in case the field is absent
    adSet: row?.adGroup
      ? {
          externalId: String(row.adGroup.id   ?? ''),
          name:       String(row.adGroup.name ?? ''),
        }
      : null,

    // ad_group_ad.ad maps to ad; guard nested path
    ad: row?.adGroupAd?.ad
      ? {
          externalId: String(row.adGroupAd.ad.id   ?? ''),
          name:       String(row.adGroupAd.ad.name ?? ''),
        }
      : null,

    // cost_micros is a string in the REST response; divide by 1e6 for currency
    spend:       Number(row?.metrics?.costMicros  || 0) / 1e6,
    clicks:      Number(row?.metrics?.clicks      || 0),
    impressions: Number(row?.metrics?.impressions || 0),
    conversions: Number(row?.metrics?.conversions || 0),
  }));
}

/**
 * List the client (leaf) accounts reachable under a manager account, so the
 * operator can pick the right Customer ID instead of guessing. Metrics are
 * forbidden on a manager account, but the `customer_client` resource is not —
 * it's queried against the manager itself.
 *
 * @param {object}  opts
 * @param {string}  opts.refreshToken
 * @param {string}  opts.clientId
 * @param {string}  opts.clientSecret
 * @param {string}  opts.developerToken
 * @param {string}  opts.managerId  - the manager/login customer id to enumerate under
 * @returns {Promise<Array<{id:string,name:string,manager:boolean,status:string,level:number}>>}
 */
export async function listClientAccounts({
  refreshToken, clientId, clientSecret, developerToken, managerId,
}) {
  if (!clientId || !clientSecret || !developerToken) {
    throw new Error(
      "Google API project not configured for this organisation — set client id, client secret and developer token in Settings → Integrations"
    );
  }
  if (!managerId) {
    throw new Error("No login/manager customer id set — add it in Settings → Integrations to list accounts");
  }

  const cid = digits(managerId);
  const accessToken = await getAccessToken({ clientId, clientSecret, refreshToken });

  // level <= 1 = the manager itself (0) plus its direct client accounts (1).
  const gaql = `
    SELECT customer_client.id, customer_client.descriptive_name,
           customer_client.manager, customer_client.status, customer_client.level
    FROM customer_client
    WHERE customer_client.level <= 1
  `.trim();

  const res = await fetch(
    `${ADS_BASE}/customers/${cid}/googleAds:searchStream`,
    {
      method:  'POST',
      headers: adsHeaders({ accessToken, developerToken, loginCid: cid }),
      body:    JSON.stringify({ query: gaql }),
    }
  );

  if (!res.ok) {
    throw new Error(parseAdsError(await res.text(), res.status));
  }

  const chunks = await res.json();
  const rows = (Array.isArray(chunks) ? chunks : [chunks])
    .flatMap((chunk) => chunk?.results ?? []);

  return rows.map((row) => {
    const c = row?.customerClient ?? {};
    return {
      id:      String(c.id ?? ''),
      name:    String(c.descriptiveName ?? ''),
      manager: Boolean(c.manager),
      status:  String(c.status ?? ''),
      level:   Number(c.level ?? 0),
    };
  });
}

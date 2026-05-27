/**
 * Google Ads provider — Google Ads REST API v17
 *
 * Endpoint: POST https://googleads.googleapis.com/v17/customers/<customerId>/googleAds:searchStream
 * Query target: ad_group_ad (GAQL), joining campaign, ad_group, ad_group_ad, segments, metrics
 * spend = metrics.cost_micros / 1_000_000  (micros → currency units)
 *
 * Docs: https://developers.google.com/google-ads/api/docs/query/overview
 */

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
  const devToken = developerToken;
  if (!clientId || !clientSecret || !devToken) {
    throw new Error(
      "Google API project not configured for this organisation — set client id, client secret and developer token in Settings → Integrations"
    );
  }

  // ── 2. Normalise customer IDs (Google requires digits only) ─────────────────
  const cid      = String(customerId).replace(/[\s-]/g, '');
  const loginCid = loginCustomerId ? String(loginCustomerId).replace(/[\s-]/g, '') : null;

  // ── 3. Exchange refresh token for an access token ───────────────────────────
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }).toString(),
  });

  if (!tokenRes.ok) {
    const snippet = (await tokenRes.text()).slice(0, 300);
    throw new Error(`Google OAuth ${tokenRes.status}: ${snippet}`);
  }

  const { access_token: accessToken } = await tokenRes.json();

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
  const adsHeaders = {
    'Authorization':   `Bearer ${accessToken}`,
    'developer-token': devToken,
    'Content-Type':    'application/json',
  };

  // Only include login-customer-id header when a manager/login CID is provided
  if (loginCid) {
    adsHeaders['login-customer-id'] = loginCid;
  }

  const adsRes = await fetch(
    `https://googleads.googleapis.com/v17/customers/${cid}/googleAds:searchStream`,
    {
      method:  'POST',
      headers: adsHeaders,
      body:    JSON.stringify({ query: gaql }),
    }
  );

  if (!adsRes.ok) {
    const rawBody   = await adsRes.text();
    const snippet   = rawBody.slice(0, 300);

    // Try to surface a human-readable message from the error body
    let message = snippet;
    try {
      const parsed = JSON.parse(rawBody);
      // Body can be an array [{error:{message}}] or object {error:{message}}
      const errObj = Array.isArray(parsed) ? parsed[0] : parsed;
      if (errObj?.error?.message) {
        message = errObj.error.message;
      }
    } catch {
      // leave message as the raw snippet
    }

    throw new Error(`Google Ads ${adsRes.status}: ${message}`);
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

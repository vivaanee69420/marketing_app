// Integrations: one row per (org, business, provider). Tokens stored encrypted
// (access_token_enc / refresh_token_enc). org_id comes from the session var set
// by withOrg, so callers never pass it and RLS still enforces tenancy.

const ORG = `nullif(current_setting('app.current_org', true), '')::uuid`;

/** Connection status per business+provider — NO secrets returned. */
export async function listStatus(tx) {
  const { rows } = await tx.query(
    `select i.id, i.business_id, b.name as business_name, i.provider, i.status,
            i.external_account_id, i.account_name, i.last_sync_at,
            i.last_sync_status, i.last_error,
            (i.access_token_enc is not null)  as has_access_token,
            (i.refresh_token_enc is not null) as has_refresh_token
       from integrations i
       join businesses b on b.id = i.business_id
      order by b.name, i.provider`
  );
  return rows;
}

/** Full row INCLUDING encrypted tokens — for the sync engine only. */
export async function getByBusinessProvider(tx, businessId, provider) {
  const { rows } = await tx.query(
    `select * from integrations where business_id = $1 and provider = $2`,
    [businessId, provider]
  );
  return rows[0] || null;
}

/** Insert or update credentials for a business+provider. */
export async function upsert(tx, { businessId, provider, externalAccountId, accountName, accessTokenEnc, refreshTokenEnc }) {
  const { rows } = await tx.query(
    `insert into integrations
       (org_id, business_id, provider, status, external_account_id, account_name,
        access_token_enc, refresh_token_enc, updated_at)
     values (${ORG}, $1, $2, 'connected', $3, $4, $5, $6, now())
     on conflict (org_id, business_id, provider) do update set
       status              = 'connected',
       external_account_id = excluded.external_account_id,
       account_name        = excluded.account_name,
       access_token_enc    = coalesce(excluded.access_token_enc, integrations.access_token_enc),
       refresh_token_enc   = coalesce(excluded.refresh_token_enc, integrations.refresh_token_enc),
       last_error          = null,
       updated_at          = now()
     returning id, business_id, provider, status, external_account_id, account_name`,
    [businessId, provider, externalAccountId, accountName, accessTokenEnc, refreshTokenEnc]
  );
  return rows[0];
}

/** Record sync outcome on the integration row. */
export async function markSync(tx, { businessId, provider, status, error }) {
  await tx.query(
    `update integrations
        set last_sync_at = now(), last_sync_status = $3, last_error = $4
      where business_id = $1 and provider = $2`,
    [businessId, provider, status, error || null]
  );
}

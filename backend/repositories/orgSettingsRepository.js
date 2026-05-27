// Org-level provider app/project credentials (BYO per tenant). One row per
// (org, provider); config jsonb holds non-secret ids + *_enc secret envelopes.
// org_id from the session var set by withOrg.

const ORG = `nullif(current_setting('app.current_org', true), '')::uuid`;

export async function getProviderSettings(tx, provider) {
  const { rows } = await tx.query(
    `select provider, config, updated_at
       from org_integration_settings
      where provider = $1`,
    [provider]
  );
  return rows[0] || null;
}

/** Merge-upsert: caller passes the already-merged config object. */
export async function upsertProviderSettings(tx, provider, config) {
  const { rows } = await tx.query(
    `insert into org_integration_settings (org_id, provider, config, updated_at)
     values (${ORG}, $1, $2::jsonb, now())
     on conflict (org_id, provider) do update
       set config = excluded.config, updated_at = now()
     returning provider, config, updated_at`,
    [provider, JSON.stringify(config)]
  );
  return rows[0];
}

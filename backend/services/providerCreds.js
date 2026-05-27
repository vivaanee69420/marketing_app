/**
 * Pure helpers for per-business provider credentials stored in
 * integrations.config_json. No DB, no network — crypto fns are injected so
 * these are unit-testable in isolation.
 *
 * config_json shape:
 *   google: { client_id, client_secret_enc, developer_token_enc, login_customer_id? }
 *   meta:   { app_id?, app_secret_enc? }
 */

// plain ids stored as-is; secrets encrypted to `<field>_enc`.
const FIELD_MAP = {
  google: { plain: ["client_id", "login_customer_id"], secret: ["client_secret", "developer_token"] },
  meta:   { plain: ["app_id"], secret: ["app_secret"] },
};

/**
 * Merge submitted creds into the existing config. Plain ids overwrite when
 * present; a secret is encrypted+written ONLY when a new value was submitted,
 * so a blank field on edit keeps the stored ciphertext.
 */
export function mergeProviderConfig(provider, existing, input, encrypt) {
  const map = FIELD_MAP[provider];
  const cfg = { ...(existing || {}) };
  for (const f of map.plain) if (input[f] !== undefined) cfg[f] = input[f];
  for (const f of map.secret) if (input[f] !== undefined) cfg[`${f}_enc`] = encrypt(input[f]);
  return cfg;
}

/**
 * Fields still missing for a usable connection, accounting for already-stored
 * values. `hasAccountId` / `hasTokenAfter` = provided-now OR already-stored.
 */
export function requiredMissing(provider, mergedConfig, { hasAccountId, hasTokenAfter }) {
  const missing = [];
  if (!hasAccountId) missing.push("external_account_id");
  if (provider === "google") {
    if (!mergedConfig.client_id) missing.push("client_id");
    if (!mergedConfig.client_secret_enc) missing.push("client_secret");
    if (!mergedConfig.developer_token_enc) missing.push("developer_token");
    if (!hasTokenAfter) missing.push("refresh_token");
  } else {
    if (!hasTokenAfter) missing.push("access_token");
  }
  return missing;
}

/** Build the Google provider call args from an integration row. */
export function googleCallArgs(integration, decrypt) {
  const cfg = integration.config_json || {};
  if (!cfg.client_id || !cfg.client_secret_enc || !cfg.developer_token_enc) {
    throw new Error(
      "Google project not configured for this business — add client id, client secret and developer token in Settings → Integrations"
    );
  }
  return {
    refreshToken:   decrypt(integration.refresh_token_enc),
    customerId:     integration.external_account_id,
    clientId:       cfg.client_id,
    clientSecret:   decrypt(cfg.client_secret_enc),
    developerToken: decrypt(cfg.developer_token_enc),
    loginCustomerId: cfg.login_customer_id || null,
  };
}

/** Derived "ready to sync" flag from a listStatus row (no secrets). */
export function isConfigured(provider, row) {
  if (!row.external_account_id) return false;
  if (provider === "google") {
    return !!(row.client_id && row.has_client_secret && row.has_developer_token && row.has_refresh_token);
  }
  return !!row.has_access_token;
}

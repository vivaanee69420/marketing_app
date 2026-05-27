import { z } from "zod";
import { withOrg } from "../config/db.js";
import { encrypt } from "../utils/crypto.js";
import * as repo from "../repositories/orgSettingsRepository.js";

// Per-provider field maps. `plain` = non-secret ids stored as-is; `secret` =
// encrypted as `<field>_enc`. `required` = needed for the provider to be usable.
const FIELDS = {
  google: {
    plain: ["client_id", "login_customer_id"],
    secret: ["client_secret", "developer_token"],
    required: ["client_id", "client_secret_enc", "developer_token_enc"],
  },
  meta: {
    plain: ["app_id"],
    secret: ["app_secret"],
    required: [], // manual long-lived token mode needs no app-level creds
  },
};

const providerParam = z.enum(["meta", "google"]);

const saveSchema = z.object({
  client_id: z.string().min(1).optional(),
  client_secret: z.string().min(1).optional(),
  developer_token: z.string().min(1).optional(),
  login_customer_id: z.string().optional(),
  app_id: z.string().min(1).optional(),
  app_secret: z.string().min(1).optional(),
});

// Safe view: plain values + has_<secret> booleans + `configured`. Never secrets.
function safeView(provider, config = {}) {
  const map = FIELDS[provider];
  const out = { provider, configured: map.required.every((k) => config[k] != null) };
  for (const f of map.plain) out[f] = config[f] ?? null;
  for (const f of map.secret) out[`has_${f}`] = config[`${f}_enc`] != null;
  return out;
}

export async function get(req, res, next) {
  try {
    const provider = providerParam.parse(req.params.provider);
    const row = await withOrg((tx) => repo.getProviderSettings(tx, provider));
    res.json({ settings: safeView(provider, row?.config || {}) });
  } catch (err) {
    next(err);
  }
}

export async function save(req, res, next) {
  try {
    const provider = providerParam.parse(req.params.provider);
    const input = saveSchema.parse(req.body);
    const map = FIELDS[provider];

    const result = await withOrg(async (tx) => {
      const existing = (await repo.getProviderSettings(tx, provider))?.config || {};
      const config = { ...existing };
      for (const f of map.plain) {
        if (input[f] !== undefined) config[f] = input[f];
      }
      for (const f of map.secret) {
        if (input[f] !== undefined) config[`${f}_enc`] = encrypt(input[f]);
      }
      const saved = await repo.upsertProviderSettings(tx, provider, config);
      return saved.config;
    });

    res.status(201).json({ settings: safeView(provider, result) });
  } catch (err) {
    next(err);
  }
}

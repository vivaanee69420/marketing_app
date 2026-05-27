import { z } from "zod";
import { withOrg } from "../config/db.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import * as repo from "../repositories/integrationRepository.js";
import { mergeProviderConfig, requiredMissing, isConfigured, googleCallArgs } from "../services/providerCreds.js";
import { listClientAccounts } from "../providers/google.js";

// Manual credential entry (no OAuth in this slice). Per-business project/app creds
// live in config_json. Account-level: Meta act_<id>+access_token, Google customer
// id+refresh_token. Secrets left blank on edit keep their stored value.
const saveSchema = z.object({
  business_id: z.string().uuid(),
  provider: z.enum(["meta", "google"]),
  external_account_id: z.string().min(1, "account/customer id is required"),
  account_name: z.string().max(200).optional(),
  access_token: z.string().min(1).optional(),
  refresh_token: z.string().min(1).optional(),
  // Google project creds
  client_id: z.string().min(1).optional(),
  client_secret: z.string().min(1).optional(),
  developer_token: z.string().min(1).optional(),
  login_customer_id: z.string().optional(),
  // Meta app creds (optional)
  app_id: z.string().min(1).optional(),
  app_secret: z.string().min(1).optional(),
});

export async function list(_req, res, next) {
  try {
    const rows = await withOrg((tx) => repo.listStatus(tx));
    const integrations = rows.map((r) => ({ ...r, configured: isConfigured(r.provider, r) }));
    res.json({ integrations });
  } catch (err) {
    next(err);
  }
}

const accountsSchema = z.object({ business_id: z.string().uuid() });

/**
 * List the client accounts under the business's Google manager account, so the
 * operator can pick the right Customer ID. Uses the already-stored project creds
 * + refresh token; the manager id comes from config_json.login_customer_id
 * (falling back to the saved customer id if no manager is set).
 */
export async function googleAccounts(req, res, next) {
  try {
    const { business_id } = accountsSchema.parse(req.query);
    const accounts = await withOrg(async (tx) => {
      const integration = await repo.getByBusinessProvider(tx, business_id, "google");
      if (!integration || !integration.refresh_token_enc) {
        const err = new Error("Google is not connected for this business yet");
        err.status = 400;
        throw err;
      }
      const args = googleCallArgs(integration, decrypt);
      return listClientAccounts({
        refreshToken:   args.refreshToken,
        clientId:       args.clientId,
        clientSecret:   args.clientSecret,
        developerToken: args.developerToken,
        managerId:      args.loginCustomerId || args.customerId,
      });
    });
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
}

export async function save(req, res, next) {
  try {
    const input = saveSchema.parse(req.body);
    const provider = input.provider;

    const saved = await withOrg(async (tx) => {
      const existing = await repo.getByBusinessProvider(tx, input.business_id, provider);
      const mergedConfig = mergeProviderConfig(provider, existing?.config_json || {}, input, encrypt);

      const hasAccountId = !!(input.external_account_id || existing?.external_account_id);
      const storedTokenEnc = provider === "meta" ? existing?.access_token_enc : existing?.refresh_token_enc;
      const newToken = provider === "meta" ? input.access_token : input.refresh_token;
      const hasTokenAfter = !!(newToken || storedTokenEnc);

      const missing = requiredMissing(provider, mergedConfig, { hasAccountId, hasTokenAfter });
      if (missing.length) {
        const err = new Error(`Missing required field(s): ${missing.join(", ")}`);
        err.status = 400;
        throw err;
      }

      return repo.upsert(tx, {
        businessId: input.business_id,
        provider,
        externalAccountId: input.external_account_id,
        accountName: input.account_name || null,
        accessTokenEnc: input.access_token ? encrypt(input.access_token) : null,
        refreshTokenEnc: input.refresh_token ? encrypt(input.refresh_token) : null,
        configJson: mergedConfig,
      });
    });

    res.status(201).json({ integration: saved });
  } catch (err) {
    next(err);
  }
}

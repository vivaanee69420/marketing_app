import { z } from "zod";
import { withOrg } from "../config/db.js";
import { encrypt } from "../utils/crypto.js";
import * as repo from "../repositories/integrationRepository.js";

// Manual credential entry (no OAuth in this slice).
// Meta:   account id (act_<id>) + access token.
// Google: customer id + OAuth refresh token (app-level dev token/client in env).
const saveSchema = z.object({
  business_id: z.string().uuid(),
  provider: z.enum(["meta", "google"]),
  external_account_id: z.string().min(1, "account/customer id is required"),
  account_name: z.string().max(200).optional(),
  access_token: z.string().min(1).optional(),
  refresh_token: z.string().min(1).optional(),
}).refine(
  (v) => (v.provider === "meta" ? !!v.access_token : !!v.refresh_token),
  { message: "meta requires access_token; google requires refresh_token" }
);

export async function list(_req, res, next) {
  try {
    const integrations = await withOrg((tx) => repo.listStatus(tx));
    res.json({ integrations });
  } catch (err) {
    next(err);
  }
}

export async function save(req, res, next) {
  try {
    const input = saveSchema.parse(req.body);
    const saved = await withOrg((tx) =>
      repo.upsert(tx, {
        businessId: input.business_id,
        provider: input.provider,
        externalAccountId: input.external_account_id,
        accountName: input.account_name || null,
        accessTokenEnc: encrypt(input.access_token),
        refreshTokenEnc: encrypt(input.refresh_token),
      })
    );
    res.status(201).json({ integration: saved });
  } catch (err) {
    next(err);
  }
}

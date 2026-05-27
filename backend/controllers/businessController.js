import { z } from "zod";
import { withOrg } from "../config/db.js";
import * as repo from "../repositories/businessRepository.js";

const idSchema = z.string().uuid();

export async function list(_req, res, next) {
  try {
    const businesses = await withOrg((tx) => repo.listBusinesses(tx));
    res.json({ businesses });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const id = idSchema.parse(req.params.id);
    const business = await withOrg((tx) => repo.getBusiness(tx, id));
    if (!business) {
      const e = new Error("business_not_found");
      e.status = 404;
      throw e;
    }
    res.json({ business });
  } catch (err) {
    next(err);
  }
}

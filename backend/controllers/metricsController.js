import { z } from "zod";
import { withOrg } from "../config/db.js";
import * as repo from "../repositories/metricsRepository.js";

const businessQuery = z.object({ business_id: z.string().uuid().optional() });

export async function summary(req, res, next) {
  try {
    const { business_id } = businessQuery.parse(req.query);
    const data = await withOrg((tx) => repo.summary(tx, { businessId: business_id }));
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function byBusiness(_req, res, next) {
  try {
    const businesses = await withOrg((tx) => repo.byBusiness(tx));
    res.json({ businesses });
  } catch (err) {
    next(err);
  }
}

export async function trend(_req, res, next) {
  try {
    const points = await withOrg((tx) => repo.trend(tx, { months: 6 }));
    res.json({ trend: points });
  } catch (err) {
    next(err);
  }
}

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./config/db.js";
import { requireAuth, requireOrg } from "./middleware/authMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import syncRoutes from "./routes/syncRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// credentials:true is required for the browser to send/receive the httpOnly
// session cookie cross-origin (SPA on :5173 → API on :4000). With credentials,
// the allowed origin must be explicit, never "*".
app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());

// Liveness — process is up.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "marketing-app-api" });
});

// Readiness — DB reachable.
app.get("/health/db", async (_req, res) => {
  try {
    const info = await testConnection();
    res.json({ status: "ok", db: "connected", time: info.now, role: info.role });
  } catch (err) {
    res.status(503).json({ status: "error", db: "unreachable", message: err.message });
  }
});

// Auth (Supabase, validated server-side)
app.use("/api/auth", authRoutes);

// Domain routes. requireAuth validates the Supabase JWT (cookie); requireOrg
// resolves the tenant from the user's membership and scopes every withOrg call
// for the request. No endpoint serves data without an authenticated org.
app.use("/api/businesses", requireAuth, requireOrg, businessRoutes);
app.use("/api/integrations", requireAuth, requireOrg, integrationRoutes);
app.use("/api/sync", requireAuth, requireOrg, syncRoutes);
app.use("/api/metrics", requireAuth, requireOrg, metricsRoutes);

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`API listening on http://localhost:${PORT}`);
  try {
    const info = await testConnection();
    console.log(`✅ Connected to Supabase Database (role: ${info.role})`);
  } catch (err) {
    console.error("❌ DB connection failed on startup:", err.message);
  }
});


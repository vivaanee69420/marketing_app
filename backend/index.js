import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import orgSettingsRoutes from "./routes/orgSettingsRoutes.js";
import syncRoutes from "./routes/syncRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:5173" }));
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

// Domain routes. Auth deferred for this slice — org resolved from APP_ORG_ID
// via withOrg. Add requireAuth + per-user org resolution when auth lands.
app.use("/api/businesses", businessRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/org-settings", orgSettingsRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/metrics", metricsRoutes);

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


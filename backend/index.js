import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./config/db.js";
import { requireAuth, requireOrg, requireSuperadmin } from "./middleware/authMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import syncRoutes from "./routes/syncRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS. WEB_ORIGIN controls which browser origins may call the API:
//   - unset or "*"          → allow ALL origins (origin reflected back)
//   - comma-separated list  → allow exactly those origins
// credentials:true lets the browser send/receive the httpOnly session cookie
// cross-origin. With credentials the response header must echo the specific
// request origin, never the literal "*", so for allow-all we use `origin:true`
// (cors echoes the caller's Origin); for a list we pass the array straight in.
const corsOrigins = (process.env.WEB_ORIGIN || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const corsAllowAll = corsOrigins.length === 0 || corsOrigins.includes("*");
app.use(cors({
  origin: corsAllowAll ? true : corsOrigins,
  credentials: true,
}));
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

// Superadmin-only user moderation (approve/reject signups).
app.use("/api/admin", requireAuth, requireSuperadmin, adminRoutes);

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


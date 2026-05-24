import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import authRoutes from "./routes/auth";
import clientRoutes from "./routes/clients";
import senutoRoutes from "./routes/senuto";
import gscRoutes from "./routes/gsc";
import aiMonitorRoutes from "./routes/ai-monitor";
import reportRoutes from "./routes/reports";
import linkRoutes from "./routes/links";
import noteRoutes from "./routes/notes";
import settingsRoutes from "./routes/settings";
import blogRoutes from "./routes/blog";
import optimizationRoutes from "./routes/optimization";
import clientPortalRoutes from "./routes/client-portal";
import clientAccountRoutes from "./routes/client-accounts";
import publicRoutes from "./routes/public";
import teamRoutes from "./routes/team";
import monitoringRoutes from "./routes/monitoring";
import auditRoutes from "./routes/audit";
import commentsRoutes from "./routes/comments";
import goalsRoutes from "./routes/goals";
import importsRoutes from "./routes/imports";
import webhooksRoutes from "./routes/webhooks";

// Start workers
import "./jobs/senuto-sync";
import "./jobs/gsc-sync";
import "./jobs/pdf";
import "./jobs/scheduler";
import "./jobs/uptime-monitor";
import "./jobs/visibility-alerts";
import "./jobs/auto-reports";
import "./jobs/webhook-delivery";

const app = new Hono();

app.use("*", secureHeaders());
app.use("*", cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  credentials: true,
  allowHeaders: ["Authorization", "Content-Type", "x-session-token", "x-client-token"],
}));
app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));
app.route("/public", publicRoutes);

app.route("/auth", authRoutes);
app.route("/clients", clientRoutes);
app.route("/senuto", senutoRoutes);
app.route("/gsc", gscRoutes);
app.route("/ai-monitor", aiMonitorRoutes);
app.route("/reports", reportRoutes);
app.route("/links", linkRoutes);
app.route("/notes", noteRoutes);
app.route("/settings", settingsRoutes);
app.route("/clients", blogRoutes);
app.route("/clients", optimizationRoutes);
app.route("/clients", clientAccountRoutes);
app.route("/clients", monitoringRoutes);
app.route("/clients", auditRoutes);
app.route("/clients", commentsRoutes);
app.route("/clients", goalsRoutes);
app.route("/client-portal", clientPortalRoutes);
app.route("/team", teamRoutes);
app.route("/imports", importsRoutes);
app.route("/webhooks", webhooksRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

const port = parseInt(process.env.PORT ?? "3001");

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on port ${port}`);
});

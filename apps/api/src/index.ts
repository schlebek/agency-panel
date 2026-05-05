import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import authRoutes from "./routes/auth";
import clientRoutes from "./routes/clients";
import senutoRoutes from "./routes/senuto";
import gscRoutes from "./routes/gsc";
import reportRoutes from "./routes/reports";
import linkRoutes from "./routes/links";
import noteRoutes from "./routes/notes";

// Start workers
import "./jobs/senuto-sync";
import "./jobs/gsc-sync";
import "./jobs/pdf";

const app = new Hono();

app.use("*", secureHeaders());
app.use("*", cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  credentials: true,
  allowHeaders: ["Authorization", "Content-Type", "x-session-token"],
}));
app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.route("/auth", authRoutes);
app.route("/clients", clientRoutes);
app.route("/senuto", senutoRoutes);
app.route("/gsc", gscRoutes);
app.route("/reports", reportRoutes);
app.route("/links", linkRoutes);
app.route("/notes", noteRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

const port = parseInt(process.env.PORT ?? "3001");

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on port ${port}`);
});
